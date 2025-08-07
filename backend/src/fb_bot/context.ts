import { chromium, BrowserContext } from 'playwright';
import { supabase } from '../supabaseClient';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

/**
 * Abre um BrowserContext usando SEMPRE a sessão do Supabase Storage.
 * - Baixa o storage-state.json para um arquivo temporário
 * - Cria browser + context com esse storageState
 * - Garante cleanup ao fechar o context
 */
export async function openContextForAccount(
  userId: string,
  accountId: string,
  headless = false
): Promise<BrowserContext> {
  const storagePath = `${userId}/${accountId}/storage-state.json`;
  const tempSessionPath = path.join(os.tmpdir(), `pipefox_session_${accountId}.json`);

  // Sempre baixa do Supabase
  const { data, error } = await supabase.storage
    .from('sessions')
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Sessão não encontrada para a conta ${accountId}. Faça o login novamente.`);
  }

  const buf = Buffer.from(await data.arrayBuffer());
  await fs.outputFile(tempSessionPath, buf);

  const browser = await chromium.launch({
    headless,
    args: [
      '--disable-notifications',
      '--disable-infobars',
      '--disable-dev-shm-usage',
    ],
  });

  const context = await browser.newContext({ storageState: tempSessionPath });

  // Cleanup: quando o context fechar, fecha o browser e remove o temp file
  context.on('close', async () => {
    try {
      await browser.close();
    } catch {}
    try {
      await fs.remove(tempSessionPath);
    } catch {}
  });

  return context;
}