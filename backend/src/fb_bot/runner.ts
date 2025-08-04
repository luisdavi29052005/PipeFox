
import { openLoginWindow } from './fbLogin.js';

interface WorkflowConfig {
  id: string;
  account_id: string;
  group_url: string;
  webhook_url: string;
  keywords: string[];
}

const activeRunners = new Map<string, any>();

export async function startRunner(config: WorkflowConfig) {
  try {
    console.log(`🚀 Starting runner for workflow ${config.id}`);
    
    // Store runner reference
    activeRunners.set(config.id, {
      config,
      status: 'running',
      startTime: Date.now()
    });

    // Simulate FB bot logic
    console.log(`📱 Monitoring group: ${config.group_url}`);
    console.log(`🔍 Keywords: ${config.keywords.join(', ')}`);
    console.log(`📡 Webhook: ${config.webhook_url}`);

    return { success: true, msg: 'Runner started successfully' };
  } catch (error) {
    console.error('Error starting runner:', error);
    throw error;
  }
}

export async function stopRunner(workflowId: string) {
  try {
    console.log(`🛑 Stopping runner for workflow ${workflowId}`);
    
    if (activeRunners.has(workflowId)) {
      activeRunners.delete(workflowId);
      return { success: true, msg: 'Runner stopped successfully' };
    }
    
    return { success: false, msg: 'Runner not found' };
  } catch (error) {
    console.error('Error stopping runner:', error);
    throw error;
  }
}

export function getActiveRunners() {
  return Array.from(activeRunners.entries()).map(([id, data]) => ({
    id,
    ...data
  }));
}
