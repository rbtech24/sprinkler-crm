const db = require('../database/sqlite');
const emailService = require('./emailService');

class CommunicationService {
  constructor() {
    this.smsEnabled = !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN;
    this.twilioClient = null;

    if (this.smsEnabled) {
      try {
        const twilio = require('twilio');
        this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      } catch (error) {
        console.warn('⚠️  Twilio not available - SMS features will be disabled');
        this.smsEnabled = false;
      }
    }
  }

  /**
   * Send automated communication based on trigger
   * @param {string} triggerType - Type of trigger (inspection_complete, etc.)
   * @param {Object} contextData - Data about the triggering event
   * @returns {Promise<Object>} Communication result
   */
  async sendAutomatedCommunication(triggerType, contextData) {
    try {
      const { company_id, client_id, site_id } = contextData;

      // Get automated communication rules for this trigger
      const rules = await db.query(`
        SELECT ac.*, ct.name as template_name, ct.template_type, 
               ct.subject, ct.content, ct.variables
        FROM automated_communications ac
        JOIN communication_templates ct ON ac.template_id = ct.id
        WHERE ac.trigger_type = ?
          AND ac.is_active = 1
          AND ct.is_active = 1
          AND ct.company_id = ?
        ORDER BY ac.created_at
      `, [triggerType, company_id]);

      if (rules.length === 0) {
        return {
          success: true,
          message: 'No automated communications configured for this trigger',
        };
      }

      const results = [];

      for (const rule of rules) {
        // Apply delay if configured
        const sendAt = new Date();
        if (rule.trigger_delay_days > 0) {
          sendAt.setDate(sendAt.getDate() + rule.trigger_delay_days);
        }

        // Get client contact information
        const client = await db.get(`
          SELECT * FROM clients WHERE id = ? AND company_id = ?
        `, [client_id, company_id]);

        if (!client) {
          continue;
        }

        // Process template with context data
        const processedTemplate = this.processTemplate(rule, contextData);

        // Send communication based on template type
        let result;
        switch (rule.template_type) {
          case 'email':
            if (client.email) {
              result = await this.sendEmail({
                to: client.email,
                subject: processedTemplate.subject,
                content: processedTemplate.content,
                client_id,
                company_id,
                template_id: rule.template_id,
                trigger_type: triggerType,
              });
            }
            break;

          case 'text':
            if (client.phone && this.smsEnabled) {
              result = await this.sendSMS({
                to: client.phone,
                message: processedTemplate.content,
                client_id,
                company_id,
                template_id: rule.template_id,
                trigger_type: triggerType,
              });
            }
            break;

          case 'follow_up':
            result = await this.scheduleFollowUp({
              client_id,
              company_id,
              template_id: rule.template_id,
              scheduled_date: sendAt.toISOString(),
              subject: processedTemplate.subject,
              content: processedTemplate.content,
            });
            break;
        }

        if (result) {
          results.push(result);
        }
      }

      return {
        success: true,
        communications_sent: results.length,
        results,
      };
    } catch (error) {
      console.error('Automated communication error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send manual email communication
   * @param {Object} emailData - Email details
   * @returns {Promise<Object>} Email result
   */
  async sendEmail(emailData) {
    try {
      const {
        to,
        subject,
        content,
        client_id,
        company_id,
        template_id,
        trigger_type = 'manual',
      } = emailData;

      // Get company details for email branding
      const company = await db.get(`
        SELECT name, email, phone FROM companies WHERE id = ?
      `, [company_id]);

      // Send email using email service
      const emailResult = await emailService.sendServiceNotification(
        to,
        '', // Client name will be filled by email service
        'custom',
        { content },
        company,
      );

      if (emailResult.success) {
        // Log communication
        const logResult = await db.run(`
          INSERT INTO communications (
            company_id, client_id, communication_type, subject, content,
            direction, status, completed_date, created_at
          ) VALUES (?, ?, 'email', ?, ?, 'outbound', 'sent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [company_id, client_id, subject, content]);

        return {
          success: true,
          communication_id: logResult.id,
          message_id: emailResult.messageId,
        };
      }

      return {
        success: false,
        error: 'Failed to send email',
      };
    } catch (error) {
      console.error('Email sending error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send SMS communication
   * @param {Object} smsData - SMS details
   * @returns {Promise<Object>} SMS result
   */
  async sendSMS(smsData) {
    if (!this.smsEnabled) {
      return {
        success: false,
        error: 'SMS service not configured',
      };
    }

    try {
      const {
        to,
        message,
        client_id,
        company_id,
        template_id,
        trigger_type = 'manual',
      } = smsData;

      // Clean phone number
      const cleanPhone = to.replace(/\D/g, '');
      const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;

      // Send SMS via Twilio
      const smsResult = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone,
      });

      // Log communication
      const logResult = await db.run(`
        INSERT INTO communications (
          company_id, client_id, communication_type, content,
          direction, status, completed_date, created_at
        ) VALUES (?, ?, 'text', ?, 'outbound', 'sent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [company_id, client_id, message]);

      return {
        success: true,
        communication_id: logResult.id,
        sms_sid: smsResult.sid,
      };
    } catch (error) {
      console.error('SMS sending error:', error);

      // Log failed communication
      await db.run(`
        INSERT INTO communications (
          company_id, client_id, communication_type, content,
          direction, status, created_at
        ) VALUES (?, ?, 'text', ?, 'outbound', 'failed', CURRENT_TIMESTAMP)
      `, [smsData.company_id, smsData.client_id, smsData.message]);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Schedule follow-up communication
   * @param {Object} followUpData - Follow-up details
   * @returns {Promise<Object>} Scheduling result
   */
  async scheduleFollowUp(followUpData) {
    try {
      const {
        client_id,
        company_id,
        scheduled_date,
        subject,
        content,
        communication_type = 'follow_up',
      } = followUpData;

      const result = await db.run(`
        INSERT INTO communications (
          company_id, client_id, communication_type, subject, content,
          direction, status, scheduled_date, created_at
        ) VALUES (?, ?, ?, ?, ?, 'outbound', 'scheduled', ?, CURRENT_TIMESTAMP)
      `, [company_id, client_id, communication_type, subject, content, scheduled_date]);

      return {
        success: true,
        communication_id: result.id,
        scheduled_for: scheduled_date,
      };
    } catch (error) {
      console.error('Follow-up scheduling error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process scheduled communications
   * @returns {Promise<Object>} Processing result
   */
  async processScheduledCommunications() {
    try {
      // Get communications scheduled for now or earlier
      const scheduledComms = await db.query(`
        SELECT c.*, cl.name as client_name, cl.email, cl.phone,
               comp.name as company_name
        FROM communications c
        JOIN clients cl ON c.client_id = cl.id
        JOIN companies comp ON c.company_id = comp.id
        WHERE c.status = 'scheduled'
          AND c.scheduled_date <= datetime('now')
        ORDER BY c.scheduled_date
        LIMIT 50
      `);

      const results = [];

      for (const comm of scheduledComms) {
        let result;

        switch (comm.communication_type) {
          case 'email':
            if (comm.email) {
              result = await this.sendEmail({
                to: comm.email,
                subject: comm.subject,
                content: comm.content,
                client_id: comm.client_id,
                company_id: comm.company_id,
              });
            }
            break;

          case 'text':
            if (comm.phone) {
              result = await this.sendSMS({
                to: comm.phone,
                message: comm.content,
                client_id: comm.client_id,
                company_id: comm.company_id,
              });
            }
            break;

          case 'follow_up':
            // Mark as ready for follow-up action
            await db.run(`
              UPDATE communications 
              SET status = 'ready_for_action', follow_up_date = datetime('now')
              WHERE id = ?
            `, [comm.id]);
            result = { success: true };
            break;
        }

        if (result && result.success) {
          await db.run(`
            UPDATE communications 
            SET status = 'completed', completed_date = datetime('now')
            WHERE id = ?
          `, [comm.id]);

          results.push({
            communication_id: comm.id,
            type: comm.communication_type,
            client_name: comm.client_name,
            success: true,
          });
        } else {
          await db.run(`
            UPDATE communications 
            SET status = 'failed'
            WHERE id = ?
          `, [comm.id]);

          results.push({
            communication_id: comm.id,
            type: comm.communication_type,
            client_name: comm.client_name,
            success: false,
            error: result?.error,
          });
        }
      }

      return {
        success: true,
        processed: results.length,
        results,
      };
    } catch (error) {
      console.error('Scheduled communications processing error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get communication history for a client
   * @param {number} clientId - Client ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Communication history
   */
  async getClientCommunicationHistory(clientId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        type = null,
        status = null,
      } = options;

      const offset = (page - 1) * limit;
      const whereConditions = ['client_id = ?'];
      const params = [clientId];

      if (type) {
        whereConditions.push('communication_type = ?');
        params.push(type);
      }

      if (status) {
        whereConditions.push('status = ?');
        params.push(status);
      }

      const communications = await db.query(`
        SELECT 
          c.*,
          u.name as sent_by_name
        FROM communications c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      const totalCount = await db.get(`
        SELECT COUNT(*) as count FROM communications
        WHERE ${whereConditions.join(' AND ')}
      `, params);

      return {
        communications,
        pagination: {
          page,
          limit,
          total: totalCount.count,
          totalPages: Math.ceil(totalCount.count / limit),
        },
      };
    } catch (error) {
      console.error('Communication history error:', error);
      throw error;
    }
  }

  /**
   * Create communication template
   * @param {Object} templateData - Template details
   * @returns {Promise<Object>} Template creation result
   */
  async createTemplate(templateData) {
    try {
      const {
        company_id,
        name,
        template_type,
        subject,
        content,
        variables = [],
        created_by,
      } = templateData;

      const result = await db.run(`
        INSERT INTO communication_templates (
          company_id, name, template_type, subject, content, variables,
          is_active, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        company_id,
        name,
        template_type,
        subject,
        content,
        JSON.stringify(variables),
        created_by,
      ]);

      return {
        success: true,
        template_id: result.id,
      };
    } catch (error) {
      console.error('Template creation error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process template with context data
   * @private
   */
  processTemplate(template, contextData) {
    let subject = template.subject || '';
    let content = template.content || '';

    // Replace common variables
    const replacements = {
      '{{client_name}}': contextData.client_name || '',
      '{{company_name}}': contextData.company_name || '',
      '{{site_address}}': contextData.site_address || '',
      '{{service_date}}': contextData.service_date || new Date().toLocaleDateString(),
      '{{technician_name}}': contextData.technician_name || '',
      '{{estimate_amount}}': contextData.estimate_amount || '',
      '{{inspection_id}}': contextData.inspection_id || '',
      '{{work_order_id}}': contextData.work_order_id || '',
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      content = content.replace(new RegExp(placeholder, 'g'), value);
    }

    return { subject, content };
  }

  /**
   * Get communication statistics for a company
   * @param {number} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Communication statistics
   */
  async getCommunicationStats(companyId, options = {}) {
    try {
      const {
        start_date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date = new Date().toISOString(),
      } = options;

      const stats = await db.get(`
        SELECT 
          COUNT(*) as total_communications,
          COUNT(CASE WHEN communication_type = 'email' THEN 1 END) as emails_sent,
          COUNT(CASE WHEN communication_type = 'text' THEN 1 END) as sms_sent,
          COUNT(CASE WHEN communication_type = 'phone' THEN 1 END) as calls_logged,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_communications,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_communications,
          COUNT(CASE WHEN direction = 'inbound' THEN 1 END) as inbound_communications,
          COUNT(CASE WHEN direction = 'outbound' THEN 1 END) as outbound_communications
        FROM communications
        WHERE company_id = ?
          AND created_at BETWEEN ? AND ?
      `, [companyId, start_date, end_date]);

      const successRate = stats.total_communications > 0
        ? (stats.successful_communications / stats.total_communications * 100).toFixed(1)
        : 0;

      return {
        ...stats,
        success_rate: parseFloat(successRate),
        period: { start_date, end_date },
      };
    } catch (error) {
      console.error('Communication stats error:', error);
      throw error;
    }
  }
}

// Process scheduled communications every 5 minutes
if (process.env.NODE_ENV !== 'test') {
  setInterval(async () => {
    const communicationService = new CommunicationService();
    try {
      const result = await communicationService.processScheduledCommunications();
      if (result.processed > 0) {
        console.log(`📧 Processed ${result.processed} scheduled communications`);
      }
    } catch (error) {
      console.error('Scheduled communications processing error:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes
}

module.exports = new CommunicationService();
