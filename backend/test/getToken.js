const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');

console.log('URL:', process.env.SUPABASE_URL);
console.log('KEY:', process.env.SUPABASE_ANON_KEY?.slice(0, 20) + '...');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function getToken(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return console.log('ERRO:', error.message);
  console.log(`${email} ->`, data.session.access_token);
}

const [,, email, password] = process.argv;
if (!email || !password) {
  console.log('Uso: node test/getToken.js email senha');
  process.exit(1);
}
getToken(email, password);
