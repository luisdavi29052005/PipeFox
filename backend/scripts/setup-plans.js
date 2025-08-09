
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), 'backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupPlans() {
  try {
    console.log('Setting up Stripe plans...');

    // Delete existing plans
    await supabase.from('plans').delete().neq('id', 0);

    // Insert new plans with Stripe IDs
    const plans = [
      {
        stripe_price_id: 'price_1Ru4xzGjO63cg6b9ZWBb9BFY',
        stripe_product_id: 'prod_SpkSkzNmnrPd6k',
        name: 'Free',
        price: 0.00,
        currency: 'usd',
        interval: 'month',
        limits: {
          workflows: 1,
          facebook_accounts: 1,
          posts_per_day: 50
        }
      },
      {
        stripe_price_id: 'price_1Ru50RGjO63cg6b9WTQigiYL',
        stripe_product_id: 'prod_SpkV0qXN8Okhb7',
        name: 'Pro',
        price: 39.00,
        currency: 'usd',
        interval: 'month',
        limits: {
          workflows: 10,
          facebook_accounts: 5,
          posts_per_day: 1000
        }
      },
      {
        stripe_price_id: 'price_1Ru51VGjO63cg6b9w6GIGEUm',
        stripe_product_id: 'prod_SpkWnuRh9ngVWY',
        name: 'Enterprise',
        price: 199.00,
        currency: 'usd',
        interval: 'month',
        limits: {
          workflows: -1,
          facebook_accounts: 20,
          posts_per_day: -1
        }
      }
    ];

    const { data, error } = await supabase
      .from('plans')
      .insert(plans)
      .select();

    if (error) {
      console.error('Error inserting plans:', error);
      throw error;
    }

    console.log('Plans setup completed successfully:');
    console.log(data);

  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

setupPlans();
