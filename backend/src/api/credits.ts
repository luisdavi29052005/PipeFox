
import express from 'express';
import { supabase } from '../supabaseClient.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();

// GET /api/credits
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: credits, error } = await supabase
      .from('credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({
      success: true,
      data: credits || { total_credits: 0, used_credits: 0, reset_date: null }
    });
  } catch (error) {
    console.error('Error fetching credits:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// POST /api/credits/use
router.post('/use', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount = 1 } = req.body;

    // Get current credits
    const { data: credits, error: fetchError } = await supabase
      .from('credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      return res.status(404).json({ success: false, error: 'Créditos não encontrados' });
    }

    const availableCredits = credits.total_credits - credits.used_credits;
    if (availableCredits < amount) {
      return res.status(400).json({ success: false, error: 'Créditos insuficientes' });
    }

    // Update used credits
    const { error: updateError } = await supabase
      .from('credits')
      .update({ used_credits: credits.used_credits + amount })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    res.json({
      success: true,
      data: {
        used: amount,
        remaining: availableCredits - amount
      }
    });
  } catch (error) {
    console.error('Error using credits:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// POST /api/credits/add
router.post('/add', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Quantidade de créditos inválida' });
    }

    // Get current credits or create new record
    const { data: credits, error: fetchError } = await supabase
      .from('credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);

    const { error: upsertError } = await supabase
      .from('credits')
      .upsert({
        user_id: userId,
        total_credits: (credits?.total_credits || 0) + amount,
        used_credits: credits?.used_credits || 0,
        reset_date: credits?.reset_date || resetDate.toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) throw upsertError;

    res.json({
      success: true,
      data: {
        added: amount,
        newTotal: (credits?.total_credits || 0) + amount
      }
    });
  } catch (error) {
    console.error('Error adding credits:', error);
    res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

export default router;
