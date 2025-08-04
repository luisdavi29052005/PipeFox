
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

const API_BASE = 'http://localhost:5000/api';

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(color + message + colors.reset);
}

class APITester {
  constructor(token) {
    this.token = token;
    this.testsPassed = 0;
    this.testsFailed = 0;
  }

  async request(method, endpoint, body = null) {
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    return await fetch(`${API_BASE}${endpoint}`, options);
  }

  async test(name, testFn) {
    try {
      log(colors.blue, `\n🧪 Testing: ${name}`);
      await testFn();
      this.testsPassed++;
      log(colors.green, `✅ PASS: ${name}`);
    } catch (error) {
      this.testsFailed++;
      log(colors.red, `❌ FAIL: ${name}`);
      log(colors.red, `   Error: ${error.message}`);
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  async runAllTests() {
    log(colors.yellow, '🚀 Starting API Tests...\n');

    // Test Health endpoint
    await this.test('Health Check', async () => {
      const resp = await fetch('http://localhost:5000/health');
      const data = await resp.json();
      this.assert(resp.status === 200, 'Health check should return 200');
      this.assert(data.ok === true, 'Health check should return ok: true');
    });

    // Test Authentication
    await this.test('Authentication Required', async () => {
      const resp = await fetch(`${API_BASE}/accounts`);
      this.assert(resp.status === 401, 'Should require authentication');
    });

    // Test Accounts API
    let accountId;
    await this.test('Create Account', async () => {
      const resp = await this.request('POST', '/accounts', { name: 'Test Account' });
      const data = await resp.json();
      this.assert(resp.status === 200, 'Should create account successfully');
      this.assert(data.name === 'Test Account', 'Account name should match');
      this.assert(data.status === 'not_ready', 'Account should start as not_ready');
      accountId = data.id;
    });

    await this.test('Create Account - Validation Error', async () => {
      const resp = await this.request('POST', '/accounts', { name: '' });
      this.assert(resp.status === 400, 'Should reject empty name');
    });

    await this.test('List Accounts', async () => {
      const resp = await this.request('GET', '/accounts');
      const data = await resp.json();
      this.assert(resp.status === 200, 'Should list accounts');
      this.assert(Array.isArray(data), 'Should return array');
      this.assert(data.length > 0, 'Should have at least one account');
    });

    await this.test('Account Login', async () => {
      const resp = await this.request('POST', `/accounts/${accountId}/login`);
      const data = await resp.json();
      this.assert(resp.status === 200, 'Should initiate login');
      this.assert(data.msg, 'Should return message');
    });

    await this.test('Account Logout', async () => {
      const resp = await this.request('POST', `/accounts/${accountId}/logout`);
      const data = await resp.json();
      this.assert(resp.status === 200, 'Should logout successfully');
    });

    // Test Workflows API
    let workflowId;
    await this.test('Create Workflow', async () => {
      const resp = await this.request('POST', '/workflows', {
        account_id: accountId,
        group_url: 'https://www.facebook.com/groups/123456789',
        webhook_url: 'http://localhost:5678/webhook/test',
        keywords: ['test', 'keyword']
      });
      const data = await resp.json();
      this.assert(resp.status === 200, 'Should create workflow');
      this.assert(data.account_id === accountId, 'Account ID should match');
      this.assert(data.status === 'created', 'Workflow should start as created');
      workflowId = data.id;
    });

    await this.test('Create Workflow - Validation Error', async () => {
      const resp = await this.request('POST', '/workflows', {
        account_id: accountId,
        group_url: 'invalid-url'
      });
      this.assert(resp.status === 400, 'Should reject invalid group URL');
    });

    await this.test('List Workflows', async () => {
      const resp = await this.request('GET', '/workflows');
      const data = await resp.json();
      this.assert(resp.status === 200, 'Should list workflows');
      this.assert(Array.isArray(data), 'Should return array');
      this.assert(data.length > 0, 'Should have at least one workflow');
    });

    await this.test('Start Workflow - Account Not Ready', async () => {
      const resp = await this.request('POST', `/workflows/${workflowId}/start`);
      // This should fail because account is not ready
      this.assert(resp.status === 400, 'Should reject workflow start when account not ready');
    });

    // Simulate account ready
    await this.test('Simulate Account Ready & Start Workflow', async () => {
      // First set account as ready (simulating login completion)
      const { supabase } = require('../src/supabaseClient');
      await supabase.from('accounts').update({ status: 'ready' }).eq('id', accountId);
      
      const resp = await this.request('POST', `/workflows/${workflowId}/start`);
      const data = await resp.json();
      this.assert(resp.status === 200, 'Should start workflow when account is ready');
      this.assert(data.msg.includes('started'), 'Should return success message');
    });

    await this.test('Stop Workflow', async () => {
      const resp = await this.request('POST', `/workflows/${workflowId}/stop`);
      const data = await resp.json();
      this.assert(resp.status === 200, 'Should stop workflow');
      this.assert(data.msg.includes('stopped'), 'Should return success message');
    });

    // Security Tests
    await this.test('Workflow Access Control', async () => {
      // Try to access workflow with different user token (should fail)
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlLXVzZXIifQ.fake';
      const resp = await fetch(`${API_BASE}/workflows/${workflowId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${fakeToken}`,
          'Content-Type': 'application/json',
        }
      });
      this.assert(resp.status === 401, 'Should reject invalid token');
    });

    // Print results
    const total = this.testsPassed + this.testsFailed;
    log(colors.yellow, `\n📊 Test Results:`);
    log(colors.green, `✅ Passed: ${this.testsPassed}/${total}`);
    if (this.testsFailed > 0) {
      log(colors.red, `❌ Failed: ${this.testsFailed}/${total}`);
    }
    
    if (this.testsFailed === 0) {
      log(colors.green, '\n🎉 All tests passed!');
    } else {
      log(colors.red, '\n💥 Some tests failed!');
      process.exit(1);
    }
  }
}

// Função principal
async function runTests() {
  const token = process.env.TEST_TOKEN;
  
  if (!token) {
    log(colors.red, 'ERROR: TEST_TOKEN environment variable is required');
    log(colors.yellow, 'Run: node test/getToken.js email password');
    log(colors.yellow, 'Then: TEST_TOKEN=your_token node test/api-test.js');
    process.exit(1);
  }

  const tester = new APITester(token);
  await tester.runAllTests();
}

// Execute tests
if (require.main === module) {
  runTests().catch(err => {
    log(colors.red, `Fatal error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { APITester };
