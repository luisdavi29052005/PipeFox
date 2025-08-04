
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function setupTestEnvironment() {
  console.log('🔧 Setting up test environment...');
  
  // Check environment variables
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CHROME_USER_DATA_DIR'
  ];
  
  const missing = requiredEnvVars.filter(env => !process.env[env]);
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    process.exit(1);
  }
  
  // Test Supabase connection
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Test connection by trying to read from accounts table
    const { data, error } = await supabase.from('accounts').select('count').limit(1);
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      process.exit(1);
    }
    console.log('✅ Supabase connection OK');
  } catch (err) {
    console.error('❌ Supabase setup error:', err.message);
    process.exit(1);
  }
  
  // Check if Chrome user data directory exists
  const fs = require('fs');
  if (!fs.existsSync(process.env.CHROME_USER_DATA_DIR)) {
    console.log('📁 Creating Chrome user data directory...');
    fs.mkdirSync(process.env.CHROME_USER_DATA_DIR, { recursive: true });
  }
  console.log('✅ Chrome user data directory OK');
  
  console.log('🎉 Test environment setup complete!');
  console.log('\nNext steps:');
  console.log('1. Get a test token: node test/getToken.js your@email.com password');
  console.log('2. Run API tests: TEST_TOKEN=your_token node test/api-test.js');
  console.log('3. Run load tests: TEST_TOKEN=your_token node test/load-test.js');
}

if (require.main === module) {
  setupTestEnvironment().catch(console.error);
}
