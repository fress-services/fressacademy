import { expect, test } from '@playwright/test';
import { onboardWithAccount } from './helpers';

test.use({ locale: 'fr-FR' });

test('dette avec deux remboursements : solde restant et statut évoluent, historique conservé', async ({
  page,
}) => {
  await onboardWithAccount(page, 'Caisse', '100');
  await page.goto('/debts/new');
  await page.getByLabel('Personne ou libellé').fill('Awa');
  await page.getByLabel('Montant initial').fill('30');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Dette enregistrée.')).toBeVisible();

  const form = page.getByRole('form', { name: 'Enregistrer un remboursement' });
  for (const amount of ['10', '20']) {
    await form.getByLabel('Montant remboursé').fill(amount);
    await form.getByRole('checkbox', { name: 'Enregistrer dans un compte' }).check();
    await form.getByLabel('Compte', { exact: true }).selectOption({ label: 'Caisse (EUR)' });
    await form.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Remboursement enregistré.')).toBeVisible();
    if (amount === '10') await expect(page.getByText('Partiellement remboursée')).toBeVisible();
  }

  await expect(page.getByText('Cette dette est entièrement réglée.')).toBeVisible();
  const card = page.getByRole('region', { name: 'Awa' });
  await expect(card).toContainText('Réglée');
  await expect(
    page.getByRole('region', { name: 'Remboursements' }).getByRole('listitem'),
  ).toHaveCount(2);

  // Les remboursements entrent sur le compte sans compter comme revenus.
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Vos soldes' })).toContainText('130,00');
  await expect(page.getByText(/Aucun revenu ni dépense/)).toBeVisible();
});

test('dépense prévue payée : une seule opération, elle quitte « à venir »', async ({ page }) => {
  await onboardWithAccount(page, 'Caisse', '100');
  await page.goto('/more/planned/new');
  await page.getByLabel('Libellé').fill('Loyer');
  await page.getByLabel('Montant').fill('60');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Dépense prévue enregistrée.')).toBeVisible();

  await page.goto('/');
  const upcoming = page.getByRole('region', { name: 'À venir' });
  await expect(upcoming).toContainText('Loyer');
  await expect(page.getByRole('region', { name: 'Vos soldes' })).toContainText('100,00');

  await upcoming.getByRole('link', { name: /Loyer/ }).click();
  await page.getByRole('button', { name: 'Marquer comme payée' }).click();
  await page.getByRole('button', { name: 'Confirmer le paiement' }).dblclick();
  await expect(
    page.getByText('Dépense payée : l’opération a été ajoutée à l’activité.'),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Loyer/ })).toHaveCount(1);

  await page.reload();
  await expect(page.getByRole('link', { name: /Loyer/ })).toHaveCount(1);
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'À venir' })).not.toContainText('Loyer');
  await expect(page.getByRole('region', { name: 'Vos soldes' })).toContainText('40,00');
});
