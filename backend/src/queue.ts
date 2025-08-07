import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Configure sua conexão com o Redis (use variáveis de ambiente em produção)
const connection = new IORedis({
  maxRetriesPerRequest: null
});

// Exporta a fila de workflows
export const workflowQueue = new Queue('workflow-jobs', { connection });