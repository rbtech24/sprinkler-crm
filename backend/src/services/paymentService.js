const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../database/sqlite');

class PaymentService {
  constructor() {
    this.stripeEnabled = !!process.env.STRIPE_SECRET_KEY;
    if (!this.stripeEnabled) {
      console.warn('⚠️  Stripe not configured - payment features will be disabled');
    }
  }

  /**
   * Create or get Stripe customer for a client
   * @param {Object} client - Client details
   * @returns {Promise<string>} Stripe customer ID
   */
  async createStripeCustomer(client) {
    if (!this.stripeEnabled) {
      throw new Error('Stripe not configured');
    }

    try {
      // Check if customer already exists
      if (client.stripe_customer_id) {
        try {
          const existingCustomer = await stripe.customers.retrieve(client.stripe_customer_id);
          if (!existingCustomer.deleted) {
            return client.stripe_customer_id;
          }
        } catch (error) {
          console.warn('Existing Stripe customer not found:', error.message);
        }
      }

      // Create new Stripe customer
      const stripeCustomer = await stripe.customers.create({
        email: client.email,
        name: client.name,
        phone: client.phone,
        metadata: {
          client_id: client.id.toString(),
          company_id: client.company_id.toString(),
        },
      });

      // Update client with Stripe customer ID
      await db.run(`
        UPDATE clients 
        SET stripe_customer_id = ?
        WHERE id = ?
      `, [stripeCustomer.id, client.id]);

      return stripeCustomer.id;
    } catch (error) {
      console.error('Stripe customer creation error:', error);
      throw new Error(`Failed to create Stripe customer: ${error.message}`);
    }
  }

