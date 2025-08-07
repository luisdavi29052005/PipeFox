
import express from 'express';
import { requireAuth } from '../supabaseAuth.js';
import { supabase } from '../supabaseClient.js';
import { v4 as uuid } from 'uuid';
import {
  validateGroupUrl,
  sanitizeKeywords
} from '../fb_bot/utils.js';

const router = express.Router();

/* ------------------------------------------------------------------ */
/* CREATE WORKFLOW NODE                                               */
/* ------------------------------------------------------------------ */
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      workflow_id,
      group_url,
      group_name,
      prompt = '',
      keywords = [],
      is_active = true
    } = req.body;

    // Validações básicas
    if (!workflow_id) return res.status(400).json({ error: 'Workflow ID is required' });
    if (!group_url) return res.status(400).json({ error: 'Group URL is required' });
    if (!validateGroupUrl(group_url)) {
      return res.status(400).json({ error: 'Invalid Facebook group URL' });
    }

    // Verifica se o workflow pertence ao usuário
    const { data: workflow, error: wfError } = await supabase
      .from('workflows')
      .select('id')
      .eq('id', workflow_id)
      .eq('user_id', userId)
      .single();

    if (wfError || !workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Cria o node
    const { data: node, error } = await supabase
      .from('workflow_nodes')
      .insert([
        {
          id: uuid(),
          workflow_id,
          group_url,
          group_name: group_name || group_url,
          prompt,
          keywords: sanitizeKeywords(keywords),
          is_active
        }
      ])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(node);
  } catch (err) {
    console.error('Error creating workflow node:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ------------------------------------------------------------------ */
/* UPDATE WORKFLOW NODE                                               */
/* ------------------------------------------------------------------ */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const nodeId = req.params.id;
    const {
      group_url,
      group_name,
      prompt,
      keywords,
      is_active
    } = req.body;

    // Verifica se o node pertence a um workflow do usuário
    const { data: node, error: nodeError } = await supabase
      .from('workflow_nodes')
      .select(`
        *,
        workflows!inner(user_id)
      `)
      .eq('id', nodeId)
      .single();

    if (nodeError || !node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    const workflowUserId = Array.isArray(node.workflows) 
      ? node.workflows[0]?.user_id 
      : node.workflows?.user_id;

    if (workflowUserId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Prepara os dados para atualização
    const updateData: any = {};
    
    if (group_url !== undefined) {
      if (!validateGroupUrl(group_url)) {
        return res.status(400).json({ error: 'Invalid Facebook group URL' });
      }
      updateData.group_url = group_url;
    }
    
    if (group_name !== undefined) updateData.group_name = group_name;
    if (prompt !== undefined) updateData.prompt = prompt;
    if (keywords !== undefined) updateData.keywords = sanitizeKeywords(keywords);
    if (is_active !== undefined) updateData.is_active = is_active;

    // Atualiza o node
    const { data: updatedNode, error } = await supabase
      .from('workflow_nodes')
      .update(updateData)
      .eq('id', nodeId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(updatedNode);
  } catch (err) {
    console.error('Error updating workflow node:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ------------------------------------------------------------------ */
/* DELETE WORKFLOW NODE                                               */
/* ------------------------------------------------------------------ */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const nodeId = req.params.id;

    // Verifica se o node pertence a um workflow do usuário
    const { data: node, error: nodeError } = await supabase
      .from('workflow_nodes')
      .select(`
        *,
        workflows!inner(user_id)
      `)
      .eq('id', nodeId)
      .single();

    if (nodeError || !node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    const workflowUserId = Array.isArray(node.workflows) 
      ? node.workflows[0]?.user_id 
      : node.workflows?.user_id;

    if (workflowUserId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Deleta o node
    const { error } = await supabase
      .from('workflow_nodes')
      .delete()
      .eq('id', nodeId);

    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting workflow node:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
