
import express from 'express';
import { supabase } from '../supabaseClient.js';
import { requireAuth } from '../middleware/requireAuth.js';
import Stripe from 'stripe';

const router = express.Router();

// Verificar se as variáveis de ambiente do Stripe estão configuradas
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY não encontrada no ambiente. Funcionalidades de pagamento estarão desabilitadas.');
}

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
}) : null;

// GET /api/plans
router.get('/', async (req, res) => {
  try {
    console.log('Fetching plans from database...');
    
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .order('price');

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Plans found:', plans?.length || 0);

    // Se não há planos no banco, execute o setup
    if (!plans || plans.length === 0) {
      console.log('No plans found, running setup...');
      try {
        const { setupPlans } = await import('../../scripts/setup-plans.js');
        await setupPlans();
        
        // Buscar novamente após setup
        const { data: newPlans } = await supabase
          .from('plans')
          .select('*')
          .order('price');
        
        return res.json({
          success: true,
          data: newPlans || []
        });
      } catch (setupError) {
        console.error('Error during setup:', setupError);
        return res.status(500).json({ success: false, error: 'Erro ao configurar planos' });
      }
    }

    res.json({
      success: true,
      data: plans || []
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// POST /api/plans/checkout  
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ success: false, error: 'Plan ID é obrigatório' });
    }

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return res.status(404).json({ success: false, error: 'Plano não encontrado' });
    }

    // If it's a free plan, just create the subscription
    if (plan.price === 0) {
      // Cancel existing subscription
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled', end_date: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('status', 'active');

      // Create new free subscription
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_id: planId,
          status: 'active',
          start_date: new Date().toISOString()
        })
        .select()
        .single();

      if (subError) throw subError;

      return res.json({
        success: true,
        data: { subscription, plan }
      });
    }

    // For paid plans, create Stripe checkout session
    try {
      if (!stripe) {
        return res.status(500).json({ success: false, error: 'Serviço de pagamento não configurado' });
      }

      const stripeProductId = plan.limits?.stripe_price_id;
      
      if (!stripeProductId) {
        return res.status(400).json({ success: false, error: 'Plano não configurado para pagamento' });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price: stripeProductId,
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${process.env.PUBLIC_URL}/plans?success=true`,
        cancel_url: `${process.env.PUBLIC_URL}/plans?canceled=true`,
        client_reference_id: userId,
        metadata: {
          user_id: userId,
          plan_id: planId.toString()
        }
      });

      res.json({
        success: true,
        data: { 
          checkout_url: session.url,
          session_id: session.id 
        }
      });
    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
      res.status(500).json({ success: false, error: 'Erro ao criar sessão de pagamento' });
    }
  } catch (error) {
    console.error('Error processing checkout:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// GET /api/plans/subscription
router.get('/subscription', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plan:plans(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (subError && subError.code !== 'PGRST116') {
      throw subError;
    }

    res.json({
      success: true,
      data: {
        subscription: subscription || null
      }
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// POST /api/plans/subscription/cancel
router.post('/subscription/cancel', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { error } = await supabase
      .from('subscriptions')
      .update({ 
        status: 'cancelled',
        end_date: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;

    res.json({
      success: true,
      data: { message: 'Assinatura cancelada com sucesso' }
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// POST /api/plans/webhook - Stripe webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('Stripe não configurado para webhooks');
    return res.status(500).json({ error: 'Serviço de pagamento não configurado' });
  }

  const sig = req.headers['stripe-signature'] as string;
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      const userId = session.client_reference_id;
      const planId = session.metadata?.plan_id;

      if (userId && planId) {
        try {
          // Cancel existing subscription
          await supabase
            .from('subscriptions')
            .update({ status: 'cancelled', end_date: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('status', 'active');

          // Create new subscription
          await supabase
            .from('subscriptions')
            .insert({
              user_id: userId,
              plan_id: planId,
              status: 'active',
              start_date: new Date().toISOString()
            });

          console.log('Subscription created for user:', userId);
        } catch (error) {
          console.error('Error creating subscription:', error);
        }
      }
      break;

    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      try {
        // Find subscription by metadata or other means
        console.log('Subscription cancelled:', subscription.id);
      } catch (error) {
        console.error('Error cancelling subscription:', error);
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

export default router;
