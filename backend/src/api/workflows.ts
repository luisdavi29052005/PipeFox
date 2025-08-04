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

  // Checa se account existe e é do usuário
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', account_id)
    .eq('user_id', userId)
    .single();

  if (accountError || !account)
    return res.status(404).json({ error: 'Conta não encontrada!' });

  const { data, error } = await supabase
    .from('workflows')
    .insert([{ account_id, group_url, webhook_url, keywords, user_id: userId }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// Start workflow (aqui só atualiza o status, mas pode chamar runner)
router.post('/:id/start', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const workflowId = req.params.id;

  // Confirma que é do usuário!
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .eq('user_id', userId)
    .single();

  if (error || !data)
    return res.status(404).json({ error: 'Workflow not found' });

  // Atualiza status
  await supabase.from('workflows').update({ status: 'started' }).eq('id', workflowId);
  res.json({ msg: 'Workflow started!' });

  // Aqui você pode disparar runner/scraper etc!
});

export default router;
