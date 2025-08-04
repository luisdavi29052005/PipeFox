
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting development server...');

// Check if .env exists
const envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  console.log('📄 Please copy .env.example to .env and configure your variables');
  process.exit(1);
}

// Start the server with tsx for TypeScript support
const server = spawn('npx', ['tsx', 'watch', 'src/server.ts'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit'
});

server.on('close', (code) => {
  console.log(`\n🛑 Server exited with code ${code}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down development server...');
  server.kill('SIGINT');
  process.exit(0);
});
