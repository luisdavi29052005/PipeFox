
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function setupTestEnvironment() {
  console.log('🔧 Setting up test environment...');
  
  // Check environment variables
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY'
  ];
  
  const missing = requiredEnvVars.filter(env => !process.env[env]);
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    console.log('\n📝 Create a .env file with:');
    console.log('SUPABASE_URL=your_supabase_url');
    console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
    console.log('SUPABASE_ANON_KEY=your_anon_key');
    console.log('CHROME_USER_DATA_DIR=./sessions/testtenant');
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
    if (error && !error.message.includes('does not exist')) {
      console.error('❌ Supabase connection failed:', error.message);
      process.exit(1);
    }
    console.log('✅ Supabase connection OK');
  } catch (err) {
    console.error('❌ Supabase setup error:', err.message);
    process.exit(1);
  }
  
  // Check/create Chrome user data directory
  const chromeDir = process.env.CHROME_USER_DATA_DIR || './sessions/testtenant';
  if (!fs.existsSync(chromeDir)) {
    console.log('📁 Creating Chrome user data directory...');
    fs.mkdirSync(chromeDir, { recursive: true });
  }
  console.log('✅ Chrome user data directory OK');
  
  // Check if server is running
  try {
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const response = await fetch('http://localhost:5000/health');
    if (response.ok) {
      console.log('✅ Server is running');
    } else {
      console.log('⚠️  Server not responding correctly');
    }
  } catch (err) {
    console.log('⚠️  Server not running. Start it with: npm run dev');
  }
  
  console.log('🎉 Test environment setup complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Make sure server is running: npm run dev');
  console.log('2. Get a test token: node test/getToken.js your@email.com password');
  console.log('3. Run API tests: TEST_TOKEN=your_token node test/api-test.js');
  console.log('4. Run load tests: TEST_TOKEN=your_token node test/load-test.js');
}

if (require.main === module) {
  setupTestEnvironment().catch(err => {
    console.error('Setup failed:', err.message);
    process.exit(1);
  });
}

module.exports = { setupTestEnvironment };
