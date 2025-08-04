
import { config } from 'dotenv';

config();

const API_BASE = 'http://localhost:5000/api';

class LoadTester {
  constructor(token, options = {}) {
    this.token = token;
    this.concurrency = options.concurrency || 10;
    this.duration = options.duration || 30000; // 30 seconds
    this.results = {
      requests: 0,
      errors: 0,
      responseTimes: []
    };
  }

  async request(endpoint, method = 'GET', body = null) {
    const fetch = (await import('node-fetch')).default;
    const start = Date.now();
    
    try {
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

      const response = await fetch(`${API_BASE}${endpoint}`, options);
      const responseTime = Date.now() - start;
      
      this.results.requests++;
      this.results.responseTimes.push(responseTime);
      
      if (!response.ok) {
        this.results.errors++;
      }
      
      return response;
    } catch (error) {
      this.results.errors++;
      this.results.requests++;
      return null;
    }
  }

  async runWorker() {
    const endTime = Date.now() + this.duration;
    
    while (Date.now() < endTime) {
      // Simulate different API calls
      const randomEndpoint = Math.random();
      
      if (randomEndpoint < 0.4) {
        await this.request('/accounts');
      } else if (randomEndpoint < 0.7) {
        await this.request('/workflows');
      } else {
        // Create account test
        await this.request('/accounts', 'POST', { 
          name: `Test Account ${Date.now()}` 
        });
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  async run() {
    console.log(`🚀 Starting load test...`);
    console.log(`   Concurrency: ${this.concurrency}`);
    console.log(`   Duration: ${this.duration}ms`);
    
    const workers = Array(this.concurrency).fill().map(() => this.runWorker());
    
    await Promise.all(workers);
    
    // Calculate statistics
    const avgResponseTime = this.results.responseTimes.reduce((a, b) => a + b, 0) / this.results.responseTimes.length;
    const maxResponseTime = Math.max(...this.results.responseTimes);
    const minResponseTime = Math.min(...this.results.responseTimes);
    const errorRate = (this.results.errors / this.results.requests) * 100;
    const requestsPerSecond = this.results.requests / (this.duration / 1000);
    
    console.log('\n📊 Load Test Results:');
    console.log(`   Total Requests: ${this.results.requests}`);
    console.log(`   Errors: ${this.results.errors} (${errorRate.toFixed(2)}%)`);
    console.log(`   Requests/Second: ${requestsPerSecond.toFixed(2)}`);
    console.log(`   Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   Min Response Time: ${minResponseTime}ms`);
    console.log(`   Max Response Time: ${maxResponseTime}ms`);

    if (errorRate > 5) {
      console.log('⚠️  High error rate detected');
    }
    if (avgResponseTime > 1000) {
      console.log('⚠️  High response times detected');
    }
  }
}

async function runLoadTest() {
  const token = process.env.TEST_TOKEN;
  
  if (!token) {
    console.error('ERROR: TEST_TOKEN environment variable is required');
    console.log('Get token: node test/getToken.js email password');
    process.exit(1);
  }

  const tester = new LoadTester(token, {
    concurrency: 5,
    duration: 10000 // 10 seconds for quick test
  });
  
  await tester.run();
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  runLoadTest().catch(console.error);
}

export { LoadTester };
