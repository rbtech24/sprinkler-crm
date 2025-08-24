const { initDatabase, run, query } = require('./sqlite');
const { hashPassword } = require('../middleware/auth');

const seedData = async () => {
  console.log('🌱 Seeding database with sample data...');

  try {
    // Initialize database first
    await initDatabase();

    // Check if data already exists
    const existingCompanies = await query('SELECT COUNT(*) as count FROM companies');
    if (existingCompanies[0].count > 0) {
      console.log('📊 Database already has data, skipping seed');
      return;
    }

    // Create sample companies
    const companies = [
      {
        name: 'AquaTech Solutions',
        plan: 'pro',
        email: 'admin@aquatech.com',
        phone: '(555) 123-4567',
        website: 'https://aquatech.com',
      },
      {
        name: 'Green Valley Irrigation',
        plan: 'starter',
        email: 'contact@greenvalley.com',
        phone: '(555) 234-5678',
      },
      {
        name: 'Premier Sprinkler Co',
        plan: 'enterprise',
        email: 'info@premiersprinkler.com',
        phone: '(555) 345-6789',
        website: 'https://premiersprinkler.com',
      },
    ];

    const companyIds = [];
    for (const company of companies) {
      const result = await run(
        'INSERT INTO companies (name, plan, email, phone, website) VALUES (?, ?, ?, ?, ?)',
        [company.name, company.plan, company.email, company.phone, company.website],
      );
      companyIds.push(result.id);
      console.log(`✅ Created company: ${company.name}`);
    }

    // Create sample users
    const users = [
      // AquaTech Solutions users
      {
        company_id: companyIds[0],
        email: 'admin@demo.com',
        password: 'password',
        name: 'Sarah Johnson',
        role: 'owner',
      },
      {
        company_id: companyIds[0],
        email: 'mike.tech@aquatech.com',
        password: 'password',
        name: 'Mike Rodriguez',
        role: 'tech',
      },
      {
        company_id: companyIds[0],
        email: 'lisa.dispatch@aquatech.com',
        password: 'password',
        name: 'Lisa Chen',
        role: 'dispatcher',
      },
      // Green Valley users
      {
        company_id: companyIds[1],
        email: 'owner@greenvalley.com',
        password: 'password',
        name: 'Bob Smith',
        role: 'owner',
      },
      {
        company_id: companyIds[1],
        email: 'tech@greenvalley.com',
        password: 'password',
        name: 'Maria Garcia',
        role: 'tech',
      },
      // Premier Sprinkler users
      {
        company_id: companyIds[2],
        email: 'admin@premiersprinkler.com',
        password: 'password',
        name: 'David Wilson',
        role: 'owner',
      },
    ];

    const userIds = [];
    for (const user of users) {
      const hashedPassword = await hashPassword(user.password);
      const result = await run(
        'INSERT INTO users (company_id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)',
        [user.company_id, user.email, hashedPassword, user.name, user.role],
      );
      userIds.push(result.id);
      console.log(`✅ Created user: ${user.name} (${user.email})`);
    }

    // Create sample clients
    const clients = [
      // AquaTech clients
      {
        company_id: companyIds[0],
        name: 'Sunset Shopping Center',
        email: 'facilities@sunset.com',
        phone: '(555) 111-2222',
        type: 'commercial',
      },
      {
        company_id: companyIds[0],
        name: 'City Park District',
        email: 'maintenance@cityparks.gov',
        phone: '(555) 333-4444',
        type: 'municipal',
      },
      {
        company_id: companyIds[0],
        name: 'Green Valley Apartments',
        email: 'manager@gvapts.com',
        phone: '(555) 555-6666',
        type: 'residential',
      },
      // Green Valley clients
      {
        company_id: companyIds[1],
        name: 'Oak Ridge HOA',
        email: 'board@oakridge.com',
        phone: '(555) 777-8888',
        type: 'residential',
      },
      {
        company_id: companyIds[1],
        name: 'Metro Office Complex',
        email: 'property@metro.com',
        phone: '(555) 999-0000',
        type: 'commercial',
      },
    ];

    const clientIds = [];
    for (const client of clients) {
      const result = await run(
        'INSERT INTO clients (company_id, name, email, phone, type) VALUES (?, ?, ?, ?, ?)',
        [client.company_id, client.name, client.email, client.phone, client.type],
      );
      clientIds.push(result.id);
      console.log(`✅ Created client: ${client.name}`);
    }

    // Create sample sites
    const sites = [
      // Sunset Shopping Center sites
      {
        company_id: companyIds[0],
        client_id: clientIds[0],
        name: 'Main Parking Lot',
        address: '123 Sunset Blvd',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90210',
      },
      {
        company_id: companyIds[0],
        client_id: clientIds[0],
        name: 'Food Court Area',
        address: '123 Sunset Blvd',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90210',
      },
      // City Park District sites
      {
        company_id: companyIds[0],
        client_id: clientIds[1],
        name: 'Memorial Park - Zone 3',
        address: '456 Park Ave',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90211',
      },
      {
        company_id: companyIds[0],
        client_id: clientIds[1],
        name: 'Sports Complex Field A',
        address: '789 Athletic Dr',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90212',
      },
      // Green Valley Apartments sites
      {
        company_id: companyIds[0],
        client_id: clientIds[2],
        name: 'Building A - Pool Area',
        address: '321 Valley Rd',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90213',
      },
    ];

    const siteIds = [];
    for (const site of sites) {
      const result = await run(
        'INSERT INTO sites (company_id, client_id, name, address, city, state, zip) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [site.company_id, site.client_id, site.name, site.address, site.city, site.state, site.zip],
      );
      siteIds.push(result.id);
      console.log(`✅ Created site: ${site.name}`);
    }

    // Create sample inspections
    const inspections = [
      {
        company_id: companyIds[0],
        site_id: siteIds[0],
        tech_id: userIds[1], // Mike Rodriguez
        status: 'completed',
        issues_count: 3,
        has_estimate: 1,
        pdf_ready: 1,
      },
      {
        company_id: companyIds[0],
        site_id: siteIds[2],
        tech_id: userIds[1], // Mike Rodriguez
        status: 'completed',
        issues_count: 1,
        has_estimate: 0,
        pdf_ready: 1,
      },
      {
        company_id: companyIds[0],
        site_id: siteIds[4],
        tech_id: userIds[1], // Mike Rodriguez
        status: 'in_progress',
        issues_count: 5,
        has_estimate: 1,
        pdf_ready: 0,
      },
    ];

    const inspectionIds = [];
    for (const inspection of inspections) {
      const result = await run(
        'INSERT INTO inspections (company_id, site_id, tech_id, status, issues_count, has_estimate, pdf_ready) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [inspection.company_id, inspection.site_id, inspection.tech_id, inspection.status, inspection.issues_count, inspection.has_estimate, inspection.pdf_ready],
      );
      inspectionIds.push(result.id);
      console.log(`✅ Created inspection for site ID: ${inspection.site_id}`);
    }

    // Create sample estimates
    const estimates = [
      {
        company_id: companyIds[0],
        site_id: siteIds[0],
        inspection_id: inspectionIds[0],
        status: 'sent',
        total_cents: 248500, // $2,485.00
        sent_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        viewed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      },
      {
        company_id: companyIds[0],
        site_id: siteIds[4],
        inspection_id: inspectionIds[2],
        status: 'approved',
        total_cents: 156000, // $1,560.00
        sent_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        viewed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        approved_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    const estimateIds = [];
    for (const estimate of estimates) {
      const result = await run(
        'INSERT INTO estimates (company_id, site_id, inspection_id, status, total_cents, sent_at, viewed_at, approved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [estimate.company_id, estimate.site_id, estimate.inspection_id, estimate.status, estimate.total_cents, estimate.sent_at, estimate.viewed_at, estimate.approved_at],
      );
      estimateIds.push(result.id);
      console.log(`✅ Created estimate: $${estimate.total_cents / 100}`);
    }

    // Create sample work orders
    const workOrders = [
      {
        company_id: companyIds[0],
        site_id: siteIds[4],
        estimate_id: estimateIds[1],
        tech_id: userIds[1], // Mike Rodriguez
        status: 'scheduled',
        checklist_progress: 0,
        before_photos_count: 0,
        after_photos_count: 0,
        scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
      },
    ];

    for (const workOrder of workOrders) {
      await run(
        'INSERT INTO work_orders (company_id, site_id, estimate_id, tech_id, status, checklist_progress, before_photos_count, after_photos_count, scheduled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [workOrder.company_id, workOrder.site_id, workOrder.estimate_id, workOrder.tech_id, workOrder.status, workOrder.checklist_progress, workOrder.before_photos_count, workOrder.after_photos_count, workOrder.scheduled_at],
      );
      console.log(`✅ Created work order for site ID: ${workOrder.site_id}`);
    }

    console.log('🎉 Database seeded successfully!');
    console.log('\n📊 Sample Data Created:');
    console.log(`- ${companies.length} companies`);
    console.log(`- ${users.length} users`);
    console.log(`- ${clients.length} clients`);
    console.log(`- ${sites.length} sites`);
    console.log(`- ${inspections.length} inspections`);
    console.log(`- ${estimates.length} estimates`);
    console.log(`- ${workOrders.length} work orders`);
    console.log('\n🔑 Demo Login:');
    console.log('Email: admin@demo.com');
    console.log('Password: password');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
};

// Run if called directly
if (require.main === module) {
  seedData();
}

module.exports = { seedData };
