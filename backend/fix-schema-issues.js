const { run, query } = require('./src/database/sqlite');

async function fixSchemaIssues() {
  console.log('🔧 FIXING DATABASE SCHEMA ISSUES...\n');

  try {
    // Issue 1: Add technician_id column to work_orders table (alias for tech_id)
    console.log('1. Adding technician_id column to work_orders table...');
    await run('ALTER TABLE work_orders ADD COLUMN technician_id INTEGER');
    
    // Copy data from tech_id to technician_id
    await run('UPDATE work_orders SET technician_id = tech_id WHERE tech_id IS NOT NULL');
    
    console.log('   ✅ technician_id column added and populated');

    // Issue 2: Add is_popular column to service_plans table
    console.log('2. Adding is_popular column to service_plans table...');
    await run('ALTER TABLE service_plans ADD COLUMN is_popular BOOLEAN DEFAULT 0');
    
    // Set some service plans as popular based on priority_level
    await run(`
      UPDATE service_plans 
      SET is_popular = 1 
      WHERE priority_level <= 2 OR name LIKE '%Premium%' OR name LIKE '%Pro%'
    `);
    
    console.log('   ✅ is_popular column added and populated');

    // Issue 3: Add commission_rate column if it doesn't exist
    console.log('3. Checking for commission_rate column...');
    const servicePlansSchema = await query('PRAGMA table_info(service_plans)');
    const hasCommissionRate = servicePlansSchema.some(col => col.name === 'commission_rate');
    
    if (!hasCommissionRate) {
      await run('ALTER TABLE service_plans ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 0.10');
      console.log('   ✅ commission_rate column added');
    } else {
      console.log('   ✅ commission_rate column already exists');
    }

    // Verify the fixes
    console.log('\n🔍 VERIFYING FIXES...\n');
    
    console.log('--- WORK_ORDERS TABLE (updated) ---');
    const updatedWorkOrdersSchema = await query('PRAGMA table_info(work_orders)');
    const workOrdersCols = updatedWorkOrdersSchema.map(col => col.name).join(', ');
    console.log('Columns:', workOrdersCols);
    console.log('✓ technician_id present:', updatedWorkOrdersSchema.some(col => col.name === 'technician_id'));
    
    console.log('\n--- SERVICE_PLANS TABLE (updated) ---');
    const updatedServicePlansSchema = await query('PRAGMA table_info(service_plans)');
    const servicePlansCols = updatedServicePlansSchema.map(col => col.name).join(', ');
    console.log('Columns:', servicePlansCols);
    console.log('✓ is_popular present:', updatedServicePlansSchema.some(col => col.name === 'is_popular'));
    console.log('✓ commission_rate present:', updatedServicePlansSchema.some(col => col.name === 'commission_rate'));

    // Test the problematic queries
    console.log('\n🧪 TESTING FIXED QUERIES...\n');
    
    try {
      const testWorkOrders = await query(`
        SELECT 
          wo.id,
          wo.status,
          wo.scheduled_at,
          wo.technician_id
        FROM work_orders wo
        WHERE wo.company_id = 6 AND wo.technician_id = 27
        LIMIT 5
      `);
      console.log('✅ Work orders query test: SUCCESS');
      console.log(`   Found ${testWorkOrders.length} work orders for technician 27`);
    } catch (error) {
      console.log('❌ Work orders query test: FAILED');
      console.log('   Error:', error.message);
    }

    try {
      const testServicePlans = await query(`
        SELECT 
          id,
          name,
          is_popular,
          commission_rate
        FROM service_plans 
        WHERE company_id = 6 AND is_active = 1
        ORDER BY is_popular DESC, price_cents ASC
        LIMIT 5
      `);
      console.log('✅ Service plans query test: SUCCESS');
      console.log(`   Found ${testServicePlans.length} active service plans`);
      console.log('   Popular plans:', testServicePlans.filter(p => p.is_popular).length);
    } catch (error) {
      console.log('❌ Service plans query test: FAILED');
      console.log('   Error:', error.message);
    }

    console.log('\n🎉 SCHEMA FIXES COMPLETED SUCCESSFULLY!\n');

  } catch (error) {
    console.error('❌ Error fixing schema issues:', error);
    throw error;
  }
}

// Run the fixes
fixSchemaIssues()
  .then(() => {
    console.log('✅ All schema issues have been resolved!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to fix schema issues:', error);
    process.exit(1);
  });