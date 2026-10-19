import { expect, test } from '@playwright/test';

test.use({ locale: 'fr-FR' });

test('la liste des devises a un fond plein et lisible dans le thème sombre', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continuer' }).click();
  const option = page.getByLabel('Devise').locator('option').first();
  // Fond plein (pas translucide) : sinon Windows affiche une liste claire au texte clair.
  await expect(option).toHaveCSS('background-color', 'rgb(15, 34, 27)');
  await expect(option).toHaveCSS('color', 'rgb(236, 253, 245)');
});
