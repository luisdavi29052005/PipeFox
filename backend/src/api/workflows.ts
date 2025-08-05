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
    const { account_id, webhook_url, keywords = [], groups = [] } = req.body;

    // Validation
    if (!account_id) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    if (!groups || !Array.isArray(groups) || groups.length === 0) {
      return res.status(400).json({ error: 'At least one group is required' });
    }

    // Validate all group URLs
    for (const group of groups) {
      if (!group.url || !validateGroupUrl(group.url)) {
        return res.status(400).json({ error: `Invalid Facebook group URL: ${group.url}` });
      }
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
    const workflowId = generateWorkflowId();

    // Create workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .insert([{
        id: workflowId,
        user_id: userId,
        account_id,
        webhook_url,
        keywords: sanitizedKeywords,
        status: 'created'
      }])
      .select()
      .single();

    if (workflowError) return res.status(500).json({ error: workflowError.message });

    // Create workflow nodes for each group
    const nodes = groups.map(group => ({
      id: generateWorkflowId(),
      workflow_id: workflowId,
      group_url: group.url,
      group_name: group.name || group.url,
      status: 'active'
    }));

    const { data: createdNodes, error: nodesError } = await supabase
      .from('workflow_nodes')
      .insert(nodes)
      .select();

    if (nodesError) {
      // Cleanup workflow if nodes creation fails
      await supabase.from('workflows').delete().eq('id', workflowId);
      return res.status(500).json({ error: nodesError.message });
    }

    res.json({ ...workflow, nodes: createdNodes });
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
        accounts!inner(*),
        workflow_nodes!inner(*)
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

    // Check if workflow has active nodes
    const activeNodes = workflow.workflow_nodes.filter(node => node.status === 'active');
    if (activeNodes.length === 0) {
      return res.status(400).json({ error: 'No active groups found for this workflow' });
    }

    // Update workflow status
    await supabase
      .from('workflows')
      .update({ status: 'running' })
      .eq('id', workflowId);

    // Start the runner with multiple nodes
    const { startRunner } = await import('../fb_bot/runner.js');
    await startRunner({
      id: workflow.id,
      account_id: workflow.account_id,
      webhook_url: workflow.webhook_url,
      keywords: workflow.keywords,
      nodes: activeNodes
    });

    res.json({ 
      msg: `Workflow ${workflowId} started successfully!`,
      groups_count: activeNodes.length 
    });
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