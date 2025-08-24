const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../database/sqlite');
const emailService = require('./emailService');

class CustomerAuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'default-customer-secret';
    this.tokenExpiry = '7d'; // Customer tokens last longer
    this.magicLinkExpiry = 15; // Magic links expire in 15 minutes
  }

  /**
   * Send magic link for passwordless authentication
   * @param {string} email - Customer email
   * @param {number} companyId - Company ID to associate with
   * @returns {Promise<Object>} Result of magic link generation
   */
  async sendMagicLink(email, companyId) {
    try {
      // Check if customer user exists
      let customerUser = await db.get(`
        SELECT cu.*, c.name as client_name 
        FROM customer_users cu
        JOIN clients c ON cu.client_id = c.id
        WHERE cu.email = ? AND c.company_id = ?
      `, [email.toLowerCase(), companyId]);

      if (!customerUser) {
        // Check if there's a client with this email that can be linked
        const client = await db.get(`
          SELECT id, name FROM clients 
          WHERE (email = ? OR billing_email = ?) 
            AND company_id = ?
        `, [email.toLowerCase(), email.toLowerCase(), companyId]);

        if (!client) {
          return {
            success: false,
            message: 'No account found with this email address. Please contact your service provider.',
          };
        }

        // Auto-create customer user for existing client
        const sites = await db.query(`
          SELECT id FROM sites WHERE client_id = ?
        `, [client.id]);

        const siteIds = sites.map((site) => site.id);

        const result = await db.run(`
          INSERT INTO customer_users (email, client_id, sites, role, created_at)
          VALUES (?, ?, ?, 'customer', CURRENT_TIMESTAMP)
        `, [email.toLowerCase(), client.id, JSON.stringify(siteIds)]);

        customerUser = {
          id: result.id,
          email: email.toLowerCase(),
          client_id: client.id,
          client_name: client.name,
          sites: JSON.stringify(siteIds),
          role: 'customer',
        };
      }

      // Generate magic link token
      const magicToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + this.magicLinkExpiry * 60 * 1000);

      // Store magic link token
      await db.run(`
        UPDATE customer_users 
        SET magic_link_token = ?, magic_link_expires = ?
        WHERE id = ?
      `, [magicToken, expiresAt.toISOString(), customerUser.id]);

      // Get company details for email
      const company = await db.get(`
        SELECT name, email, phone, website
        FROM companies WHERE id = ?
      `, [companyId]);

      // Send magic link email
      const magicLink = `${process.env.CUSTOMER_PORTAL_URL || 'http://localhost:3001'}/customer/auth/verify?token=${magicToken}`;

      const emailResult = await emailService.sendMagicLinkEmail(
        email,
        magicLink,
        customerUser.client_name,
        company,
      );

      if (!emailResult.success) {
        return {
          success: false,
          message: 'Failed to send magic link email. Please try again.',
        };
      }

      return {
        success: true,
        message: 'Magic link sent! Check your email to access your customer portal.',
        expiresIn: this.magicLinkExpiry,
        customerUser: {
          id: customerUser.id,
          email: customerUser.email,
          client_name: customerUser.client_name,
        },
      };
    } catch (error) {
      console.error('Magic link generation error:', error);
      return {
        success: false,
        message: 'Failed to generate magic link. Please try again.',
      };
    }
  }

  /**
   * Verify magic link token and create session
   * @param {string} token - Magic link token
   * @returns {Promise<Object>} Authentication result with JWT
   */
  async verifyMagicLink(token) {
    try {
      // Find customer user with valid token
      const customerUser = await db.get(`
        SELECT cu.*, c.name as client_name, c.company_id,
               comp.name as company_name
        FROM customer_users cu
        JOIN clients c ON cu.client_id = c.id
        JOIN companies comp ON c.company_id = comp.id
        WHERE cu.magic_link_token = ? 
          AND cu.magic_link_expires > datetime('now')
          AND cu.is_active = 1
      `, [token]);

      if (!customerUser) {
        return {
          success: false,
          message: 'Invalid or expired magic link. Please request a new one.',
        };
      }

      // Clear the magic link token (one-time use)
      await db.run(`
        UPDATE customer_users 
        SET magic_link_token = NULL, 
            magic_link_expires = NULL,
            last_login_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [customerUser.id]);

      // Create session token
      const sessionToken = crypto.randomBytes(64).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await db.run(`
        INSERT INTO customer_sessions (
          customer_user_id, session_token, expires_at, created_at
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [customerUser.id, sessionToken, expiresAt.toISOString()]);

      // Generate JWT
      const jwtPayload = {
        customerId: customerUser.id,
        clientId: customerUser.client_id,
        companyId: customerUser.company_id,
        email: customerUser.email,
        role: customerUser.role,
        type: 'customer',
      };

      const jwtToken = jwt.sign(jwtPayload, this.jwtSecret, {
        expiresIn: this.tokenExpiry,
      });

      // Get accessible sites
      const siteIds = JSON.parse(customerUser.sites || '[]');
      const sites = await db.query(`
        SELECT s.*, COALESCE(s.name, s.address) as display_name
        FROM sites s
        WHERE s.id IN (${siteIds.map(() => '?').join(',')})
        ORDER BY s.name, s.address
      `, siteIds);

      return {
        success: true,
        token: jwtToken,
        sessionToken,
        expiresAt,
        customer: {
          id: customerUser.id,
          email: customerUser.email,
          clientName: customerUser.client_name,
          companyName: customerUser.company_name,
          role: customerUser.role,
          sites,
        },
      };
    } catch (error) {
      console.error('Magic link verification error:', error);
      return {
        success: false,
        message: 'Failed to verify magic link. Please try again.',
      };
    }
  }

  /**
   * Validate customer session
   * @param {string} sessionToken - Session token to validate
   * @returns {Promise<Object>} Customer details if valid
   */
  async validateSession(sessionToken) {
    try {
      const session = await db.get(`
        SELECT cs.*, cu.email, cu.client_id, cu.role, cu.sites,
               c.name as client_name, c.company_id,
               comp.name as company_name
        FROM customer_sessions cs
        JOIN customer_users cu ON cs.customer_user_id = cu.id
        JOIN clients c ON cu.client_id = c.id
        JOIN companies comp ON c.company_id = comp.id
        WHERE cs.session_token = ? 
          AND cs.expires_at > datetime('now')
          AND cu.is_active = 1
      `, [sessionToken]);

      if (!session) {
        return { valid: false };
      }

      // Update last activity
      await db.run(`
        UPDATE customer_sessions 
        SET last_activity = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [session.id]);

      // Get accessible sites
      const siteIds = JSON.parse(session.sites || '[]');
      const sites = await db.query(`
        SELECT s.*, COALESCE(s.name, s.address) as display_name
        FROM sites s
        WHERE s.id IN (${siteIds.map(() => '?').join(',')})
        ORDER BY s.name, s.address
      `, siteIds);

      return {
        valid: true,
        customer: {
          id: session.customer_user_id,
          email: session.email,
          clientId: session.client_id,
          clientName: session.client_name,
          companyId: session.company_id,
          companyName: session.company_name,
          role: session.role,
          sites,
        },
      };
    } catch (error) {
      console.error('Session validation error:', error);
      return { valid: false };
    }
  }

  /**
   * Logout customer (invalidate session)
   * @param {string} sessionToken - Session token to invalidate
   * @returns {Promise<boolean>} Success status
   */
  async logout(sessionToken) {
    try {
      await db.run(`
        DELETE FROM customer_sessions
        WHERE session_token = ?
      `, [sessionToken]);

      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  /**
   * Clean up expired sessions and magic link tokens
   */
  async cleanupExpired() {
    try {
      // Remove expired sessions
      await db.run(`
        DELETE FROM customer_sessions
        WHERE expires_at < datetime('now')
      `);

      // Clear expired magic link tokens
      await db.run(`
        UPDATE customer_users 
        SET magic_link_token = NULL, magic_link_expires = NULL
        WHERE magic_link_expires < datetime('now')
      `);

      console.log('Cleaned up expired customer sessions and tokens');
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  /**
   * Get customer portal settings for a company
   * @param {number} companyId - Company ID
   * @returns {Promise<Object>} Portal settings
   */
  async getPortalSettings(companyId) {
    try {
      const settings = await db.get(`
        SELECT * FROM customer_portal_settings
        WHERE company_id = ?
      `, [companyId]);

      if (!settings) {
        // Return default settings if none exist
        return {
          is_enabled: true,
          allow_self_scheduling: true,
          allow_service_requests: true,
          allow_feedback: true,
          require_approval_for_scheduling: false,
          booking_advance_days: 30,
          booking_notice_hours: 24,
          business_hours_start: '08:00:00',
          business_hours_end: '17:00:00',
          business_days: ['1', '2', '3', '4', '5'],
          welcome_message: 'Welcome to your customer portal!',
          theme_color: '#2563eb',
        };
      }

      // Parse JSON fields
      if (settings.business_days) {
        settings.business_days = JSON.parse(settings.business_days);
      }

      return settings;
    } catch (error) {
      console.error('Get portal settings error:', error);
      throw error;
    }
  }

  /**
   * Update customer portal settings
   * @param {number} companyId - Company ID
   * @param {Object} settings - Settings to update
   * @returns {Promise<Object>} Updated settings
   */
  async updatePortalSettings(companyId, settings) {
    try {
      const fields = [];
      const values = [];

      const allowedFields = [
        'is_enabled', 'allow_self_scheduling', 'allow_service_requests',
        'allow_feedback', 'require_approval_for_scheduling', 'booking_advance_days',
        'booking_notice_hours', 'business_hours_start', 'business_hours_end',
        'business_days', 'welcome_message', 'terms_of_service_url',
        'privacy_policy_url', 'support_email', 'support_phone',
        'theme_color', 'logo_url',
      ];

      for (const [key, value] of Object.entries(settings)) {
        if (allowedFields.includes(key)) {
          fields.push(`${key} = ?`);
          if (key === 'business_days' && Array.isArray(value)) {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
        }
      }

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(companyId);

      await db.run(`
        UPDATE customer_portal_settings 
        SET ${fields.join(', ')}
        WHERE company_id = ?
      `, values);

      // Return updated settings
      return this.getPortalSettings(companyId);
    } catch (error) {
      console.error('Update portal settings error:', error);
      throw error;
    }
  }
}

// Run cleanup every hour
setInterval(() => {
  const customerAuth = new CustomerAuthService();
  customerAuth.cleanupExpired();
}, 60 * 60 * 1000);

module.exports = new CustomerAuthService();
