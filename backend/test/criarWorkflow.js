const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();


const API_URL = 'http://localhost:5000/api/workflows';

// Coloque seu token e configs aqui!
const TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6ImkrU3hNWmJRNVM2Z2cwUGwiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3RqdHV3aGdxZGdpeXVja2Fxb2FwLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJiM2U3NDZhNy05ZjkwLTRkNGItYTYyYy00YWZkNGU0ODhlMDMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU0MjY0ODI4LCJpYXQiOjE3NTQyNjEyMjgsImVtYWlsIjoiam9hb0BlbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc1NDI2MTIyOH1dLCJzZXNzaW9uX2lkIjoiNTlkNjBkMWMtNGI0Mi00ZGM5LTgxZjMtNzY4NWQ3MGRkYzcxIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.nc5rwve2ClJ9hmbUK2k0FJCr932wQp4SQwspnEfpZf0'; // <TOKEN_JOAO>
const account_id = '8d5w6oaf'; // id da conta que fez login FB
const group_url = 'https://www.facebook.com/groups/981828972387083'; // coloque o real!
const webhook_url = 'http://localhost:5678/webhook/fb-bot-repl';
const keywords = ['restauração', 'design'];

async function criarWorkflow() {
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      account_id,
      group_url,
      webhook_url,
      keywords,
    }),
  });

  const data = await resp.json();
  console.log('Resultado do workflow:', data);
}

criarWorkflow();
import { config } from 'dotenv';
import { getToken } from './getToken.js';

config();

const API_BASE = 'http://localhost:5000/api';

async function createWorkflow(email, password) {
  try {
    // Get token
    console.log('🔑 Getting authentication token...');
    const token = await getToken(email, password);
    
    const fetch = (await import('node-fetch')).default;
    
    // First create an account
    console.log('👤 Creating account...');
    const accountResp = await fetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'Test Account from Script' })
    });
    
    const account = await accountResp.json();
    console.log('✅ Account created:', account.id);
    
    // Then create a workflow
    console.log('⚡ Creating workflow...');
    const workflowResp = await fetch(`${API_BASE}/workflows`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        account_id: account.id,
        group_url: 'https://www.facebook.com/groups/123456789',
        webhook_url: 'https://webhook.site/test',
        keywords: ['venda', 'produto', 'oferta']
      })
    });
    
    const workflow = await workflowResp.json();
    console.log('✅ Workflow created:', workflow.id);
    
    return { account, workflow };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

const [,, email, password] = process.argv;
if (!email || !password) {
  console.log('Uso: node test/criarWorkflow.js email senha');
  process.exit(1);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  createWorkflow(email, password);
}

export { createWorkflow };
