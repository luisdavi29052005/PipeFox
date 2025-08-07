import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { startRunner, WorkflowConfig } from './fb_bot/runner';
import { postComment } from './fb_bot/actions';
import { openContextForAccount } from './fb_bot/context';
import { supabase } from './supabaseClient';

const connection = new IORedis({ maxRetriesPerRequest: null });

console.log('🚀 Worker de Workflows iniciado...');

const worker = new Worker('workflow-jobs', async job => {
  console.log(`[worker] Processando job ${job.name} (ID: ${job.id})`);

  switch (job.name) {
    case 'workflow-job': { // Renomeamos o job original
      const config = job.data as WorkflowConfig;
      await startRunner(config);
      break;
    }
    case 'comment-job': {
      const { leadId, postUrl, commentText } = job.data;
      
      // Precisamos buscar a conta associada a este lead para usar o contexto correto
      const { data: leadData, error } = await supabase
        .from('leads')
        .select(`
          node:workflow_nodes (
            workflow:workflows (
              account_id,
              user_id
            )
          )
        `)
        .eq('id', leadId)
        .single();

      if (error || !leadData) throw new Error(`Lead ${leadId} não encontrado para comentar.`);
      
      const accountInfo = leadData.node?.workflow;
      if (!accountInfo) throw new Error(`Informações da conta não encontradas para o lead ${leadId}`);

      const context = await openContextForAccount(accountInfo.user_id, accountInfo.account_id, true);
      const page = await context.newPage();
      try {
        await postComment(page, postUrl, commentText);
        await supabase.from('leads').update({ status: 'comment_posted' }).eq('id', leadId);
      } finally {
        await context.close();
      }
      break;
    }
    default:
      throw new Error(`Tipo de job desconhecido: ${job.name}`);
  }
}, { connection });

worker.on('completed', (job) => {
  console.log(`[worker] Job ${job.id} (tipo: ${job.name}) finalizado com sucesso.`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} (tipo: ${job?.name}) falhou com o erro: ${err.message}`);
});
