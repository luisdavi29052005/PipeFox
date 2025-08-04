
import path from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: path.resolve(process.cwd(), '.env') });

console.log('URL:', process.env.SUPABASE_URL);
console.log('KEY:', process.env.SUPABASE_ANON_KEY?.slice(0, 20) + '...');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function getToken(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('❌ ERRO:', error.message);
      process.exit(1);
    }
    
    if (!data.session) {
      console.error('❌ ERRO: No session returned');
      process.exit(1);
    }
    
    console.log('✅ Login successful!');
    console.log('📧 Email:', email);
    console.log('🔑 Token:', data.session.access_token);
    console.log('\n💡 Usage:');
    console.log(`TEST_TOKEN="${data.session.access_token}" node test/api-test.js`);
    
    return data.session.access_token;
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

const [,, email, password] = process.argv;
if (!email || !password) {
  console.log('Uso: node test/getToken.js email senha');
  process.exit(1);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  getToken(email, password);
}

export { getToken };
