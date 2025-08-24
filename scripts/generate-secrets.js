#!/usr/bin/env node

/**
 * Security Secret Generator
 * Generates cryptographically secure secrets for production deployment
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SecretGenerator {
  constructor() {
    this.secrets = {};
  }

  /**
   * Generate a cryptographically secure random string
   * @param {number} length - Length of the secret in bytes
   * @param {string} encoding - Encoding format (hex, base64, base64url)
   * @returns {string} - Generated secret
   */
  generateSecret(length = 32, encoding = 'hex') {
    return crypto.randomBytes(length).toString(encoding);
  }

  /**
   * Generate JWT secret (64 bytes = 512 bits)
   */
  generateJWTSecret() {
    const secret = this.generateSecret(64, 'hex');
    this.secrets.JWT_SECRET = secret;
    return secret;
  }

  /**
   * Generate session secret (32 bytes = 256 bits)
   */
  generateSessionSecret() {
    const secret = this.generateSecret(32, 'hex');
    this.secrets.SESSION_SECRET = secret;
    return secret;
  }

  /**
   * Generate API key (32 bytes, URL-safe base64)
   */
  generateAPIKey() {
    const secret = this.generateSecret(32, 'base64url');
    this.secrets.API_KEY = secret;
    return secret;
  }

  /**
   * Generate webhook secret (24 bytes)
   */
  generateWebhookSecret() {
    const secret = this.generateSecret(24, 'hex');
    this.secrets.WEBHOOK_SECRET = secret;
    return secret;
  }

  /**
   * Generate encryption key for sensitive data (32 bytes for AES-256)
   */
  generateEncryptionKey() {
    const secret = this.generateSecret(32, 'hex');
    this.secrets.ENCRYPTION_KEY = secret;
    return secret;
  }

  /**
   * Generate all required secrets
   */
  generateAllSecrets() {
    console.log('🔐 Generating cryptographically secure secrets...\n');

    const jwtSecret = this.generateJWTSecret();
    const sessionSecret = this.generateSessionSecret();
    const apiKey = this.generateAPIKey();
    const webhookSecret = this.generateWebhookSecret();
    const encryptionKey = this.generateEncryptionKey();

    console.log('✅ Secrets generated successfully!\n');
    
    return {
      JWT_SECRET: jwtSecret,
      SESSION_SECRET: sessionSecret,
      API_KEY: apiKey,
      WEBHOOK_SECRET: webhookSecret,
      ENCRYPTION_KEY: encryptionKey,
    };
  }

  /**
   * Create a secure .env file with generated secrets
   */
  createSecureEnvFile(environment = 'production') {
    const secrets = this.generateAllSecrets();
    const timestamp = new Date().toISOString();
    
    const envContent = `# Generated Environment Configuration - ${environment.toUpperCase()}
# Generated on: ${timestamp}
# WARNING: Keep these secrets secure and never commit to version control!

# =============================================================================
# SECURITY SECRETS (Generated - DO NOT CHANGE IN PRODUCTION)
# =============================================================================

# JWT Secret - Used for signing JSON Web Tokens
JWT_SECRET=${secrets.JWT_SECRET}

# Session Secret - Used for session encryption
SESSION_SECRET=${secrets.SESSION_SECRET}

# API Key - For internal service communication
API_KEY=${secrets.API_KEY}

# Webhook Secret - For validating webhook payloads
WEBHOOK_SECRET=${secrets.WEBHOOK_SECRET}

# Encryption Key - For encrypting sensitive data at rest
ENCRYPTION_KEY=${secrets.ENCRYPTION_KEY}

# =============================================================================
# APPLICATION CONFIGURATION (Update these values)
# =============================================================================

# Environment
NODE_ENV=${environment}
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/irrigation_${environment}

# Frontend URLs (Update with your actual domains)
FRONTEND_URL=https://app.yourdomain.com
BASE_URL=https://api.yourdomain.com

# =============================================================================
# THIRD-PARTY SERVICES (Configure these)
# =============================================================================

# Email Service Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your_email_password_here
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Irrigation Pro

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=your-bucket-name

# Stripe Configuration (Optional)
STRIPE_SECRET_KEY=sk_live_your_stripe_key
STRIPE_WEBHOOK_SECRET=${secrets.WEBHOOK_SECRET}

# =============================================================================
# SECURITY SETTINGS
# =============================================================================

# JWT Configuration
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Account Security
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME_MINUTES=30
PASSWORD_RESET_EXPIRES_MINUTES=60
EMAIL_VERIFICATION_EXPIRES_HOURS=24

# Security Headers
FORCE_HTTPS=true
ENABLE_HSTS=true
ENABLE_CSP=true

# =============================================================================
# MONITORING & LOGGING
# =============================================================================

LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
ENABLE_ERROR_TRACKING=true

# Health Checks
HEALTH_CHECK_INTERVAL=30000
ENABLE_HEALTH_CHECKS=true
`;

    const fileName = `.env.${environment}`;
    const filePath = path.join(process.cwd(), fileName);
    
    fs.writeFileSync(filePath, envContent);
    
    console.log(`📄 Secure environment file created: ${fileName}`);
    console.log('⚠️  Important: Update the placeholder values with your actual configuration\n');
    
    return filePath;
  }

  /**
   * Display secrets in a secure format for manual copying
   */
  displaySecrets() {
    const secrets = this.generateAllSecrets();
    
    console.log('📋 Copy these secrets to your environment configuration:\n');
    console.log('=' .repeat(80));
    
    Object.entries(secrets).forEach(([key, value]) => {
      console.log(`${key}=${value}`);
    });
    
    console.log('=' .repeat(80));
    console.log('\n🔒 Security Notes:');
    console.log('- Store these secrets securely (use a password manager)');
    console.log('- Never commit these secrets to version control');
    console.log('- Use environment-specific secret management in production');
    console.log('- Rotate secrets regularly');
    console.log('- Use different secrets for each environment\n');
  }

  /**
   * Validate existing secrets for security
   */
  validateExistingSecrets(envFile = '.env') {
    console.log('🔍 Validating existing secrets...\n');
    
    try {
      const envPath = path.join(process.cwd(), envFile);
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      const issues = [];
      
      // Check for weak JWT secrets
      const jwtMatch = envContent.match(/JWT_SECRET=(.+)/);
      if (jwtMatch) {
        const jwtSecret = jwtMatch[1].trim();
        if (jwtSecret.includes('dev-') || jwtSecret.includes('change-this') || jwtSecret.length < 64) {
          issues.push('❌ JWT_SECRET is weak or uses development value');
        } else {
          console.log('✅ JWT_SECRET appears secure');
        }
      } else {
        issues.push('❌ JWT_SECRET not found');
      }
      
      // Check for weak session secrets
      const sessionMatch = envContent.match(/SESSION_SECRET=(.+)/);
      if (sessionMatch) {
        const sessionSecret = sessionMatch[1].trim();
        if (sessionSecret.includes('dev-') || sessionSecret.includes('change-this') || sessionSecret.length < 32) {
          issues.push('❌ SESSION_SECRET is weak or uses development value');
        } else {
          console.log('✅ SESSION_SECRET appears secure');
        }
      } else {
        issues.push('❌ SESSION_SECRET not found');
      }
      
      // Check for default values
      const defaultValues = [
        'your-email@gmail.com',
        'your-aws-access-key',
        'your-aws-secret-key',
        'your-s3-bucket-name'
      ];
      
      defaultValues.forEach(defaultValue => {
        if (envContent.includes(defaultValue)) {
          issues.push(`⚠️  Default placeholder value found: ${defaultValue}`);
        }
      });
      
      if (issues.length === 0) {
        console.log('\n✅ All security checks passed!');
      } else {
        console.log('\n⚠️  Security Issues Found:');
        issues.forEach(issue => console.log(`  ${issue}`));
        console.log('\nRun this script with --generate to create secure secrets\n');
      }
      
    } catch (error) {
      console.log(`❌ Could not read ${envFile}: ${error.message}`);
    }
  }

  /**
   * Generate development secrets that are secure but clearly marked as dev
   */
  generateDevSecrets() {
    const timestamp = Date.now();
    const devSecrets = {
      JWT_SECRET: `dev_${this.generateSecret(32, 'hex')}_${timestamp}`,
      SESSION_SECRET: `dev_${this.generateSecret(16, 'hex')}_${timestamp}`,
    };
    
    console.log('🔧 Development secrets (secure but clearly marked):');
    console.log(`JWT_SECRET=${devSecrets.JWT_SECRET}`);
    console.log(`SESSION_SECRET=${devSecrets.SESSION_SECRET}`);
    console.log('\n⚠️  These are for development only - generate new secrets for production!\n');
    
    return devSecrets;
  }
}

