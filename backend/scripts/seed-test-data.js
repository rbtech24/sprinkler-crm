#!/usr/bin/env node

/**
 * Test Data Seeding Script
 * Creates comprehensive test data for manual testing of the entire application workflow
 */

const bcrypt = require('bcryptjs');
const { get, run, query } = require('../src/database/sqlite');

class TestDataSeeder {
  constructor() {
    this.testData = {
      companies: [],
      users: [],
      clients: [],
      sites: [],
      inspections: [],
      estimates: [],
      workOrders: [],
      servicePlans: [],
    };
  }

  async seedAllData() {
    console.log('🌱 Seeding test data for manual testing...');
    
    try {
      // Clear existing data first
      await this.clearExistingData();
      
      // Seed data in correct order (respecting foreign keys)
      await this.seedCompanies();
      await this.seedUsers();
      await this.seedServicePlans();
      await this.seedClients();
      await this.seedSites();
      await this.seedInspections();
      await this.seedEstimates();
      await this.seedWorkOrders();
      
      console.log('✅ Test data seeding completed successfully!');
      await this.printTestCredentials();
      
    } catch (error) {
      console.error('❌ Error seeding test data:', error);
      throw error;
    }
  }

  async clearExistingData() {
    console.log('🧹 Clearing existing test data...');
    
    const tables = [
      'work_orders',
      'estimates', 
      'inspections',
      'sites',
      'clients',
      'client_subscriptions',
      'service_plans',
      'user_sessions',
      'refresh_tokens',
      'users',
      'companies'
    ];

    for (const table of tables) {
      try {
        await run(`DELETE FROM ${table}`);
        console.log(`  ✓ Cleared ${table}`);
      } catch (error) {
        console.log(`  ⚠️  Could not clear ${table} (might not exist): ${error.message}`);
      }
    }
  }

  async seedCompanies() {
    console.log('🏢 Seeding companies...');
    
    const companies = [
      {
        name: 'Demo Irrigation Pro',
        plan: 'professional',
        email: 'admin@demo-irrigation.com',
        phone: '(555) 123-4567',
        website: 'https://demo-irrigation.com',
      },
      {
        name: 'Test Sprinkler Services',
        plan: 'starter', 
        email: 'contact@test-sprinkler.com',
        phone: '(555) 987-6543',
        website: 'https://test-sprinkler.com',
      },
    ];

    for (const company of companies) {
      const result = await run(`
        INSERT INTO companies (name, plan, email, phone, website, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `, [company.name, company.plan, company.email, company.phone, company.website]);
      
      company.id = result.id;
      this.testData.companies.push(company);
      console.log(`  ✓ Created company: ${company.name} (ID: ${company.id})`);
    }
  }

  async seedUsers() {
    console.log('👥 Seeding users...');
    
    const users = [
      // Company 1 users
      {
        company_id: this.testData.companies[0].id,
        email: 'admin@demo.com',
        password: 'AdminTest123!',
        name: 'Demo Admin',
        role: 'admin',
        email_verified: true,
      },
      {
        company_id: this.testData.companies[0].id,
        email: 'manager@demo.com', 
        password: 'ManagerTest123!',
        name: 'Demo Manager',
        role: 'manager',
        email_verified: true,
      },
      {
        company_id: this.testData.companies[0].id,
        email: 'tech1@demo.com',
        password: 'TechTest123!',
        name: 'John Tech',
        role: 'tech',
        email_verified: true,
      },
      {
        company_id: this.testData.companies[0].id,
        email: 'tech2@demo.com',
        password: 'TechTest123!', 
        name: 'Jane Technician',
        role: 'tech',
        email_verified: true,
      },
      {
        company_id: this.testData.companies[0].id,
        email: 'dispatch@demo.com',
        password: 'DispatchTest123!',
        name: 'Demo Dispatcher',
        role: 'dispatch',
        email_verified: true,
      },
      // Company 2 users
      {
        company_id: this.testData.companies[1].id,
        email: 'owner@test.com',
        password: 'OwnerTest123!',
        name: 'Test Owner',
        role: 'admin',
        email_verified: true,
      },
      {
        company_id: this.testData.companies[1].id,
        email: 'tech@test.com',
        password: 'TechTest123!',
        name: 'Test Tech',
        role: 'tech', 
        email_verified: true,
      },
    ];

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 12);
      
      const result = await run(`
        INSERT INTO users (company_id, email, password_hash, name, role, email_verified, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `, [user.company_id, user.email, hashedPassword, user.name, user.role, user.email_verified]);
      
