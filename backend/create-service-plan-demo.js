const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function createServicePlanDemo() {
  console.log('🔧 Creating service plan demo data...');
  
  const db = new sqlite3.Database(path.join(__dirname, 'data', 'sprinkler_repair.db'));
  
  try {
    // Get demo company ID
    const company = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM companies WHERE name = ?', ['Demo Irrigation Services'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!company) {
      console.log('❌ Demo company not found. Run create-demo-users.js first.');
      return;
    }
    
    const companyId = company.id;
    console.log(`✅ Using company ID: ${companyId}`);
    
    // Create service plans
    const servicePlans = [
      {
        name: 'Basic Maintenance',
        description: 'Monthly sprinkler system inspection and basic maintenance',
        billing_cycle: 'monthly',
        price_cents: 9900, // $99
        setup_fee_cents: 0,
        visit_frequency: 'monthly',
        included_services: ['Monthly inspection', 'Basic repairs included', 'System performance check'],
        max_sites: 1,
        commission_rate: 0.10
      },
      {
        name: 'Premium Care',
        description: 'Comprehensive maintenance with priority support',
        billing_cycle: 'monthly',
        price_cents: 19900, // $199
        setup_fee_cents: 5000, // $50 setup
        visit_frequency: 'biweekly',
        included_services: ['Bi-weekly inspection', 'All repairs included', 'Priority support', 'Seasonal tune-ups'],
        max_sites: 3,
        commission_rate: 0.15
      },
      {
        name: 'Commercial Plus',
        description: 'Enterprise-level service for commercial properties',
        billing_cycle: 'monthly',
        price_cents: 49900, // $499
        setup_fee_cents: 15000, // $150 setup
        visit_frequency: 'weekly',
        included_services: ['Weekly inspection', 'Emergency support', '24/7 monitoring', 'Preventive maintenance'],
        max_sites: 99,
        commission_rate: 0.20
      }
    ];
    
    console.log('Creating service plans...');
    const planIds = [];
    
    for (const plan of servicePlans) {
      const result = await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO service_plans (
            company_id, name, description, billing_cycle, price_cents, setup_fee_cents,
            visit_frequency, included_services, max_sites, commission_rate, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [
          companyId, plan.name, plan.description, plan.billing_cycle, 
          plan.price_cents, plan.setup_fee_cents, plan.visit_frequency,
          JSON.stringify(plan.included_services), plan.max_sites, plan.commission_rate
        ], function(err) {
          if (err) reject(err);
          else {
            console.log(`✅ Created service plan: ${plan.name}`);
            resolve(this.lastID);
          }
        });
      });
      planIds.push(result);
    }
    
    // Get existing clients and techs
    const clients = await new Promise((resolve, reject) => {
      db.all('SELECT id, name FROM clients WHERE company_id = ? LIMIT 3', [companyId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    const techs = await new Promise((resolve, reject) => {
      db.all('SELECT id, name FROM users WHERE company_id = ? AND role = ?', [companyId, 'technician'], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    if (clients.length === 0) {
      console.log('❌ No clients found. Run create-demo-data.js first.');
      return;
    }
    
    const techId = techs.length > 0 ? techs[0].id : null;
    
    // Create client subscriptions
    console.log('Creating client subscriptions...');
    const subscriptions = [
      {
        client_id: clients[0]?.id,
        service_plan_id: planIds[1], // Premium Care
        start_date: '2024-12-01',
        sites_included: [1, 2],
        monthly_price_cents: 19900
      },
      {
        client_id: clients[1]?.id,
        service_plan_id: planIds[0], // Basic Maintenance
        start_date: '2024-12-15',
        sites_included: [3],
        monthly_price_cents: 9900
      },
      {
        client_id: clients[2]?.id,
        service_plan_id: planIds[2], // Commercial Plus
        start_date: '2024-11-01',
        sites_included: [4, 5, 6],
        monthly_price_cents: 49900
      }
    ];
    
    const subscriptionIds = [];
    
    for (let i = 0; i < subscriptions.length; i++) {
      const sub = subscriptions[i];
      if (!sub.client_id) continue;
      
      // Calculate next billing date
      const startDate = new Date(sub.start_date);
      const nextBillingDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate());
      
      const result = await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO client_subscriptions (
            company_id, client_id, service_plan_id, start_date, next_billing_date,
            sites_included, sold_by_tech_id, monthly_price_cents, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [
          companyId, sub.client_id, sub.service_plan_id, sub.start_date,
          nextBillingDate.toISOString().split('T')[0],
          JSON.stringify(sub.sites_included), techId, sub.monthly_price_cents
        ], function(err) {
          if (err) reject(err);
          else {
            console.log(`✅ Created subscription for client ${sub.client_id}`);
            resolve(this.lastID);
          }
        });
      });
      subscriptionIds.push(result);
    }
    
    // Create recurring invoices
    console.log('Creating sample invoices...');
    for (let i = 0; i < subscriptionIds.length; i++) {
      const subId = subscriptionIds[i];
      const sub = subscriptions[i];
      
      // Create a few invoices per subscription
      for (let month = 0; month < 2; month++) {
        const billingStart = new Date(2024, 11 + month, 1); // December 2024 + month
        const billingEnd = new Date(2024, 12 + month, 0); // Last day of month
        const dueDate = new Date(2024, 12 + month, 5); // 5th of next month
        const paidDate = month === 0 ? new Date(2024, 12 + month, 3) : null; // First invoice paid
        
        await new Promise((resolve, reject) => {
          db.run(`
            INSERT INTO recurring_invoices (
              company_id, subscription_id, invoice_number, status, amount_cents,
              billing_period_start, billing_period_end, due_date, paid_date,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `, [
            companyId, subId, `INV-${subId}-${String(month + 1).padStart(3, '0')}`,
            paidDate ? 'paid' : 'pending', sub.monthly_price_cents,
            billingStart.toISOString().split('T')[0],
            billingEnd.toISOString().split('T')[0],
            dueDate.toISOString().split('T')[0],
            paidDate ? paidDate.toISOString().split('T')[0] : null
          ], function(err) {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    }
    
    // Create commission tracking records
    if (techId) {
      console.log('Creating commission records...');
      for (let i = 0; i < subscriptionIds.length; i++) {
        const subId = subscriptionIds[i];
        const sub = subscriptions[i];
        const planIndex = planIds.indexOf(sub.service_plan_id);
        const commissionRate = servicePlans[planIndex].commission_rate;
        const commissionAmount = Math.round(sub.monthly_price_cents * commissionRate);
        
        // Initial sale commission
        await new Promise((resolve, reject) => {
          db.run(`
            INSERT INTO commission_tracking (
              company_id, tech_id, subscription_id, commission_type, commission_rate,
              base_amount_cents, commission_amount_cents, period_start, period_end,
              status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `, [
            companyId, techId, subId, 'sale', commissionRate,
            sub.monthly_price_cents, commissionAmount,
            sub.start_date, '2025-01-31', 'paid'
          ], function(err) {
            if (err) reject(err);
            else resolve();
          });
        });
        
        // Recurring monthly commissions
        for (let month = 0; month < 2; month++) {
          const recurringCommission = Math.round(commissionAmount * 0.5); // 50% of initial for recurring
          const periodStart = new Date(2024, 11 + month, 1);
          const periodEnd = new Date(2024, 12 + month, 0);
          
          await new Promise((resolve, reject) => {
            db.run(`
              INSERT INTO commission_tracking (
                company_id, tech_id, subscription_id, commission_type, commission_rate,
                base_amount_cents, commission_amount_cents, period_start, period_end,
                status, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `, [
              companyId, techId, subId, 'recurring', commissionRate * 0.5,
              sub.monthly_price_cents, recurringCommission,
              periodStart.toISOString().split('T')[0],
              periodEnd.toISOString().split('T')[0],
              month === 0 ? 'paid' : 'pending'
            ], function(err) {
              if (err) reject(err);
              else resolve();
            });
          });
        }
      }
    }
    
    console.log('🎉 Service plan demo data created successfully!');
    
    // Show summary
    const summary = await new Promise((resolve, reject) => {
      const queries = [
        'SELECT COUNT(*) as count FROM service_plans WHERE company_id = ?',
        'SELECT COUNT(*) as count FROM client_subscriptions WHERE company_id = ?',
        'SELECT COUNT(*) as count FROM recurring_invoices WHERE company_id = ?',
        'SELECT COUNT(*) as count FROM commission_tracking WHERE company_id = ?',
        'SELECT SUM(monthly_price_cents) as mrr FROM client_subscriptions WHERE company_id = ? AND status = "active"'
      ];
      
      Promise.all(queries.map(query => 
        new Promise((res, rej) => {
          db.get(query, [companyId], (err, row) => {
            if (err) rej(err);
            else res(row.count || row.mrr || 0);
          });
        })
      )).then(counts => {
        resolve({
          service_plans: counts[0],
          subscriptions: counts[1],
          invoices: counts[2],
          commissions: counts[3],
          mrr_cents: counts[4]
        });
      }).catch(reject);
    });
    
    console.log('\n📊 Service Plan Summary:');
    console.log(`   Service Plans: ${summary.service_plans}`);
    console.log(`   Active Subscriptions: ${summary.subscriptions}`);
    console.log(`   Invoices: ${summary.invoices}`);
    console.log(`   Commission Records: ${summary.commissions}`);
    console.log(`   Monthly Recurring Revenue: $${(summary.mrr_cents / 100).toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Error creating service plan demo:', error);
  } finally {
    db.close();
  }
}

createServicePlanDemo();