// CLI Interface
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const generator = new SecretGenerator();
  
  switch (command) {
    case '--generate':
    case '-g':
      generator.displaySecrets();
      break;
      
    case '--create-env':
    case '-c':
      const env = args[1] || 'production';
      generator.createSecureEnvFile(env);
      break;
      
    case '--validate':
    case '-v':
      const envFile = args[1] || '.env';
      generator.validateExistingSecrets(envFile);
      break;
      
    case '--dev':
    case '-d':
      generator.generateDevSecrets();
      break;
      
    default:
      console.log(`
🔐 Security Secret Generator

Usage:
  node generate-secrets.js [command] [options]

Commands:
  --generate, -g              Generate and display secure secrets
  --create-env, -c [env]      Create secure .env file (default: production)
  --validate, -v [file]       Validate existing .env file security
  --dev, -d                   Generate development secrets

Examples:
  node generate-secrets.js --generate
  node generate-secrets.js --create-env production
  node generate-secrets.js --create-env staging
  node generate-secrets.js --validate .env
  node generate-secrets.js --dev

Security Best Practices:
  - Generate unique secrets for each environment
  - Store secrets securely (use secret management tools)
  - Never commit secrets to version control
  - Rotate secrets regularly
  - Use environment variables in production
      `);
  }
}

if (require.main === module) {
  main();
}

module.exports = SecretGenerator;