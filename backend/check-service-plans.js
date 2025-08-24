const { query, run } = require('./src/database/sqlite');

async function checkAndFixServicePlans() {
  console.log('🔍 CHECKING SERVICE PLANS DATA...\n');
  
  const plans = await query('SELECT id, name, service_inclusions FROM service_plans WHERE company_id = 6');
  
  console.log(`Found ${plans.length} service plans for company 6:\n`);
  
  for (const plan of plans) {
    console.log(`Plan ${plan.id}: ${plan.name}`);
    console.log('service_inclusions:', plan.service_inclusions);
    
    try {
      JSON.parse(plan.service_inclusions || '[]');
      console.log('✅ Valid JSON\n');
    } catch (e) {
      console.log('❌ Invalid JSON:', e.message);
      
      // Fix the invalid JSON by converting to array
      const fixedInclusions = JSON.stringify([plan.service_inclusions || '']);
      await run('UPDATE service_plans SET service_inclusions = ? WHERE id = ?', [fixedInclusions, plan.id]);
      console.log('🔧 Fixed by wrapping in array\n');
    }
  }
  
  console.log('✅ Service plans data check complete!');
}

checkAndFixServicePlans().catch(console.error);