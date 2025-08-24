const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    // For development, you can use a service like Ethereal Email for testing
    // In production, use a real email service like SendGrid, AWS SES, etc.
    if (process.env.NODE_ENV === 'production') {
      return nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    }

    // Development/testing transporter (logs emails to console)
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.ETHEREAL_USER || 'test@ethereal.email',
        pass: process.env.ETHEREAL_PASS || 'test',
      },
    });
  }

  async sendEmailVerification(email, name, token) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/verify-email?token=${token}`;

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@sprinklerrepair.com',
      to: email,
      subject: 'Verify your email address',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #2563eb;">Sprinkler Repair SaaS</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #1f2937;">Welcome, ${name}!</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Thank you for creating your account. To complete your registration and start using our platform, 
              please verify your email address by clicking the button below.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              If you didn't create this account, you can safely ignore this email.
            </p>
            
            <p style="color: #6b7280; font-size: 14px;">
              This verification link will expire in 7 days.
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
            <p>© 2025 Sprinkler Repair SaaS. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email verification sent:', info.messageId);

      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 Verification URL (development):', verificationUrl);
      }

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendPasswordReset(email, name, token) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/reset-password?token=${token}`;

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@sprinklerrepair.com',
      to: email,
      subject: 'Reset your password',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #2563eb;">Sprinkler Repair SaaS</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #1f2937;">Password Reset Request</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Hi ${name},
            </p>
            
            <p style="color: #4b5563; line-height: 1.6;">
              We received a request to reset your password. Click the button below to create a new password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.
            </p>
            
            <p style="color: #6b7280; font-size: 14px;">
              This reset link will expire in 24 hours.
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
            <p>© 2025 Sprinkler Repair SaaS. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Password reset email sent:', info.messageId);

      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 Reset URL (development):', resetUrl);
      }

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendWelcomeEmail(email, name, companyName) {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/login`;

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@sprinklerrepair.com',
      to: email,
      subject: `Welcome to Sprinkler Repair SaaS - ${companyName}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #2563eb;">Sprinkler Repair SaaS</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #1f2937;">Welcome to your new workspace!</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Hi ${name},
            </p>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Congratulations! Your account for <strong>${companyName}</strong> has been successfully created and verified. 
              You can now start managing your sprinkler inspections, estimates, and work orders.
            </p>
            
            <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0;">Getting Started:</h3>
              <ul style="color: #1e40af; line-height: 1.8;">
                <li>Create your first inspection template</li>
                <li>Add your team members</li>
                <li>Set up your price book</li>
                <li>Schedule your first inspection</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" 
                 style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                Access Your Dashboard
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              If you have any questions, feel free to reach out to our support team.
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
            <p>© 2025 Sprinkler Repair SaaS. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Welcome email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      // Don't throw error for welcome email - it's not critical
      return { success: false, error: error.message };
    }
  }

  async sendMagicLinkEmail(email, magicLink, clientName, company) {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@sprinklerrepair.com',
      to: email,
      subject: `Access Your Customer Portal - ${company.name}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #2563eb;">${company.name}</h1>
            <p style="color: #6b7280; margin: 0;">Customer Portal Access</p>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #1f2937;">Welcome to your Customer Portal!</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              Hi ${clientName || 'Valued Customer'},
            </p>
            
            <p style="color: #4b5563; line-height: 1.6;">
              You can now access your customer portal to view your service history, 
              schedule appointments, submit service requests, and download reports.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicLink}" 
                 style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
                Access Your Portal
              </a>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>🔒 Security Notice:</strong> This link will expire in 15 minutes and can only be used once.
              </p>
            </div>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #374151; margin-top: 0;">What you can do in your portal:</h3>
              <ul style="color: #4b5563; line-height: 1.8; margin: 10px 0;">
                <li>View your service history and reports</li>
                <li>Schedule new appointments</li>
                <li>Submit service requests</li>
                <li>Download inspection reports and estimates</li>
                <li>Provide feedback on completed services</li>
              </ul>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              If you didn't request this access link, you can safely ignore this email.
            </p>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                Need help? Contact us:
              </p>
              <p style="color: #4b5563; font-size: 14px; margin: 5px 0;">
                📧 ${company.email || 'support@company.com'}<br>
                📞 ${company.phone || 'Contact your service provider'}
              </p>
            </div>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">© 2025 ${company.name}. Customer Portal powered by Sprinkler Repair SaaS.</p>
          </div>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Magic link email sent:', info.messageId);

      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 Magic Link URL (development):', magicLink);
      }

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Magic link email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendServiceNotification(email, clientName, notificationType, serviceDetails, company) {
    let subject = '';
    let content = '';

    switch (notificationType) {
      case 'service_scheduled':
        subject = `Service Scheduled - ${company.name}`;
        content = `
          <h2 style="color: #1f2937;">Service Scheduled</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Your service has been scheduled for ${serviceDetails.date} at ${serviceDetails.time}.
          </p>
          <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Service Details:</strong><br>
            Service Type: ${serviceDetails.type}<br>
            Technician: ${serviceDetails.technician}<br>
            Location: ${serviceDetails.location}
          </div>
        `;
        break;

      case 'report_ready':
        subject = `Service Report Available - ${company.name}`;
        content = `
          <h2 style="color: #1f2937;">Your Service Report is Ready</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            The report for your recent service is now available in your customer portal.
          </p>
        `;
        break;

      case 'estimate_available':
        subject = `Estimate Available - ${company.name}`;
        content = `
          <h2 style="color: #1f2937;">Your Estimate is Ready</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Based on our inspection, we've prepared an estimate for the recommended work.
          </p>
        `;
        break;
    }

    const portalUrl = `${process.env.CUSTOMER_PORTAL_URL || 'http://localhost:3001'}/customer/portal`;

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@sprinklerrepair.com',
      to: email,
      subject,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #2563eb;">${company.name}</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            ${content}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${portalUrl}" 
                 style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                View in Portal
              </a>
            </div>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">© 2025 ${company.name}. Customer Portal powered by Sprinkler Repair SaaS.</p>
          </div>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Service notification sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Service notification email failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
