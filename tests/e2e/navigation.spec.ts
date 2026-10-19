import { expect, test, type Page } from '@playwright/test';

const PAGES = [
  { path: '/', title: 'Accueil' },
  { path: '/activity', title: 'Activité' },
  { path: '/budget', title: 'Budget' },
  { path: '/debts', title: 'Dettes' },
  { path: '/more', title: 'Plus' },
  { path: '/more/settings', title: 'Paramètres' },
  { path: '/more/data', title: 'Vos données' },
];

test.use({ locale: 'fr-FR' });

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test('chaque page s’ouvre directement, sans défilement horizontal', async ({ page }) => {
  for (const { path, title } of PAGES) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expectNoHorizontalScroll(page);
  }
});

test('la navigation principale mène à chaque onglet', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Navigation principale' });
  for (const name of ['Activité', 'Budget', 'Dettes', 'Plus', 'Accueil']) {
    await nav.getByRole('link', { name }).click();
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    await expect(nav.getByRole('link', { name })).toHaveAttribute('aria-current', 'page');
  }
});

test('le lien d’évitement apparaît au clavier et mène au contenu', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Aller au contenu' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
});

test('la langue se change en anglais depuis les paramètres', async ({ page }) => {
  await page.goto('/more/settings');
  await page.getByRole('radio', { name: 'English' }).check();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle('Settings · Kolo');
});

test('un navigateur en anglais affiche l’anglais par défaut', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  await context.close();
});

test('aucune erreur dans la console', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  for (const { path } of PAGES) await page.goto(path);
  expect(errors).toEqual([]);
});
