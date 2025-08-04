import express from 'express';
import { requireAuth } from '../../security/supabaseAuth';
import { supabase } from '../supabaseClient';

const router = express.Router();

// Listar workflows do usuário autenticado
router.get('/', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('user_id', userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Criar workflow
router.post('/', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { account_id, group_url, webhook_url, keywords } = req.body;

  // Validação de entrada
  if (!account_id || !group_url) {
    return res.status(400).json({ error: 'account_id and group_url are required' });
  }

  if (group_url && !group_url.includes('facebook.com/groups/')) {
    return res.status(400).json({ error: 'Invalid Facebook group URL' });
  }

  if (webhook_url && !webhook_url.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid webhook URL' });
  }

  try {
    // Checa se account existe e é do usuário
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', account_id)
      .eq('user_id', userId)
      .single();

    if (accountError || !account)
      return res.status(404).json({ error: 'Account not found!' });

    const { data, error } = await supabase
      .from('workflows')
      .insert([{ 
        account_id, 
        group_url, 
        webhook_url: webhook_url || null, 
        keywords: keywords || [], 
        user_id: userId,
        status: 'created'
      }])
      .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  } catch (err) {
    console.error('Error creating workflow:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start workflow
router.post('/:id/start', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const workflowId = req.params.id;

  try {
    // Confirma que é do usuário!
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('*, accounts(*)')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single();

    if (error || !workflow)
      return res.status(404).json({ error: 'Workflow not found' });

    // Verifica se a conta está pronta
    if (workflow.accounts?.status !== 'ready') {
      return res.status(400).json({ error: 'Account not ready. Please login first.' });
    }

    // Atualiza status
    const { error: updateError } = await supabase
      .from('workflows')
      .update({ status: 'running' })
      .eq('id', workflowId);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update workflow status' });
    }

    res.json({ msg: 'Workflow started successfully!' });

    // Inicia o runner
    const { startRunner } = await import('../fb_bot/runner');
    await startRunner({
      id: workflow.id,
      account_id: workflow.account_id,
      group_url: workflow.group_url,
      webhook_url: workflow.webhook_url,
      keywords: workflow.keywords
    });

  } catch (err) {
    console.error('Error starting workflow:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stop workflow
router.post('/:id/stop', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const workflowId = req.params.id;

  try {
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single();

    if (error || !workflow)
      return res.status(404).json({ error: 'Workflow not found' });

    // Atualiza status
    await supabase.from('workflows').update({ status: 'stopped' }).eq('id', workflowId);

    // Para o runner
    const { stopRunner } = await import('../fb_bot/runner');
    await stopRunner(workflowId);

    res.json({ msg: 'Workflow stopped successfully!' });
  } catch (err) {
    console.error('Error stopping workflow:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
