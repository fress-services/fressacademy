import { expect, test } from '@playwright/test';
import { onboardWithAccount } from './helpers';

test.use({ locale: 'fr-FR' });

test('aucune violation de la politique de sécurité ni erreur dans la console', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console : ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`page : ${error.message}`));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.error(`CSP ${event.violatedDirective} ${event.blockedURI}`);
    });
  });

  await onboardWithAccount(page, 'Caisse', '1000');
  const csp = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content');
  expect(csp).toContain("script-src 'self'");

  // Un libellé qui ressemble à du HTML reste du texte (pas d'injection).
  await page.goto('/activity/new?type=expense');
  await page.getByLabel('Montant').fill('1');
  await page.getByLabel('Libellé').fill('<img src=x onerror=alert(1)>');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  // Après l'enregistrement, Kolo revient sur l'activité : attendre ce retour plutôt que naviguer.
  await expect(page).toHaveURL(/\/activity$/);
  await expect(page.getByText('<img src=x onerror=alert(1)>')).toBeVisible();
  expect(await page.locator('img[src="x"]').count()).toBe(0);

  for (const path of [
    '/',
    '/budget',
    '/debts',
    '/more/reports',
    '/more/backup',
    '/more/settings',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  await page.goto('/more/backup');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Télécharger une sauvegarde' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.json$/);

  expect(problems).toEqual([]);
});
