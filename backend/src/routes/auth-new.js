const express = require('express');
const {
  authenticateToken,
  requireAuth,
  requireEmailVerification,
  rateLimitSensitive,
} = require('../middleware/auth');
const authService = require('../services/authService');
const emailService = require('../services/emailService');
const { get, run, all } = require('../database');

const router = express.Router();

// Enhanced login with session management and security features
router.post('/login', rateLimitSensitive(), async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user by email
    const user = await get(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase().trim()],
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is locked
    if (await authService.isUserLocked(user.id)) {
      return res.status(423).json({
        error: 'Account locked due to failed login attempts. Please try again later or reset your password.',
      });
    }

    // Verify password
    const isValidPassword = await authService.verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      await authService.recordFailedLogin(user.id);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed login attempts on successful login
    await authService.resetFailedLogins(user.id);

    // Generate tokens
    const accessToken = authService.generateAccessToken({
      userId: user.id,
      companyId: user.company_id,
      role: user.role,
    });
    const refreshToken = await authService.generateRefreshToken(user.id);

    // Create session
    const sessionToken = await authService.createSession(user.id, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      rememberMe,
    });

    // Update last login
    await run(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id],
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company_id: user.company_id,
        email_verified: user.email_verified,
      },
      tokens: {
        accessToken,
        refreshToken,
        sessionToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register with email verification
router.post('/register', rateLimitSensitive(), async (req, res) => {
  try {
    const {
      email, password, name, companyName,
    } = req.body;

    // Validate input
    if (!email || !password || !name || !companyName) {
      return res.status(400).json({
        error: 'Email, password, name, and company name are required',
      });
    }

    // Validate password strength
    const passwordValidation = authService.validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        requirements: passwordValidation.errors,
      });
    }

    // Check if user already exists
    const existingUser = await get(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase().trim()],
    );

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Check if company already exists
    let company = await get(
      'SELECT id FROM companies WHERE name = ?',
      [companyName.trim()],
    );

    // Create company if it doesn't exist
    if (!company) {
      const result = await run(
        'INSERT INTO companies (name, created_at) VALUES (?, CURRENT_TIMESTAMP)',
        [companyName.trim()],
      );
      company = { id: result.lastID };
    }

    // Hash password
    const passwordHash = await authService.hashPassword(password);

    // Create user
    const userResult = await run(
      `INSERT INTO users (
        email, password_hash, name, role, company_id, 
        email_verified, verification_token, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        email.toLowerCase().trim(),
        passwordHash,
        name.trim(),
        'user',
        company.id,
        false,
        await authService.generateEmailVerificationToken(),
      ],
    );

    const newUser = await get(
      'SELECT id, email, name, role, company_id, verification_token FROM users WHERE id = ?',
      [userResult.lastID],
    );

    // Send verification email
    try {
      await emailService.sendVerificationEmail(newUser.email, newUser.verification_token, newUser.name);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue registration but log the error
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        company_id: newUser.company_id,
        email_verified: false,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Email verification
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const success = await authService.verifyEmail(token);

    if (!success) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    if (!result) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    res.json({
      success: true,
      tokens: result,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Password reset request
router.post('/forgot-password', rateLimitSensitive(), async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await get(
      'SELECT id, email, name FROM users WHERE email = ?',
      [email.toLowerCase().trim()],
    );

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    const resetToken = await authService.generatePasswordResetToken(user.id);

    try {
      await emailService.sendPasswordResetEmail(user.email, resetToken, user.name);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return res.status(500).json({ error: 'Failed to send password reset email' });
    }

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Password reset
router.post('/reset-password', rateLimitSensitive(), async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    // Validate password strength
    const passwordValidation = authService.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        requirements: passwordValidation.errors,
      });
    }

    const success = await authService.resetPassword(token, newPassword);

    if (!success) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const { sessionToken } = req;

    // Revoke refresh token if provided
    if (refreshToken) {
      await authService.revokeRefreshToken(refreshToken);
    }

    // End session if session token provided
    if (sessionToken) {
      await authService.endSession(sessionToken);
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, requireAuth, async (req, res) => {
  try {
    const user = await get(
      `SELECT u.id, u.email, u.name, u.role, u.email_verified, u.last_login,
              c.name as company_name
       FROM users u
       JOIN companies c ON u.company_id = c.id
       WHERE u.id = ?`,
      [req.userId],
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        email_verified: user.email_verified,
        last_login: user.last_login,
        company_name: user.company_name,
      },
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update profile
router.put('/profile', authenticateToken, requireAuth, requireEmailVerification, async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name && !email) {
      return res.status(400).json({ error: 'Name or email is required' });
    }

    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name.trim());
    }

    if (email) {
      // Check if email is already taken
      const existingUser = await get(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email.toLowerCase().trim(), req.userId],
      );

      if (existingUser) {
        return res.status(409).json({ error: 'Email already taken' });
      }

      updates.push('email = ?', 'email_verified = ?');
      values.push(email.toLowerCase().trim(), false);
    }

    values.push(req.userId);

    await run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values,
    );

    // If email was changed, send new verification email
    if (email) {
      const verificationToken = await authService.generateEmailVerificationToken();
      await run(
        'UPDATE users SET verification_token = ? WHERE id = ?',
        [verificationToken, req.userId],
      );

      try {
        await emailService.sendVerificationEmail(email, verificationToken, name || req.user.name);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
      }
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      emailVerificationRequired: !!email,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.put('/change-password', authenticateToken, requireAuth, requireEmailVerification, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Get current user
    const user = await get(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.userId],
    );

    // Verify current password
    const isValidPassword = await authService.verifyPassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Validate new password strength
    const passwordValidation = authService.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'New password does not meet requirements',
        requirements: passwordValidation.errors,
      });
    }

    // Hash and update password
    const newPasswordHash = await authService.hashPassword(newPassword);
    await run(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, req.userId],
    );

    // Revoke all refresh tokens for security
    await authService.revokeAllUserRefreshTokens(req.userId);

    res.json({
      success: true,
      message: 'Password changed successfully. Please log in again.',
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user sessions
router.get('/sessions', authenticateToken, requireAuth, async (req, res) => {
  try {
    const sessions = await authService.getUserSessions(req.userId);
    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Sessions fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revoke session
router.delete('/sessions/:sessionToken', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { sessionToken } = req.params;
    await authService.endSession(sessionToken);
    res.json({ success: true, message: 'Session revoked successfully' });
  } catch (error) {
    console.error('Session revoke error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend verification email
router.post('/resend-verification', authenticateToken, requireAuth, rateLimitSensitive(), async (req, res) => {
  try {
    if (req.user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    const verificationToken = await authService.generateEmailVerificationToken();
    await run(
      'UPDATE users SET verification_token = ? WHERE id = ?',
      [verificationToken, req.userId],
    );

    try {
      await emailService.sendVerificationEmail(req.user.email, verificationToken, req.user.name);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    res.json({
      success: true,
      message: 'Verification email sent successfully',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
