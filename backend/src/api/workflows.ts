import express from 'express';
import { requireAuth } from '../../security/supabaseAuth.js';
import { supabase } from '../supabaseClient.js';
import { validateGroupUrl, validateWebhookUrl, sanitizeKeywords, generateWorkflowId } from '../fb_bot/utils.js';

const router = express.Router();

// List workflows
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    console.error('Error listing workflows:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create workflow
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { account_id, group_url, webhook_url, keywords = [] } = req.body;

    // Validation
    if (!account_id) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    if (!group_url || !validateGroupUrl(group_url)) {
      return res.status(400).json({ error: 'Valid Facebook group URL is required' });
    }

    if (webhook_url && !validateWebhookUrl(webhook_url)) {
      return res.status(400).json({ error: 'Valid webhook URL is required' });
    }

    // Check if account belongs to user
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', account_id)
      .eq('user_id', userId)
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const sanitizedKeywords = sanitizeKeywords(keywords);

    const { data, error } = await supabase
      .from('workflows')
      .insert([{
        id: generateWorkflowId(),
        user_id: userId,
        account_id,
        group_url,
        webhook_url,
        keywords: sanitizedKeywords,
        status: 'created'
      }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('Error creating workflow:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start workflow
router.post('/:id/start', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const workflowId = req.params.id;

    const { data: workflow, error } = await supabase
      .from('workflows')
      .select(`
        *,
        accounts!inner(*)
      `)
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single();

    if (error || !workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Check if account is ready
    if (workflow.accounts.status !== 'ready') {
      return res.status(400).json({ 
        error: 'Account must be logged in and ready before starting workflow' 
      });
    }

    // Update workflow status
    await supabase
      .from('workflows')
      .update({ status: 'running' })
      .eq('id', workflowId);

    // Start the runner
    const { startRunner } = await import('../fb_bot/runner.js');
    await startRunner({
      id: workflow.id,
      account_id: workflow.account_id,
      group_url: workflow.group_url,
      webhook_url: workflow.webhook_url,
      keywords: workflow.keywords
    });

    res.json({ msg: `Workflow ${workflowId} started successfully!` });
  } catch (err) {
    console.error('Error starting workflow:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stop workflow
router.post('/:id/stop', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const workflowId = req.params.id;

    const { data: workflow, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single();

    if (error || !workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Update status
    await supabase
      .from('workflows')
      .update({ status: 'stopped' })
      .eq('id', workflowId);

    // Stop the runner
    const { stopRunner } = await import('../fb_bot/runner.js');
    await stopRunner(workflowId);

    res.json({ msg: `Workflow ${workflowId} stopped successfully!` });
  } catch (err) {
    console.error('Error stopping workflow:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;