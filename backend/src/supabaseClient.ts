import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL; // <-- Faltou essa linha aqui!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Para backend

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL e SUPABASE_KEY devem estar no .env!');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