      user.id = result.id;
      this.testData.users.push(user);
      console.log(`  ✓ Created user: ${user.name} (${user.role}) - ${user.email}`);
    }
  }

  async seedServicePlans() {
    console.log('💰 Seeding service plans...');
    
    const servicePlans = [
      {
        company_id: this.testData.companies[0].id,
        name: 'Basic Maintenance',
        description: 'Monthly sprinkler system maintenance',
        billing_cycle: 'monthly',
        price_cents: 7500, // $75
        service_inclusions: JSON.stringify(['Visual inspection', 'Basic adjustments', 'System testing']),
        max_annual_visits: 12,
        is_active: true,
        is_popular: false,
        priority_level: 1,
        discount_percentage: 0,
      },
      {
        company_id: this.testData.companies[0].id,
        name: 'Premium Care',
        description: 'Comprehensive sprinkler system care with repairs',
        billing_cycle: 'monthly', 
        price_cents: 15000, // $150
        service_inclusions: JSON.stringify(['Full inspection', 'Repairs included', 'Seasonal adjustments', 'Emergency support']),
        max_annual_visits: 24,
        is_active: true,
        is_popular: true,
        priority_level: 2,
        discount_percentage: 0,
      },
      {
        company_id: this.testData.companies[0].id,
        name: 'Annual Package',
        description: 'Yearly maintenance package with discount',
        billing_cycle: 'annual',
        price_cents: 80000, // $800 (save $100)
        service_inclusions: JSON.stringify(['Monthly visits', 'Spring startup', 'Fall winterization', 'Repairs up to $200']),
        max_annual_visits: 12,
        is_active: true,
        is_popular: false,
        priority_level: 1,
        discount_percentage: 10.00,
      },
    ];

    for (const plan of servicePlans) {
      const result = await run(`
        INSERT INTO service_plans (company_id, name, description, billing_cycle, price_cents, 
                                   service_inclusions, max_annual_visits, is_active, is_popular, 
                                   priority_level, discount_percentage, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, [plan.company_id, plan.name, plan.description, plan.billing_cycle, plan.price_cents,
          plan.service_inclusions, plan.max_annual_visits, plan.is_active, plan.is_popular,
          plan.priority_level, plan.discount_percentage]);
      
      plan.id = result.id;
      this.testData.servicePlans.push(plan);
      console.log(`  ✓ Created service plan: ${plan.name} ($${plan.price_cents/100})`);
    }
  }

  async seedClients() {
    console.log('👤 Seeding clients...');
    
    const clients = [
      // Company 1 clients
      {
        company_id: this.testData.companies[0].id,
        name: 'John Smith',
        email: 'john.smith@email.com',
        phone: '(555) 111-2222',
        type: 'residential',
      },
      {
        company_id: this.testData.companies[0].id,
        name: 'Sarah Johnson', 
        email: 'sarah.j@email.com',
        phone: '(555) 333-4444',
        type: 'residential',
      },
      {
        company_id: this.testData.companies[0].id,
        name: 'ABC Corporation',
        email: 'facilities@abccorp.com', 
        phone: '(555) 555-6666',
        type: 'commercial',
      },
      {
        company_id: this.testData.companies[0].id,
        name: 'Green Valley HOA',
        email: 'board@greenvalley.com',
        phone: '(555) 777-8888', 
        type: 'commercial',
      },
      {
        company_id: this.testData.companies[0].id,
        name: 'Mike Wilson',
        email: 'mike.w@email.com',
        phone: '(555) 999-0000',
        type: 'residential',
      },
      // Company 2 clients
      {
        company_id: this.testData.companies[1].id,
        name: 'Test Client',
        email: 'test@client.com',
        phone: '(555) 123-0000',
        type: 'residential',
      },
    ];

    for (const client of clients) {
      const result = await run(`
        INSERT INTO clients (company_id, name, email, phone, type, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `, [client.company_id, client.name, client.email, client.phone, client.type]);
      
      client.id = result.id;
      this.testData.clients.push(client);
      console.log(`  ✓ Created client: ${client.name} (${client.type})`);
    }
  }

  async seedSites() {
    console.log('🏠 Seeding sites...');
    
    const sites = [
      // Residential sites
      {
        company_id: this.testData.companies[0].id,
        client_id: this.testData.clients[0].id, // John Smith
        name: 'Smith Residence',
        address: '123 Maple Street',
        city: 'Springfield',
        state: 'CA',
        zip: '12345',
      },
      {
        company_id: this.testData.companies[0].id,
        client_id: this.testData.clients[1].id, // Sarah Johnson
        name: 'Johnson Home',
        address: '456 Oak Avenue', 
        city: 'Springfield',
        state: 'CA',
        zip: '12346',
      },
      {
        company_id: this.testData.companies[0].id,
        client_id: this.testData.clients[4].id, // Mike Wilson
        name: 'Wilson Property',
        address: '789 Pine Road',
        city: 'Riverside',
        state: 'CA', 
        zip: '12347',
      },
      // Commercial sites
      {
        company_id: this.testData.companies[0].id,
        client_id: this.testData.clients[2].id, // ABC Corporation
        name: 'ABC Corp Headquarters',
        address: '100 Business Plaza',
        city: 'Business District',
        state: 'CA',
        zip: '12350',
      },
      {
        company_id: this.testData.companies[0].id,
        client_id: this.testData.clients[2].id, // ABC Corporation - second site
        name: 'ABC Warehouse Facility',
        address: '200 Industrial Way',
        city: 'Industrial City',
        state: 'CA',
        zip: '12351',
      },
      {
        company_id: this.testData.companies[0].id,
        client_id: this.testData.clients[3].id, // Green Valley HOA
        name: 'Green Valley Common Areas',
        address: '300 Community Drive',
        city: 'Green Valley',
        state: 'CA',
        zip: '12352',
      },
      // Company 2 site
      {
        company_id: this.testData.companies[1].id,
        client_id: this.testData.clients[5].id, // Test Client
        name: 'Test Site',
        address: '999 Test Street',
        city: 'Test City',
        state: 'CA',
        zip: '99999',
      },
    ];

    for (const site of sites) {
      const result = await run(`
        INSERT INTO sites (company_id, client_id, name, address, city, state, zip, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, [site.company_id, site.client_id, site.name, site.address, site.city, site.state, site.zip]);
      
      site.id = result.id;
      this.testData.sites.push(site);
      console.log(`  ✓ Created site: ${site.name}`);
    }
  }

  async seedInspections() {
    console.log('🔍 Seeding inspections...');
    
    const inspections = [
      {
        company_id: this.testData.companies[0].id,
        client_id: this.testData.clients[0].id, // John Smith
        site_id: this.testData.sites[0].id, // Smith Residence
        technician_id: this.testData.users[2].id,  // John Tech
        inspection_type: 'routine',
        status: 'completed',
        priority: 'medium',
        scheduled_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days ago
        completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        overall_condition: 'good',
        technician_notes: 'Found minor issues with zone 3 sprinkler heads',
        estimated_repair_cost_cents: 15000, // $150
        quote_generated: true,
      },
      {
        company_id: this.testData.companies[0].id,
        client_id: this.testData.clients[1].id, // Sarah Johnson
        site_id: this.testData.sites[1].id, // Johnson Home
        technician_id: this.testData.users[3].id,  // Jane Technician
        inspection_type: 'routine',
        status: 'completed',
        priority: 'low',
        scheduled_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days ago
        completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        overall_condition: 'excellent',
        technician_notes: 'System running perfectly, no issues found',
        estimated_repair_cost_cents: 0,
        quote_generated: false,
      },
      {
        company_id: this.testData.companies[0].id,
        client_id: this.testData.clients[4].id, // Mike Wilson
        site_id: this.testData.sites[2].id, // Wilson Property
        technician_id: this.testData.users[2].id,  // John Tech  
        inspection_type: 'maintenance',
        status: 'in_progress',
        priority: 'medium',
        scheduled_date: new Date().toISOString().split('T')[0], // Today
        started_at: new Date().toISOString(),
        overall_condition: 'fair',
        technician_notes: 'Currently working on controller programming',
      },
      {
        company_id: this.testData.companies[0].id,
        client_id: this.testData.clients[2].id, // ABC Corporation
        site_id: this.testData.sites[3].id, // ABC Corp HQ
        technician_id: this.testData.users[3].id,  // Jane Technician
        inspection_type: 'commercial',
        status: 'scheduled',
        priority: 'high',
        scheduled_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
        estimated_duration: 120,
        property_type: 'commercial',
      },
      {
        company_id: this.testData.companies[0].id,
        client_id: this.testData.clients[3].id, // Green Valley HOA
        site_id: this.testData.sites[5].id, // Green Valley
        technician_id: this.testData.users[3].id,  // Jane Technician
        inspection_type: 'routine',
        status: 'completed',
        priority: 'medium',
        scheduled_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
        completed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        overall_condition: 'needs_repair',
        technician_notes: 'Multiple zones need valve repairs, controller needs upgrade',
        estimated_repair_cost_cents: 75000, // $750
        quote_generated: true,
        follow_up_required: true,
        follow_up_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks from now
      },
    ];

    for (const inspection of inspections) {
      const result = await run(`
        INSERT INTO inspections (company_id, client_id, site_id, technician_id, inspection_type, status, 
                               priority, scheduled_date, started_at, completed_at, estimated_duration, 
                               property_type, overall_condition, technician_notes, estimated_repair_cost_cents, 
                               quote_generated, follow_up_required, follow_up_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, [inspection.company_id, inspection.client_id, inspection.site_id, inspection.technician_id,
          inspection.inspection_type, inspection.status, inspection.priority, inspection.scheduled_date,
          inspection.started_at || null, inspection.completed_at || null, inspection.estimated_duration || null,
          inspection.property_type || null, inspection.overall_condition || null, inspection.technician_notes || null,
          inspection.estimated_repair_cost_cents || 0, inspection.quote_generated || false,
          inspection.follow_up_required || false, inspection.follow_up_date || null]);
      
      inspection.id = result.id;
      this.testData.inspections.push(inspection);
      console.log(`  ✓ Created inspection: ${inspection.inspection_type} - ${inspection.status}`);
    }
  }

  async seedEstimates() {
    console.log('💰 Seeding estimates...');
    
    const estimates = [
      {
        company_id: this.testData.companies[0].id,
        site_id: this.testData.sites[0].id, // Smith Residence
        inspection_id: this.testData.inspections[0].id,
        status: 'sent',
        total_cents: 45000, // $450
        sent_at: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
      },
      {
        company_id: this.testData.companies[0].id,
        site_id: this.testData.sites[5].id, // Green Valley
        inspection_id: this.testData.inspections[4].id,
        status: 'approved',
        total_cents: 125000, // $1250
        sent_at: new Date(Date.now() - 86400000 * 10).toISOString(), // 10 days ago
        viewed_at: new Date(Date.now() - 86400000 * 8).toISOString(),  // 8 days ago
        approved_at: new Date(Date.now() - 86400000 * 6).toISOString(), // 6 days ago
      },
      {
        company_id: this.testData.companies[0].id,
        site_id: this.testData.sites[3].id, // ABC Corp HQ
        inspection_id: null, // Direct estimate
        status: 'draft',
        total_cents: 275000, // $2750
      },
    ];

    for (const estimate of estimates) {
      const result = await run(`
        INSERT INTO estimates (company_id, site_id, inspection_id, status, total_cents, sent_at, viewed_at, approved_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || (RANDOM() % 20) || ' days'))
      `, [estimate.company_id, estimate.site_id, estimate.inspection_id, estimate.status, 
          estimate.total_cents, estimate.sent_at, estimate.viewed_at, estimate.approved_at]);
      
      estimate.id = result.id;
      this.testData.estimates.push(estimate);
      console.log(`  ✓ Created estimate: $${estimate.total_cents/100} - ${estimate.status}`);
    }
  }

  async seedWorkOrders() {
    console.log('🔧 Seeding work orders...');
    
    const workOrders = [
      {
        company_id: this.testData.companies[0].id,
        site_id: this.testData.sites[5].id, // Green Valley
        estimate_id: this.testData.estimates[1].id, // Approved estimate
        tech_id: this.testData.users[2].id, // John Tech
        status: 'scheduled',
        checklist_progress: 0,
        before_photos_count: 0,
        after_photos_count: 0,
        scheduled_at: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
      },
      {
        company_id: this.testData.companies[0].id,
        site_id: this.testData.sites[0].id, // Smith Residence
        estimate_id: null, // Emergency work
        tech_id: this.testData.users[3].id, // Jane Technician
        status: 'in_progress',
        checklist_progress: 60,
        before_photos_count: 3,
        after_photos_count: 1,
        scheduled_at: new Date().toISOString(), // Today
      },
      {
        company_id: this.testData.companies[0].id,
        site_id: this.testData.sites[1].id, // Johnson Home
        estimate_id: null,
        tech_id: this.testData.users[2].id, // John Tech
        status: 'completed',
        checklist_progress: 100,
        before_photos_count: 2,
        after_photos_count: 2,
        scheduled_at: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
      },
    ];

    for (const workOrder of workOrders) {
      const result = await run(`
        INSERT INTO work_orders (company_id, site_id, estimate_id, tech_id, status, checklist_progress, 
                                before_photos_count, after_photos_count, scheduled_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, [workOrder.company_id, workOrder.site_id, workOrder.estimate_id, workOrder.tech_id, 
          workOrder.status, workOrder.checklist_progress, workOrder.before_photos_count, 
          workOrder.after_photos_count, workOrder.scheduled_at]);
      
      workOrder.id = result.id;
      this.testData.workOrders.push(workOrder);
      console.log(`  ✓ Created work order: Site ${workOrder.site_id} - ${workOrder.status}`);
    }
  }

  async printTestCredentials() {
    console.log('\n' + '='.repeat(80));
    console.log('🔑 TEST CREDENTIALS FOR MANUAL TESTING');
    console.log('='.repeat(80));
    
    console.log('\n🏢 COMPANY 1: Demo Irrigation Pro');
    console.log('   Website: http://localhost:3008');
    console.log('   Backend: http://localhost:3000');
    console.log('\n👥 User Accounts:');
    
    const company1Users = this.testData.users.filter(u => u.company_id === this.testData.companies[0].id);
    company1Users.forEach(user => {
      console.log(`   📧 ${user.email}`);
      console.log(`      Password: ${user.password}`);
      console.log(`      Role: ${user.role.toUpperCase()}`);
      console.log(`      Name: ${user.name}\n`);
    });

    console.log('🏢 COMPANY 2: Test Sprinkler Services');
    const company2Users = this.testData.users.filter(u => u.company_id === this.testData.companies[1].id);
    company2Users.forEach(user => {
      console.log(`   📧 ${user.email}`);
      console.log(`      Password: ${user.password}`);
      console.log(`      Role: ${user.role.toUpperCase()}`);
      console.log(`      Name: ${user.name}\n`);
    });

    console.log('📊 TEST DATA SUMMARY:');
    console.log(`   Companies: ${this.testData.companies.length}`);
    console.log(`   Users: ${this.testData.users.length}`);
    console.log(`   Clients: ${this.testData.clients.length}`); 
    console.log(`   Sites: ${this.testData.sites.length}`);
    console.log(`   Service Plans: ${this.testData.servicePlans.length}`);
    console.log(`   Inspections: ${this.testData.inspections.length}`);
    console.log(`   Estimates: ${this.testData.estimates.length}`);
    console.log(`   Work Orders: ${this.testData.workOrders.length}`);
    
    console.log('\n🚀 QUICK START:');
    console.log('   1. Start backend: cd backend && npm start');
    console.log('   2. Start frontend: cd frontend && npm run dev');
    console.log('   3. Visit: http://localhost:3008');
    console.log('   4. Login with any of the credentials above');
    console.log('   5. Test the complete workflow!');
    console.log('\n' + '='.repeat(80));
  }

  async getDataCounts() {
    const counts = {};
    
    const tables = ['companies', 'users', 'clients', 'sites', 'inspections', 'estimates', 'work_orders', 'service_plans'];
    
    for (const table of tables) {
      try {
        const result = await get(`SELECT COUNT(*) as count FROM ${table}`);
        counts[table] = result.count;
      } catch (error) {
        counts[table] = 0;
      }
    }
    
    return counts;
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const seeder = new TestDataSeeder();
  
  try {
    switch (command) {
      case 'seed':
      case undefined:
        await seeder.seedAllData();
        break;
        
      case 'clear':
        await seeder.clearExistingData();
        console.log('✅ Test data cleared successfully');
        break;
        
      case 'status':
        const counts = await seeder.getDataCounts();
        console.log('📊 Current data counts:');
        Object.entries(counts).forEach(([table, count]) => {
          console.log(`   ${table}: ${count}`);
        });
        break;
        
      case 'credentials':
        await seeder.printTestCredentials();
        break;
        
      default:
        console.log(`
🌱 Test Data Seeder

Usage:
  node seed-test-data.js [command]

Commands:
  seed        Seed all test data (default)
  clear       Clear all test data
  status      Show current data counts  
  credentials Show test login credentials

Examples:
  node seed-test-data.js seed
  node seed-test-data.js clear
  node seed-test-data.js status
        `);
    }
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TestDataSeeder;