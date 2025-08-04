import { chromium, BrowserContext } from 'playwright'
import { getUserDataDir } from './paths'

export async function openContextForAccount(
  userId: string,
  accountId: string,
  headless = true
): Promise<BrowserContext> {
  const userDataDir = getUserDataDir(userId, accountId)
  console.log('[context] userDataDir =', userDataDir)
  return chromium.launchPersistentContext(userDataDir, {
    headless,
    args: [
      '--disable-notifications',
      '--disable-infobars',
      '--disable-dev-shm-usage'
    ]
  })
}
