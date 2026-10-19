import { expect, test } from '@playwright/test';

test.use({ locale: 'fr-FR' });

test('premier lancement avec limite, puis le budget suit les dépenses', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByLabel('Nom du compte').fill('Caisse');
  await page.getByLabel('Solde initial', { exact: true }).fill('1000');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByLabel('Limite par mois').fill('3000');
  await page.getByRole('button', { name: 'Commencer', exact: true }).click();

  const budget = page.getByRole('region', { name: 'Budget du mois' });
  await expect(budget).toContainText('3 000,00');

  await page.getByRole('link', { name: 'Dépense' }).click();
  await page.getByLabel('Montant').fill('3500');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Opération enregistrée.')).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Budget' })
    .click();
  await expect(page.getByText('Budget dépassé')).toBeVisible();
  await expect(page.getByText(/dépassé la limite de 500,00/)).toBeVisible();

  await page.reload();
  await expect(page.getByText('Budget dépassé')).toBeVisible();
});
