
export function validateGroupUrl(url: string): boolean {
  const fbGroupRegex = /^https:\/\/www\.facebook\.com\/groups\/\d+/;
  return fbGroupRegex.test(url);
}

export function validateWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function sanitizeKeywords(keywords: string[]): string[] {
  return keywords
    .filter(k => k && k.trim().length > 0)
    .map(k => k.trim().toLowerCase())
    .slice(0, 20); // Limit to 20 keywords
}

export function generateWorkflowId(): string {
  return Math.random().toString(36).substring(2, 10);
}
