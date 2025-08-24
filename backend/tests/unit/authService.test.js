/**
 * Unit Tests for Authentication Service
 * Tests all authentication-related functionality including security features
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Mock database before requiring the service
jest.mock('../../src/database/sqlite', () => ({
  get: jest.fn(),
  run: jest.fn(),
  query: jest.fn(),
}));

const { get, run, query } = require('../../src/database/sqlite');
const authService = require('../../src/services/authService');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset any static properties if needed
  });

  describe('Password Management', () => {
    test('should hash password securely', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await authService.hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
      expect(hashedPassword.startsWith('$2')).toBe(true); // bcrypt format
    });

    test('should verify password correctly', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const isValid = await authService.verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
      
      const isInvalid = await authService.verifyPassword('wrongpassword', hashedPassword);
      expect(isInvalid).toBe(false);
    });

    test('should validate password strength correctly', () => {
      // Valid passwords
      const validPasswords = [
        'TestPass123!',
        'MySecure@Pass1',
        'Complex#Password9',
      ];
      
      validPasswords.forEach(password => {
        const result = authService.validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      // Invalid passwords
      const invalidPasswords = [
        'weak',           // Too short
        'noupperlower',   // No uppercase
        'NOLOWERCASE',    // No lowercase
        'NoNumbers!',     // No numbers
        'NoSpecial123',   // No special characters
        'a'.repeat(200),  // Too long
      ];
      
      invalidPasswords.forEach(password => {
        const result = authService.validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('JWT Token Management', () => {
    test('should generate valid access tokens', () => {
      const payload = {
        userId: 1,
        companyId: 1,
        role: 'admin',
      };
      
      const token = authService.generateAccessToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify token can be decoded
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.companyId).toBe(payload.companyId);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.iss).toBe('sprinkler-repair-saas');
    });

    test('should generate unique refresh tokens', async () => {
      run.mockResolvedValue({ lastID: 1 });
      
      const token1 = await authService.generateRefreshToken(1);
      const token2 = await authService.generateRefreshToken(1);
      
      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(typeof token1).toBe('string');
      expect(token1.length).toBeGreaterThan(50);
    });

    test('should verify refresh tokens correctly', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        company_id: 1,
      };
      
      get.mockResolvedValue({
        ...mockUser,
        expires_at: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
        revoked_at: null,
      });
      
      const isValid = await authService.verifyRefreshToken('valid-token');
      
      expect(isValid).toBeDefined();
      expect(isValid.id).toBe(mockUser.id);
      expect(get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT rt.*, u.id as user_id'),
        expect.arrayContaining([expect.any(String)])
      );
    });

    test('should reject expired refresh tokens', async () => {
      get.mockResolvedValue({
        id: 1,
        expires_at: new Date(Date.now() - 86400000).toISOString(), // 24 hours ago
        revoked_at: null,
      });
      
      const isValid = await authService.verifyRefreshToken('expired-token');
      expect(isValid).toBeNull();
    });

    test('should reject revoked refresh tokens', async () => {
      get.mockResolvedValue({
        id: 1,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        revoked_at: new Date().toISOString(),
      });
      
      const isValid = await authService.verifyRefreshToken('revoked-token');
      expect(isValid).toBeNull();
    });
  });

  describe('Account Security', () => {
    test('should check user lock status correctly', async () => {
      // User not locked
      get.mockResolvedValueOnce({
        login_attempts: 3,
        locked_until: null,
      });
      
      let isLocked = await authService.isUserLocked(1);
      expect(isLocked).toBe(false);
      
      // User locked (future timestamp)
      get.mockResolvedValueOnce({
        login_attempts: 5,
        locked_until: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      });
      
      isLocked = await authService.isUserLocked(1);
      expect(isLocked).toBe(true);
      
      // User lock expired
      get.mockResolvedValueOnce({
        login_attempts: 5,
        locked_until: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      });
      
      isLocked = await authService.isUserLocked(1);
      expect(isLocked).toBe(false);
    });

    test('should record failed login attempts', async () => {
      get.mockResolvedValue({
        login_attempts: 3,
        locked_until: null,
      });
      run.mockResolvedValue({});
      
      await authService.recordFailedAttempt(1);
      
      expect(run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET login_attempts'),
        expect.arrayContaining([4, 1])
      );
    });

    test('should lock account after max attempts', async () => {
      get.mockResolvedValue({
        login_attempts: 4, // One before max
        locked_until: null,
      });
      run.mockResolvedValue({});
      
      await authService.recordFailedAttempt(1);
      
      expect(run).toHaveBeenCalledWith(
        expect.stringContaining('locked_until'),
        expect.arrayContaining([5, expect.any(String), 1])
      );
    });

    test('should reset failed attempts on successful login', async () => {
      run.mockResolvedValue({});
      
      await authService.resetFailedAttempts(1);
      
      expect(run).toHaveBeenCalledWith(
        'UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?',
        [1]
      );
    });
  });

  describe('Session Management', () => {
    test('should create user sessions', async () => {
      run.mockResolvedValue({ lastID: 1 });
      
      const sessionData = {
        userAgent: 'Mozilla/5.0...',
        ipAddress: '127.0.0.1',
        rememberMe: false,
      };
      
      const sessionToken = await authService.createSession(1, sessionData);
      
      expect(sessionToken).toBeDefined();
      expect(typeof sessionToken).toBe('string');
      expect(run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_sessions'),
        expect.arrayContaining([1, sessionToken, expect.any(String), '127.0.0.1', 'Mozilla/5.0...'])
      );
    });

    test('should update session activity', async () => {
      get.mockResolvedValue({
        id: 1,
        user_id: 1,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      });
      run.mockResolvedValue({});
      
      await authService.updateSessionActivity('session-token');
      
      expect(run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_sessions SET last_activity'),
        expect.arrayContaining([expect.any(String), 'session-token'])
      );
    });

    test('should end sessions', async () => {
      run.mockResolvedValue({});
      
      await authService.endSession('session-token');
      
      expect(run).toHaveBeenCalledWith(
        'DELETE FROM user_sessions WHERE session_token = ?',
        ['session-token']
      );
    });

    test('should get user sessions', async () => {
      const mockSessions = [
        {
          session_token: 'token1',
          device_info: 'Chrome',
          last_activity: new Date().toISOString(),
        },
        {
          session_token: 'token2',
          device_info: 'Firefox',
          last_activity: new Date().toISOString(),
        },
      ];
      
      query.mockResolvedValue(mockSessions);
      
      const sessions = await authService.getUserSessions(1);
      
      expect(sessions).toHaveLength(2);
      expect(sessions[0]).toHaveProperty('session_token');
      expect(sessions[0]).toHaveProperty('device_info');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM user_sessions'),
        [1]
      );
    });
  });

  describe('Email Verification', () => {
    test('should generate email verification tokens', async () => {
      const token = await authService.generateEmailVerificationToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(30);
    });

    test('should verify email tokens', async () => {
      get.mockResolvedValue({
        id: 1,
        verification_token: 'valid-token',
        email_verification_expires: new Date(Date.now() + 86400000).toISOString(),
      });
      run.mockResolvedValue({});
      
      const success = await authService.verifyEmail('valid-token');
      
      expect(success).toBe(true);
      expect(run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET email_verified = 1'),
        [1]
      );
    });

    test('should reject expired verification tokens', async () => {
      get.mockResolvedValue({
        id: 1,
        verification_token: 'expired-token',
        email_verification_expires: new Date(Date.now() - 86400000).toISOString(),
      });
      
      const success = await authService.verifyEmail('expired-token');
      expect(success).toBe(false);
    });
  });

  describe('Password Reset', () => {
    test('should generate password reset tokens', async () => {
      run.mockResolvedValue({});
      
      const token = await authService.generatePasswordResetToken(1);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET password_reset_token'),
        expect.arrayContaining([token, expect.any(String), 1])
      );
    });

    test('should reset passwords with valid tokens', async () => {
      get.mockResolvedValue({
        id: 1,
        password_reset_token: 'valid-token',
        password_reset_expires: new Date(Date.now() + 3600000).toISOString(),
      });
      run.mockResolvedValue({});
      
      const success = await authService.resetPassword('valid-token', 'NewPassword123!');
      
      expect(success).toBe(true);
      expect(run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET password_hash'),
        expect.arrayContaining([expect.any(String), null, null, 1])
      );
    });

    test('should reject expired password reset tokens', async () => {
      get.mockResolvedValue({
        id: 1,
        password_reset_token: 'expired-token',
        password_reset_expires: new Date(Date.now() - 3600000).toISOString(),
      });
      
      const success = await authService.resetPassword('expired-token', 'NewPassword123!');
      expect(success).toBe(false);
    });
  });

  describe('Token Refresh', () => {
    test('should refresh access tokens with valid refresh token', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'admin',
        company_id: 1,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        revoked_at: null,
      };
      
      get.mockResolvedValue(mockUser);
      run.mockResolvedValue({ lastID: 2 });
      
      const result = await authService.refreshAccessToken('valid-refresh-token');
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });

    test('should revoke refresh tokens', async () => {
      run.mockResolvedValue({});
      
      await authService.revokeRefreshToken('token-to-revoke');
      
      expect(run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE refresh_tokens SET revoked_at'),
        expect.arrayContaining([expect.any(String), 'token-to-revoke'])
      );
    });

    test('should revoke all user refresh tokens', async () => {
      run.mockResolvedValue({});
      
      await authService.revokeAllUserRefreshTokens(1);
      
      expect(run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE refresh_tokens SET revoked_at'),
        expect.arrayContaining([expect.any(String), 1])
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      get.mockRejectedValue(new Error('Database connection failed'));
      
      await expect(authService.isUserLocked(1)).rejects.toThrow('Database connection failed');
    });

    test('should handle null/undefined inputs', async () => {
      expect(() => authService.validatePassword(null)).not.toThrow();
      expect(() => authService.validatePassword(undefined)).not.toThrow();
      
      const result = authService.validatePassword(null);
      expect(result.isValid).toBe(false);
    });

    test('should handle concurrent session creation', async () => {
      run.mockResolvedValue({ lastID: 1 });
      
      const promises = Array(10).fill().map((_, i) => 
        authService.createSession(1, { userAgent: `Browser-${i}` })
      );
      
      const tokens = await Promise.all(promises);
      
      // All tokens should be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);
    });
  });
});