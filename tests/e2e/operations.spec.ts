import { expect, test } from '@playwright/test';
import { onboardWithAccount } from './helpers';

test.use({ locale: 'fr-FR' });

test('parcours complet : compte, revenu, transfert, modification et suppression', async ({
  page,
}) => {
  await onboardWithAccount(page, 'Banque', '500');
  const balances = page.getByRole('region', { name: 'Vos soldes' });
  await expect(balances).toContainText('500,00');

  // Deuxième compte en euros, pour un transfert.
  await page.goto('/more/accounts/new');
  await page.getByLabel('Nom du compte').fill('Caisse');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Compte enregistré.')).toBeVisible();

  // Revenu.
  await page.goto('/activity/new?type=income');
  await page.getByLabel('Montant').fill('1200');
  await page.getByLabel('Catégorie').selectOption({ label: 'Salaire' });
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('link', { name: /Salaire/ })).toContainText('+1');

  // Transfert de la banque vers la caisse : le total ne change pas.
  await page.getByRole('link', { name: 'Transfert' }).click();
  await page.getByLabel('Montant').fill('50');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('link', { name: /Banque → Caisse/ })).toBeVisible();
  await page.goto('/');
  await expect(balances).toContainText('1 700,00');

  // Modification puis suppression du revenu.
  await page.goto('/activity');
  await page.getByRole('link', { name: /Salaire/ }).click();
  await page.getByLabel('Montant').fill('1000');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('link', { name: /Salaire/ })).toContainText('1 000,00');
  await page.getByRole('link', { name: /Salaire/ }).click();
  await page.getByRole('button', { name: 'Supprimer l’opération' }).click();
  await page.getByRole('button', { name: 'Oui, supprimer' }).click();
  await expect(page.getByText('Opération supprimée.')).toBeVisible();
  await page.goto('/');
  await expect(balances).toContainText('500,00');

  // Comptes : soldes recalculés après le transfert.
  await page.goto('/more/accounts');
  await expect(page.getByRole('link', { name: /Banque/ })).toContainText('450,00');
  await expect(page.getByRole('link', { name: /Caisse/ })).toContainText('50,00');
});