  /**
   * Create payment intent for an estimate
   * @param {Object} estimate - Estimate details
   * @param {Object} options - Payment options
   * @returns {Promise<Object>} Payment intent details
   */
  async createPaymentIntent(estimate, options = {}) {
    if (!this.stripeEnabled) {
      return {
        success: false,
        error: 'Payment processing is not enabled',
      };
    }

    try {
      // Get client details
      const client = await db.get(`
        SELECT c.*, s.address, s.city, s.state, s.zip
        FROM clients c
        LEFT JOIN sites s ON c.id = s.client_id
        WHERE c.id = ?
        LIMIT 1
      `, [estimate.client_id]);

      if (!client) {
        throw new Error('Client not found');
      }

      // Ensure Stripe customer exists
      const customerId = await this.createStripeCustomer(client);

      const paymentIntentData = {
        amount: estimate.total_cents,
        currency: 'usd',
        customer: customerId,
        description: `Payment for Estimate #${estimate.id}`,
        metadata: {
          estimate_id: estimate.id.toString(),
          client_id: client.id.toString(),
          company_id: client.company_id.toString(),
        },
        automatic_payment_methods: {
          enabled: true,
        },
      };

      // Add application fee if configured
      if (options.applicationFeeAmount) {
        paymentIntentData.application_fee_amount = options.applicationFeeAmount;
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

      // Store payment intent in database
      await db.run(`
        INSERT INTO payment_intents (
          stripe_payment_intent_id, client_id, estimate_id, amount_cents,
          status, created_at
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        paymentIntent.id,
        client.id,
        estimate.id,
        paymentIntent.amount,
        paymentIntent.status,
      ]);

      return {
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          status: paymentIntent.status,
        },
      };
    } catch (error) {
      console.error('Payment intent creation error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process a one-time payment
   * @param {string} paymentMethodId - Stripe payment method ID
   * @param {Object} paymentDetails - Payment details
   * @returns {Promise<Object>} Payment result
   */
  async processPayment(paymentMethodId, paymentDetails) {
    if (!this.stripeEnabled) {
      return {
        success: false,
        error: 'Payment processing is not enabled',
      };
    }

    try {
      const {
        amount_cents,
        client_id,
        estimate_id,
        description = 'Service payment',
      } = paymentDetails;

      // Get client details
      const client = await db.get('SELECT * FROM clients WHERE id = ?', [client_id]);
      if (!client) {
        throw new Error('Client not found');
      }

      // Ensure Stripe customer exists
      const customerId = await this.createStripeCustomer(client);

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount_cents,
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        description,
        metadata: {
          client_id: client_id.toString(),
          estimate_id: estimate_id?.toString() || '',
          company_id: client.company_id.toString(),
        },
        confirm: true,
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/payment/complete`,
      });

      // Store payment record
      const paymentRecord = await db.run(`
        INSERT INTO payments (
          stripe_payment_intent_id, client_id, estimate_id, payment_method_id,
          amount_cents, status, description, processed_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        paymentIntent.id,
        client_id,
        estimate_id,
        paymentMethodId,
        amount_cents,
        paymentIntent.status,
        description,
      ]);

      // Update estimate status if applicable
      if (estimate_id && paymentIntent.status === 'succeeded') {
        await db.run(`
          UPDATE estimates 
          SET status = 'paid', paid_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [estimate_id]);
      }

      return {
        success: paymentIntent.status === 'succeeded',
        paymentId: paymentRecord.id,
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
        },
      };
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Set up subscription for recurring payments
   * @param {Object} subscriptionData - Subscription details
   * @returns {Promise<Object>} Subscription result
   */
  async createSubscription(subscriptionData) {
    if (!this.stripeEnabled) {
      return {
        success: false,
        error: 'Subscription processing is not enabled',
      };
    }

    try {
      const {
        client_id,
        payment_method_id,
        price_id, // Stripe price ID for the service
        billing_cycle = 'monthly', // monthly, quarterly, yearly
        start_date,
      } = subscriptionData;

      // Get client details
      const client = await db.get('SELECT * FROM clients WHERE id = ?', [client_id]);
      if (!client) {
        throw new Error('Client not found');
      }

      // Ensure Stripe customer exists
      const customerId = await this.createStripeCustomer(client);

      // Attach payment method to customer
      await stripe.paymentMethods.attach(payment_method_id, {
        customer: customerId,
      });

      // Set as default payment method
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: payment_method_id,
        },
      });

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: price_id }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        trial_period_days: subscriptionData.trial_days || 0,
        billing_cycle_anchor: start_date ? Math.floor(new Date(start_date).getTime() / 1000) : undefined,
        metadata: {
          client_id: client_id.toString(),
          company_id: client.company_id.toString(),
          billing_cycle,
        },
      });

      // Store subscription in database
      await db.run(`
        INSERT INTO subscriptions (
          stripe_subscription_id, client_id, status, billing_cycle,
          current_period_start, current_period_end, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        subscription.id,
        client_id,
        subscription.status,
        billing_cycle,
        new Date(subscription.current_period_start * 1000).toISOString(),
        new Date(subscription.current_period_end * 1000).toISOString(),
      ]);

      return {
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          client_secret: subscription.latest_invoice.payment_intent?.client_secret,
        },
      };
    } catch (error) {
      console.error('Subscription creation error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Handle Stripe webhooks
   * @param {Object} event - Stripe event
   * @returns {Promise<boolean>} Success status
   */
  async handleWebhook(event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSuccess(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailure(event.data.object);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancellation(event.data.object);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return true;
    } catch (error) {
      console.error('Webhook handling error:', error);
      return false;
    }
  }

  /**
   * Handle successful payment
   * @private
   */
  async handlePaymentSuccess(paymentIntent) {
    try {
      // Update payment record
      await db.run(`
        UPDATE payment_intents 
        SET status = 'succeeded', updated_at = CURRENT_TIMESTAMP
        WHERE stripe_payment_intent_id = ?
      `, [paymentIntent.id]);

      // Update estimate if applicable
      if (paymentIntent.metadata.estimate_id) {
        await db.run(`
          UPDATE estimates 
          SET status = 'paid', paid_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [paymentIntent.metadata.estimate_id]);

        // Create work order from paid estimate
        await this.createWorkOrderFromEstimate(paymentIntent.metadata.estimate_id);
      }

      // Send payment confirmation email
      await this.sendPaymentConfirmation(paymentIntent);
    } catch (error) {
      console.error('Payment success handling error:', error);
    }
  }

  /**
   * Handle failed payment
   * @private
   */
  async handlePaymentFailure(paymentIntent) {
    try {
      // Update payment record
      await db.run(`
        UPDATE payment_intents 
        SET status = 'failed', updated_at = CURRENT_TIMESTAMP
        WHERE stripe_payment_intent_id = ?
      `, [paymentIntent.id]);

      // Send payment failure notification
      await this.sendPaymentFailureNotification(paymentIntent);
    } catch (error) {
      console.error('Payment failure handling error:', error);
    }
  }

  /**
   * Create work order from paid estimate
   * @private
   */
  async createWorkOrderFromEstimate(estimateId) {
    try {
      const estimate = await db.get(`
        SELECT e.*, c.id as client_id, c.name as client_name
        FROM estimates e
        JOIN clients c ON e.client_id = c.id
        WHERE e.id = ?
      `, [estimateId]);

      if (!estimate) return;

      // Create work order
      const workOrderResult = await db.run(`
        INSERT INTO work_orders (
          company_id, site_id, client_id, estimate_id, status,
          description, total_cents, created_at
        ) VALUES (?, ?, ?, ?, 'scheduled', ?, ?, CURRENT_TIMESTAMP)
      `, [
        estimate.company_id,
        estimate.site_id,
        estimate.client_id,
        estimate.id,
        `Work order for estimate #${estimate.id}`,
        estimate.total_cents,
      ]);

      console.log(`Created work order ${workOrderResult.id} from paid estimate ${estimateId}`);
    } catch (error) {
      console.error('Work order creation error:', error);
    }
  }

  /**
   * Send payment confirmation email
   * @private
   */
  async sendPaymentConfirmation(paymentIntent) {
    try {
      // Get client and company details
      const client = await db.get(`
        SELECT c.*, comp.name as company_name, comp.email as company_email
        FROM clients c
        JOIN companies comp ON c.company_id = comp.id
        WHERE c.id = ?
      `, [paymentIntent.metadata.client_id]);

      if (!client || !client.email) return;

      const emailService = require('./emailService');

      // Send confirmation email
      await emailService.sendServiceNotification(
        client.email,
        client.name,
        'payment_received',
        {
          amount: (paymentIntent.amount / 100).toFixed(2),
          payment_intent_id: paymentIntent.id,
          date: new Date().toLocaleDateString(),
        },
        {
          name: client.company_name,
          email: client.company_email,
        },
      );
    } catch (error) {
      console.error('Payment confirmation email error:', error);
    }
  }

  /**
   * Get payment methods for a client
   * @param {number} clientId - Client ID
   * @returns {Promise<Array>} Payment methods
   */
  async getPaymentMethods(clientId) {
    if (!this.stripeEnabled) {
      return [];
    }

    try {
      const client = await db.get('SELECT * FROM clients WHERE id = ?', [clientId]);
      if (!client || !client.stripe_customer_id) {
        return [];
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: client.stripe_customer_id,
        type: 'card',
      });

      return paymentMethods.data.map((pm) => ({
        id: pm.id,
        card: pm.card,
        billing_details: pm.billing_details,
        created: pm.created,
      }));
    } catch (error) {
      console.error('Get payment methods error:', error);
      return [];
    }
  }

  /**
   * Get payment history for a client
   * @param {number} clientId - Client ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Payment history
   */
  async getPaymentHistory(clientId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const payments = await db.query(`
        SELECT 
          p.*,
          e.id as estimate_number,
          CASE 
            WHEN p.status = 'succeeded' THEN 'Paid'
            WHEN p.status = 'failed' THEN 'Failed'
            WHEN p.status = 'pending' THEN 'Pending'
            ELSE p.status
          END as status_display
        FROM payments p
        LEFT JOIN estimates e ON p.estimate_id = e.id
        WHERE p.client_id = ?
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `, [clientId, limit, offset]);

      const totalCount = await db.get(`
        SELECT COUNT(*) as count FROM payments WHERE client_id = ?
      `, [clientId]);

      return {
        payments,
        pagination: {
          page,
          limit,
          total: totalCount.count,
          totalPages: Math.ceil(totalCount.count / limit),
        },
      };
    } catch (error) {
      console.error('Payment history error:', error);
      throw error;
    }
  }

  /**
   * Process refund
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @param {number} amount - Refund amount in cents (optional - full refund if not provided)
   * @param {string} reason - Refund reason
   * @returns {Promise<Object>} Refund result
   */
  async processRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
    if (!this.stripeEnabled) {
      return {
        success: false,
        error: 'Payment processing is not enabled',
      };
    }

    try {
      const refundData = {
        payment_intent: paymentIntentId,
        reason,
      };

      if (amount) {
        refundData.amount = amount;
      }

      const refund = await stripe.refunds.create(refundData);

      // Store refund record
      await db.run(`
        INSERT INTO refunds (
          stripe_refund_id, stripe_payment_intent_id, amount_cents,
          reason, status, created_at
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [refund.id, paymentIntentId, refund.amount, reason, refund.status]);

      return {
        success: true,
        refund: {
          id: refund.id,
          amount: refund.amount,
          status: refund.status,
        },
      };
    } catch (error) {
      console.error('Refund processing error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new PaymentService();
