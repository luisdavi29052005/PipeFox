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
