
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripePlans = [
  {
    id: 'price_1Ru4xzGjO63cg6b9ZWBb9BFY',
    name: 'Free',
    price: 0.00,
    currency: 'usd',
    stripe_product_id: 'prod_SpkSkzNmnrPd6k',
    limits: {
      workflows: 3,
      fb_accounts: 1,
      posts_per_day: 10,
      credits_per_month: 1000
    }
  },
  {
    id: 'price_1Ru50RGjO63cg6b9WTQigiYL', 
    name: 'Pro',
    price: 39.00,
    currency: 'usd',
    stripe_product_id: 'prod_SpkV0qXN8Okhb7',
    limits: {
      workflows: 25,
      fb_accounts: 5,
      posts_per_day: 100,
      credits_per_month: 10000
    }
  },
  {
    id: 'price_1Ru51VGjO63cg6b9w6GIGEUm',
    name: 'Enterprise', 
    price: 199.00,
    currency: 'usd',
    stripe_product_id: 'prod_SpkWnuRh9ngVWY',
    limits: {
      workflows: -1,
      fb_accounts: -1,
      posts_per_day: -1,
      credits_per_month: 50000
    }
  }
];

async function setupPlans() {
  try {
    console.log('Setting up Stripe plans...');
    
    // Delete existing plans
    await supabase.from('plans').delete().neq('id', '');
    
    // Insert new plans
    const { data, error } = await supabase
      .from('plans')
      .insert(stripePlans);
      
    if (error) {
      console.error('Error inserting plans:', error);
      return;
    }
    
    console.log('Plans setup completed successfully!');
    console.log('Plans created:', stripePlans.map(p => `${p.name} - $${p.price}`));
    
  } catch (error) {
    console.error('Error setting up plans:', error);
  }
}

setupPlans();
