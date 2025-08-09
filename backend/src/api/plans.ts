
import express from 'express';
import { supabase } from '../supabaseClient.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();

// GET /api/plans
router.get('/', async (req, res) => {
  try {
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .order('price');

    if (error) throw error;

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// POST /api/checkout
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId, paymentMethod } = req.body;

    if (!planId || !paymentMethod) {
      return res.status(400).json({ success: false, error: 'Plan ID e método de pagamento são obrigatórios' });
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

    // Cancel existing subscription
    await supabase
      .from('subscriptions')
      .update({ status: 'cancelled', end_date: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'active');

    // Create new subscription
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

    // Create payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        subscription_id: subscription.id,
        amount: plan.price,
        currency: plan.currency,
        payment_method: paymentMethod,
        status: 'paid'
      });

    if (paymentError) throw paymentError;

    // Update or create credits
    const creditsToAdd = plan.limits.credits_per_month;
    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);

    await supabase
      .from('credits')
      .upsert({
        user_id: userId,
        total_credits: creditsToAdd,
        used_credits: 0,
        reset_date: resetDate.toISOString()
      }, {
        onConflict: 'user_id'
      });

    res.json({
      success: true,
      data: { subscription, plan }
    });
  } catch (error) {
    console.error('Error processing checkout:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// GET /api/subscription
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

    const { data: credits, error: creditsError } = await supabase
      .from('credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      throw subError;
    }

    res.json({
      success: true,
      data: {
        subscription: subscription || null,
        credits: credits || { total_credits: 0, used_credits: 0 }
      }
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// POST /api/subscription/cancel
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

export default router;
