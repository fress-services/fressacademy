import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { onboardWithAccount } from './helpers';

test.use({ locale: 'fr-FR' });

const PAGES = [
  '/',
  '/activity',
  '/activity/new?type=expense',
  '/budget',
  '/debts',
  '/debts/new',
  '/more',
  '/more/accounts',
  '/more/categories',
  '/more/planned/new',
  '/more/goals/new',
  '/more/reports',
  '/more/backup',
  '/more/settings',
  '/more/data',
];

/** Audit automatique WCAG 2.2 A et AA (axe) : aucune violation tolérée. */
async function audit(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const summary = results.violations.map(
    (violation) =>
      `${label} : ${violation.id} (${violation.impact}) ${violation.nodes
        .map((node) => node.target.join(' '))
        .join(', ')}`,
  );
  expect(summary).toEqual([]);
  expect(results.passes.length).toBeGreaterThan(0);
}

async function seed(page: Page) {
  await onboardWithAccount(page, 'Caisse', '1000');
  await page.goto('/activity/new?type=expense');
  await page.getByLabel('Montant').fill('12');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Opération enregistrée.')).toBeVisible();
}

test('premier lancement accessible', async ({ page }) => {
  await page.goto('/');
  await audit(page, 'premier lancement');
});

for (const theme of ['Sombre', 'Clair'] as const) {
  test(`pages principales accessibles (thème ${theme.toLowerCase()})`, async ({ page }) => {
    await seed(page);
    if (theme === 'Clair') {
      await page.goto('/more/settings');
      await page.getByRole('radio', { name: 'Clair' }).click();
      await expect(page.getByRole('radio', { name: 'Clair' })).toBeChecked();
      await expect(page.getByText('Préférence enregistrée.')).toBeVisible();
    }
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await audit(page, `${path} (${theme})`);
    }
  });
}
