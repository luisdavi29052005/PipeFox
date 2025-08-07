import { Page } from 'playwright';

export async function postComment(page: Page, postUrl: string, commentText: string): Promise<void> {
    try {
        console.log(`[actions] Navegando para ${postUrl} para comentar.`);
        await page.goto(postUrl, { waitUntil: 'networkidle' });

        // Localiza a área de comentário. O seletor pode precisar de ajuste.
        const commentBoxSelector = 'div[aria-label="Escrever um comentário"], div[aria-label="Write a comment"]';
        await page.waitForSelector(commentBoxSelector);
        
        const commentBox = page.locator(commentBoxSelector).first();
        await commentBox.click();
        await commentBox.fill(commentText);

        // Aguarda um pouco para a UI reagir
        await page.waitForTimeout(1000);

        // Pressiona Enter para enviar
        await page.keyboard.press('Enter');
        
        console.log(`[actions] Comentário enviado com sucesso.`);
        await page.waitForTimeout(5000); // Espera para garantir o envio

    } catch (error) {
        console.error(`[actions] Falha ao postar comentário em ${postUrl}:`, error);
        throw error;
    }
}