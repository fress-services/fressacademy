import { expect, test } from '@playwright/test';
import { onboardWithAccount, skipOnboarding } from './helpers';

test.use({ locale: 'fr-FR' });

test('la langue et le thème choisis restent après rechargement', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/more/settings');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.getByRole('radio', { name: 'English' }).click();
  await expect(page.getByText('Preference saved.')).toBeVisible();
  await page.getByRole('radio', { name: 'Light' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.reload();

  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'English' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Light' })).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('les préférences restent après fermeture de l’onglet', async ({ context }) => {
  const first = await context.newPage();
  await skipOnboarding(first);
  await first.goto('/more/settings');
  await first.getByRole('radio', { name: 'Comme l’appareil' }).click();
  await expect(first.getByText('Préférence enregistrée.')).toBeVisible();
  await first.close();

  const second = await context.newPage();
  await second.goto('/more/settings');
  await expect(second.getByRole('radio', { name: 'Comme l’appareil' })).toBeChecked();
  await expect(second.locator('html')).toHaveAttribute('data-theme', 'system');
});

test('la page « Vos données » indique l’état de la protection du stockage', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/more/data');
  await expect(
    page.getByRole('heading', { level: 2, name: 'Protection contre l’effacement automatique' }),
  ).toBeVisible();
  await expect(page.getByRole('status')).not.toHaveText('Vérification en cours…');
});

test('le premier lancement ne revient pas et les opérations restent après rechargement', async ({
  page,
}) => {
  await onboardWithAccount(page, 'Caisse', '100');
  await page.getByRole('link', { name: 'Dépense', exact: true }).click();
  await page.getByLabel('Montant').fill('12,50');
  await page.getByLabel('Libellé').fill('Marché');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Opération enregistrée.')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Activité' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Marché/ })).toContainText('-12,50');
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Vos soldes' })).toContainText('87,50');
});
