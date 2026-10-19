import { expect, type Page } from '@playwright/test';

/** Termine le premier lancement (navigateur en français) sans compte ni limite. */
export async function skipOnboarding(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByLabel('Devise')).toHaveValue('EUR');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Passer cette étape' }).click();
  await page.getByRole('button', { name: 'Passer et commencer' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Accueil' })).toBeVisible();
}

/** Termine le premier lancement en créant un compte en euros, sans limite. */
export async function onboardWithAccount(page: Page, name: string, opening: string) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByLabel('Nom du compte').fill(name);
  await page.getByLabel('Solde initial', { exact: true }).fill(opening);
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Passer et commencer' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Accueil' })).toBeVisible();
}
