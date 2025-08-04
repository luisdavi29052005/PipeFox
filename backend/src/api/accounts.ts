import express from 'express';
import { requireAuth } from '../../security/supabaseAuth';
import { supabase } from '../supabaseClient';

const router = express.Router();

/* -------------------------------------------------------------------- */
/* GET /api/accounts – lista SOMENTE as contas do usuário autenticado   */
/* -------------------------------------------------------------------- */
router.get('/', requireAuth, async (req, res) => {
  const userId = req.user.id;

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId);          // << filtro de segurança

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/* -------------------------------------------------------------------- */
/* POST /api/accounts – cria conta vinculada ao usuário autenticado     */
/* -------------------------------------------------------------------- */
router.post('/', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { name }  = req.body;

  const { data, error } = await supabase
    .from('accounts')
    .insert([{ name, status: 'not_ready', user_id: userId }]) // grava owner
    .select()
    .single();                                 // devolve só a nova linha

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/* -------------------------------------------------------------------- */
/* POST /api/accounts/:id/login  – altera status se a conta é do user   */
/* -------------------------------------------------------------------- */
router.post('/:id/login', requireAuth, async (req, res) => {
  const userId    = req.user.id;
  const accountId = req.params.id;

  // valida ownership
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .eq('user_id', userId)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Account not found' });

  // inicia login
  await supabase.from('accounts')
    .update({ status: 'logging_in' })
    .eq('id', accountId);

  res.json({ msg: 'Log in via opened window. Feche a janela ao terminar.' });

  // simulação: depois marca ready
  setTimeout(async () => {
    await supabase.from('accounts')
      .update({ status: 'ready' })
      .eq('id', accountId);
  }, 2_000);
});

/* -------------------------------------------------------------------- */
/* POST /api/accounts/:id/logout – volta status se a conta é do user    */
/* -------------------------------------------------------------------- */
router.post('/:id/logout', requireAuth, async (req, res) => {
  const userId    = req.user.id;
  const accountId = req.params.id;

  const { error } = await supabase                     // basta tentar update
    .from('accounts')
    .update({ status: 'not_ready' })
    .eq('id', accountId)
    .eq('user_id', userId);

  if (error) return res.status(404).json({ error: 'Account not found' });
  res.json({ msg: 'Session status reset.' });
});

export default router;
