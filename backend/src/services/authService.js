const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { get, run, query } = require('../database/sqlite');

class AuthService {
  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
    this.REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
    this.MAX_LOGIN_ATTEMPTS = 5;
    this.LOCK_TIME = 2 * 60 * 60 * 1000; // 2 hours
    this.PASSWORD_RESET_EXPIRES = 24 * 60 * 60 * 1000; // 24 hours
    this.EMAIL_VERIFICATION_EXPIRES = 7 * 24 * 60 * 60 * 1000; // 7 days
  }

  // Generate JWT token
  generateAccessToken(payload) {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'sprinkler-repair-saas',
    });
  }

  // Generate refresh token
  async generateRefreshToken(userId, ipAddress) {
    const token = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + this.parseTimeToMs(this.REFRESH_TOKEN_EXPIRES_IN));

    await run(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) 
       VALUES (?, ?, ?)`,
      [userId, tokenHash, expiresAt.toISOString()],
    );

    return token;
  }

  // Verify refresh token
  async verifyRefreshToken(token, ipAddress) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const refreshToken = await get(
      `SELECT rt.*, u.id as user_id, u.email, u.name, u.role, u.company_id 
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token_hash = ? AND rt.expires_at > datetime('now') AND rt.revoked_at IS NULL`,
      [tokenHash],
    );

    if (!refreshToken) {
      throw new Error('Invalid refresh token');
    }

    return refreshToken;
  }

  // Revoke refresh token
  async revokeRefreshToken(token, ipAddress, replacedByToken = null) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await run(
      `UPDATE refresh_tokens 
       SET revoked_at = datetime('now')
       WHERE token_hash = ?`,
      [tokenHash],
    );
  }

  // Revoke all refresh tokens for a user
  async revokeAllRefreshTokens(userId, ipAddress) {
    await run(
      `UPDATE refresh_tokens 
       SET revoked_at = datetime('now')
       WHERE user_id = ? AND revoked_at IS NULL`,
      [userId],
    );
  }

  // Clean up expired tokens
  async cleanupExpiredTokens() {
    await run(
      `DELETE FROM refresh_tokens 
       WHERE expires_at < datetime('now') OR revoked_at < datetime('now', '-30 days')`,
    );

    await run(
      `DELETE FROM user_sessions 
       WHERE expires_at < datetime('now')`,
    );
  }

  // Create user session
  async createSession(userId, sessionOptions = {}) {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.parseTimeToMs(this.REFRESH_TOKEN_EXPIRES_IN));

    await run(
      `INSERT INTO user_sessions (user_id, session_token, expires_at)
       VALUES (?, ?, ?)`,
      [userId, sessionToken, expiresAt.toISOString()],
    );
    
    return sessionToken;
  }

  // Update session activity
  async updateSessionActivity(sessionToken) {
    await run(
      `UPDATE user_sessions 
       SET last_activity = datetime('now')
       WHERE session_token = ?`,
      [sessionToken],
    );
  }

  // Get active sessions for user
  async getActiveSessions(userId) {
    return await query(
      `SELECT session_token, last_activity, created_at
       FROM user_sessions 
       WHERE user_id = ? AND expires_at > datetime('now')
       ORDER BY last_activity DESC`,
      [userId],
    );
  }

  // Terminate session
  async terminateSession(sessionToken) {
    await run(
      'DELETE FROM user_sessions WHERE session_token = ?',
      [sessionToken],
    );
  }

  // Terminate all sessions except current
  async terminateOtherSessions(userId, currentSessionToken) {
    await run(
      `DELETE FROM user_sessions 
       WHERE user_id = ? AND session_token != ?`,
      [userId, currentSessionToken],
    );
  }

  // Check if user is locked due to failed attempts
  async isUserLocked(userId) {
    const user = await get(
      'SELECT login_attempts, locked_until FROM users WHERE id = ?',
      [userId],
    );

    if (!user) return false;

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return true;
    }

    // Reset lock if time has passed
    if (user.locked_until && new Date(user.locked_until) <= new Date()) {
      await run(
        'UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?',
        [userId],
      );
    }

    return false;
  }

  // Record failed login attempt
  async recordFailedAttempt(userId) {
    const user = await get(
      'SELECT login_attempts FROM users WHERE id = ?',
      [userId],
    );

    const attempts = (user?.login_attempts || 0) + 1;
    const lockUntil = attempts >= this.MAX_LOGIN_ATTEMPTS
      ? new Date(Date.now() + this.LOCK_TIME).toISOString()
      : null;

    await run(
      'UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?',
      [attempts, lockUntil, userId],
    );

    return { attempts, locked: attempts >= this.MAX_LOGIN_ATTEMPTS };
  }

  // Reset failed attempts on successful login
  async resetFailedAttempts(userId) {
    await run(
      'UPDATE users SET login_attempts = 0, locked_until = NULL, last_login_at = datetime("now") WHERE id = ?',
      [userId],
    );
  }

  // Generate email verification token
  async generateEmailVerificationToken(userId, email) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + this.EMAIL_VERIFICATION_EXPIRES).toISOString();

    await run(
      'UPDATE users SET email_verification_token = ?, email_verification_expires = ? WHERE id = ?',
      [token, expires, userId],
    );

    return token;
  }

  // Verify email with token
  async verifyEmail(token) {
    const user = await get(
      `SELECT id FROM users 
       WHERE email_verification_token = ? 
       AND email_verification_expires > datetime('now')`,
      [token],
    );

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    await run(
      `UPDATE users 
       SET email_verified = 1, email_verification_token = NULL, email_verification_expires = NULL 
       WHERE id = ?`,
      [user.id],
    );

    return user;
  }

  // Generate password reset token
  async generatePasswordResetToken(email) {
    const user = await get('SELECT id FROM users WHERE email = ?', [email]);

    if (!user) {
      // Don't reveal if email exists - just return success
      return { success: true };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + this.PASSWORD_RESET_EXPIRES).toISOString();

    await run(
      'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
      [token, expires, user.id],
    );

    return { success: true, token, userId: user.id };
  }

  // Verify password reset token
  async verifyPasswordResetToken(token) {
    const user = await get(
      `SELECT id, email FROM users 
       WHERE password_reset_token = ? 
       AND password_reset_expires > datetime('now')`,
      [token],
    );

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    return user;
  }

  // Reset password with token
  async resetPassword(token, newPassword) {
    const user = await this.verifyPasswordResetToken(token);
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await run(
      `UPDATE users 
       SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL,
           login_attempts = 0, locked_until = NULL
       WHERE id = ?`,
      [passwordHash, user.id],
    );

    // Revoke all refresh tokens for security
    await this.revokeAllRefreshTokens(user.id, 'password-reset');

    return user;
  }

  // Hash password
  async hashPassword(password) {
    return await bcrypt.hash(password, 12);
  }

  // Verify password
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  // Parse time string to milliseconds
  parseTimeToMs(timeStr) {
    const units = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) return 15 * 60 * 1000; // default 15 minutes

    const [, amount, unit] = match;
    return parseInt(amount) * units[unit];
  }

  // Validate password strength
  validatePassword(password) {
    const errors = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

module.exports = new AuthService();
