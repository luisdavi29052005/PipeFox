
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

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

  async request(endpoint) {
    const start = Date.now();
    try {
      const resp = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        }
      });
      
      const duration = Date.now() - start;
      this.results.responseTimes.push(duration);
      this.results.requests++;
      
      if (!resp.ok) {
        this.results.errors++;
      }
    } catch (error) {
      this.results.errors++;
      this.results.requests++;
    }
  }

  async runWorker() {
    const endTime = Date.now() + this.duration;
    
    while (Date.now() < endTime) {
      await this.request('/accounts');
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
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
  }
}

async function runLoadTest() {
  const token = process.env.TEST_TOKEN;
  
  if (!token) {
    console.error('ERROR: TEST_TOKEN environment variable is required');
    process.exit(1);
  }

  const tester = new LoadTester(token, {
    concurrency: 5,
    duration: 10000 // 10 seconds for quick test
  });
  
  await tester.run();
}

if (require.main === module) {
  runLoadTest().catch(console.error);
}
