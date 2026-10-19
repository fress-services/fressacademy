import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { onboardWithAccount } from './helpers';

test.use({ locale: 'fr-FR' });

async function addExpense(page: Page, amount: string, title: string) {
  await page.goto('/activity/new?type=expense');
  await page.getByLabel('Montant').fill(amount);
  await page.getByLabel('Libellé').fill(title);
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Opération enregistrée.')).toBeVisible();
}

test('Exporter puis restaurer : les données reviennent après un effacement', async ({ page }) => {
  await onboardWithAccount(page, 'Caisse', '1000');
  await addExpense(page, '12,50', 'Marché du samedi');

  await page.goto('/more');
  await page.getByRole('link', { name: /Sauvegarde et export/ }).click();
  await expect(page.getByText(/contient vos informations financières en clair/)).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Télécharger une sauvegarde' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^kolo-sauvegarde-\d{4}-\d{2}-\d{2}\.json$/);
  const backupPath = await download.path();
  await expect(page.getByText(/Dernière sauvegarde :/)).toBeVisible();

  await page
    .getByRole('checkbox', { name: 'J’ai compris que tout sera effacé définitivement' })
    .check();
  await page.getByRole('button', { name: 'Tout effacer' }).click();
  await expect(page.getByText('Étape 1 sur 4')).toBeVisible();

  // Comme sur un nouvel appareil : on récupère la sauvegarde dès le premier lancement.
  await page.getByRole('button', { name: 'J’ai déjà une sauvegarde Kolo' }).click();
  await page.getByLabel('Fichier de sauvegarde').setInputFiles(backupPath);
  await expect(page.getByText('Opérations : 1')).toBeVisible();
  await page.getByRole('button', { name: 'Restaurer ce fichier' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Accueil' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Vos soldes' })).toContainText('987,50');
  await page.goto('/activity');
  await expect(page.getByText('Marché du samedi')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Marché du samedi')).toBeVisible();
});

test('une restauration invalide ne touche à rien', async ({ page }) => {
  await onboardWithAccount(page, 'Caisse', '1000');
  await addExpense(page, '5', 'Pain');
  await page.goto('/more/backup');
  await page.getByLabel('Fichier de sauvegarde').setInputFiles({
    name: 'faux.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{ ceci n’est pas du JSON'),
  });
  await expect(page.getByRole('alert')).toContainText('Ce fichier n’est pas lisible');
  await expect(page.getByRole('alert')).toContainText(
    'Vos données actuelles n’ont pas été modifiées.',
  );
  await page.goto('/activity');
  await expect(page.getByText('Pain')).toBeVisible();
});

test('export CSV, recherche et rapport mensuel', async ({ page }) => {
  await onboardWithAccount(page, 'Caisse', '1000');
  await addExpense(page, '30', 'Marché');
  await addExpense(page, '10', 'Bus');

  await page.goto('/more/backup');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Télécharger le CSV' }).click(),
  ]);
  const csv = await readFile(await download.path(), 'utf8');
  expect(csv.startsWith('﻿Identifiant,Date,Type,Montant')).toBe(true);
  expect(csv).toContain(',Dépense,-30.00,EUR,Caisse,');

  await page.goto('/activity');
  await page.getByRole('searchbox', { name: 'Rechercher' }).fill('marche');
  await expect(page.getByRole('status')).toHaveText('1 opération(s) trouvée(s)');
  await expect(page.getByText('Bus')).toBeHidden();
  // La recherche reste dans l'adresse : elle survit à un rechargement.
  await page.reload();
  await expect(page.getByRole('searchbox', { name: 'Rechercher' })).toHaveValue('marche');

  await page.goto('/more/reports');
  const report = page.getByRole('region', { name: 'EUR' });
  await expect(report).toContainText('40,00');
  await expect(report).toContainText('Pas encore assez de données');
});
