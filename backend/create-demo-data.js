const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function createDemoData() {
  console.log('🔧 Creating comprehensive demo data...');
  
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
    
    // Get tech user ID
    const tech = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE email = ? AND company_id = ?', ['tech@demo.com', companyId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    const techId = tech?.id || 1;
    console.log(`✅ Using tech ID: ${techId}`);
    
    // Create demo clients
    const clients = [
      { name: 'Green Valley Apartments', email: 'manager@greenvalley.com', phone: '555-0123', type: 'commercial' },
      { name: 'Smith Residence', email: 'john.smith@email.com', phone: '555-0124', type: 'residential' },
      { name: 'City Park District', email: 'parks@city.gov', phone: '555-0125', type: 'commercial' },
      { name: 'Sunset Shopping Center', email: 'maintenance@sunset.com', phone: '555-0126', type: 'commercial' },
      { name: 'Johnson Family', email: 'johnson@email.com', phone: '555-0127', type: 'residential' }
    ];
    
    console.log('Creating clients...');
    for (const client of clients) {
      await new Promise((resolve, reject) => {
        db.run(`INSERT OR IGNORE INTO clients (company_id, name, email, phone, type, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
               [companyId, client.name, client.email, client.phone, client.type],
               function(err) {
                 if (err) reject(err);
                 else {
                   console.log(`✅ Created client: ${client.name}`);
                   resolve();
                 }
               });
      });
    }
    
    // Get created clients
    const createdClients = await new Promise((resolve, reject) => {
      db.all('SELECT id, name FROM clients WHERE company_id = ?', [companyId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    // Create demo sites
    console.log('Creating sites...');
    const sites = [
      { clientIdx: 0, name: 'Building A - Pool Area', address: '123 Green Valley Dr, Austin, TX' },
      { clientIdx: 0, name: 'Building B - Courtyard', address: '125 Green Valley Dr, Austin, TX' },
      { clientIdx: 1, name: 'Front Yard', address: '456 Oak Street, Austin, TX' },
      { clientIdx: 1, name: 'Backyard Garden', address: '456 Oak Street, Austin, TX' },
      { clientIdx: 2, name: 'Memorial Park - Zone 1', address: '789 Park Blvd, Austin, TX' },
      { clientIdx: 2, name: 'Memorial Park - Zone 2', address: '789 Park Blvd, Austin, TX' },
      { clientIdx: 3, name: 'Main Parking Lot', address: '321 Sunset Blvd, Austin, TX' },
      { clientIdx: 4, name: 'Garden Sprinklers', address: '654 Pine Ave, Austin, TX' }
    ];
    
    const siteIds = [];
    for (const site of sites) {
      const clientId = createdClients[site.clientIdx]?.id;
      if (clientId) {
        const result = await new Promise((resolve, reject) => {
          db.run(`INSERT INTO sites (company_id, client_id, name, address, created_at, updated_at)
                  VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
                 [companyId, clientId, site.name, site.address],
                 function(err) {
                   if (err) reject(err);
                   else {
                     console.log(`✅ Created site: ${site.name}`);
                     resolve(this.lastID);
                   }
                 });
        });
        siteIds.push(result);
      }
    }
    
    // Create demo inspections
    console.log('Creating inspections...');
    const inspectionStatuses = ['completed', 'completed', 'draft', 'completed', 'completed'];
    const issuesCounts = [3, 0, 5, 2, 1];
    
    for (let i = 0; i < Math.min(5, siteIds.length); i++) {
      await new Promise((resolve, reject) => {
        db.run(`INSERT INTO inspections (company_id, site_id, tech_id, status, issues_count, has_estimate, pdf_ready, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '-' + ? + ' days'), datetime('now'))`,
               [companyId, siteIds[i], techId, inspectionStatuses[i], issuesCounts[i], issuesCounts[i] > 0 ? 1 : 0, 1, i + 1],
               function(err) {
                 if (err) reject(err);
                 else {
                   console.log(`✅ Created inspection for site ${siteIds[i]}`);
                   resolve();
                 }
               });
      });
    }
    
    // Create demo estimates
    console.log('Creating estimates...');
    const estimateData = [
      { siteIdx: 0, status: 'sent', total: 245000 }, // $2,450
      { siteIdx: 1, status: 'approved', total: 89500 }, // $895
      { siteIdx: 2, status: 'draft', total: 156000 }, // $1,560
      { siteIdx: 3, status: 'approved', total: 320000 }, // $3,200
      { siteIdx: 4, status: 'declined', total: 78000 } // $780
    ];
    
    for (let i = 0; i < Math.min(estimateData.length, siteIds.length); i++) {
      const estimate = estimateData[i];
      await new Promise((resolve, reject) => {
        db.run(`INSERT INTO estimates (company_id, site_id, status, total_cents, sent_at, approved_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-' + ? + ' days'), datetime('now'))`,
               [companyId, siteIds[i], estimate.status, estimate.total, 
                estimate.status !== 'draft' ? `datetime('now', '-${i + 1} days')` : null,
                estimate.status === 'approved' ? `datetime('now', '-${i} days')` : null,
                i + 1],
               function(err) {
                 if (err) reject(err);
                 else {
                   console.log(`✅ Created ${estimate.status} estimate: $${estimate.total / 100}`);
                   resolve();
                 }
               });
      });
    }
    
    // Create demo work orders
    console.log('Creating work orders...');
    const workOrders = [
      { siteIdx: 1, status: 'completed', scheduled: -2 },
      { siteIdx: 3, status: 'in_progress', scheduled: 0 },
      { siteIdx: 0, status: 'scheduled', scheduled: 1 },
      { siteIdx: 2, status: 'scheduled', scheduled: 3 }
    ];
    
    for (let i = 0; i < Math.min(workOrders.length, siteIds.length); i++) {
      const wo = workOrders[i];
      await new Promise((resolve, reject) => {
        db.run(`INSERT INTO work_orders (company_id, site_id, tech_id, status, scheduled_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, datetime('now', '${wo.scheduled} days'), datetime('now'), datetime('now'))`,
               [companyId, siteIds[wo.siteIdx], techId, wo.status],
               function(err) {
                 if (err) reject(err);
                 else {
                   console.log(`✅ Created ${wo.status} work order`);
                   resolve();
                 }
               });
      });
    }
    
    console.log('🎉 Demo data created successfully!');
    
    // Show summary
    const summary = await new Promise((resolve, reject) => {
      const queries = [
        'SELECT COUNT(*) as count FROM clients WHERE company_id = ?',
        'SELECT COUNT(*) as count FROM sites WHERE company_id = ?',
        'SELECT COUNT(*) as count FROM inspections WHERE company_id = ?',
        'SELECT COUNT(*) as count FROM estimates WHERE company_id = ?',
        'SELECT COUNT(*) as count FROM work_orders WHERE company_id = ?'
      ];
      
      Promise.all(queries.map(query => 
        new Promise((res, rej) => {
          db.get(query, [companyId], (err, row) => {
            if (err) rej(err);
            else res(row.count);
          });
        })
      )).then(counts => {
        resolve({
          clients: counts[0],
          sites: counts[1],
          inspections: counts[2],
          estimates: counts[3],
          work_orders: counts[4]
        });
      }).catch(reject);
    });
    
    console.log('\n📊 Summary:');
    console.log(`   Clients: ${summary.clients}`);
    console.log(`   Sites: ${summary.sites}`);
    console.log(`   Inspections: ${summary.inspections}`);
    console.log(`   Estimates: ${summary.estimates}`);
    console.log(`   Work Orders: ${summary.work_orders}`);
    
  } catch (error) {
    console.error('❌ Error creating demo data:', error);
  } finally {
    db.close();
  }
}

createDemoData();