import { expect, test } from '@playwright/test';
import { onboardWithAccount } from './helpers';

test.use({ locale: 'fr-FR' });

test('Mode avion : les données restent consultables et modifiables sans connexion', async ({
  page,
  context,
}) => {
  await onboardWithAccount(page, 'Caisse', '1000');
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Le service worker contrôle la page à partir du chargement suivant.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Accueil' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Vos soldes' })).toContainText('1 000,00');

  // Saisie hors ligne : rien n'attend un serveur.
  await page.getByRole('link', { name: 'Dépense', exact: true }).click();
  await page.getByLabel('Montant').fill('25');
  await page.getByLabel('Libellé').fill('Taxi hors ligne');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Opération enregistrée.')).toBeVisible();

  // Une adresse ouverte directement hors ligne affiche aussi l'application.
  await page.goto('/activity');
  await expect(page.getByText('Taxi hors ligne')).toBeVisible();
  await page.goto('/debts');
  await expect(page.getByRole('heading', { level: 1, name: 'Dettes' })).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Vos soldes' })).toContainText('975,00');

  await context.setOffline(false);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Vos soldes' })).toContainText('975,00');
});

test('l’application est installable : manifeste et icônes', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifest = await (await request.get(href!)).json();
  expect(manifest).toMatchObject({ name: 'Kolo', display: 'standalone', start_url: '/' });
  for (const icon of manifest.icons as { src: string; sizes: string }[]) {
    const response = await request.get(`/${icon.src}`);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('image/png');
  }
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toContain('512x512');
});
