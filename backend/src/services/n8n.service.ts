import fetch from 'node-fetch';
import FormData from 'form-data';

export async function sendToN8n(leadId: string, imageBuffer: Buffer, webhookUrl?: string) {
  if (!webhookUrl) {
    console.warn(`[n8n] Webhook URL não configurado para o workflow. Lead ${leadId} não será processado.`);
    return;
  }

  const form = new FormData();
  form.append('leadId', leadId);
    form.append('prompt', prompt);
  form.append('image', imageBuffer, {
    contentType: 'image/png',
    filename: 'post-screenshot.png'
  });

  // Adiciona o prompt do workflow/node se existir
  // (Você pode expandir isso para passar mais dados)
  // form.append('prompt', 'Seja amigável e ofereça ajuda para restaurar a foto.');

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n respondeu com status ${response.status}: ${errorText}`);
    }

    console.log(`[n8n] Lead ${leadId} enviado com sucesso para o webhook.`);
    // O n8n agora é responsável por chamar de volta a nossa API
    // para atualizar o lead com o comentário gerado.

  } catch (error) {
    console.error(`[n8n] Falha ao enviar lead ${leadId} para o webhook:`, error);
    // Aqui você pode adicionar lógica para re-tentativas ou marcar o lead como falho
  }
}
