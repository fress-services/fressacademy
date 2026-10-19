import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalRepositories } from '../data/local/repositories';
import { createAccount } from '../services/accounts';
import { setMonthlyBudget } from '../services/budget';
import { ensureSystemCategories } from '../services/categories';
import { saveTransaction } from '../services/transactions';
import { newTestDatabase } from '../test/database';
import { renderApp } from '../test/renderApp';

// Le 19 octobre 2026 : 13 jours restants, aujourd'hui inclus.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 19, 10, 0, 0) });
});
afterEach(() => {
  vi.useRealTimers();
});

async function seed({ budgetMinor }: { budgetMinor?: number } = {}) {
  const repositories = createLocalRepositories(newTestDatabase());
  await ensureSystemCategories(repositories);
  const account = await createAccount(repositories, {
    name: 'Caisse',
    type: 'cash',
    currencyCode: 'EUR',
    openingBalanceMinor: 100000,
    openingDate: '2026-01-01',
  });
  const food = (await repositories.categories.list()).find((c) => c.systemKey === 'food')!.id;
  const spend = (amountMinor: number, date: string) =>
    saveTransaction(repositories, {
      type: 'expense',
      amountMinor,
      accountId: account.id,
      fromAccountId: null,
      toAccountId: null,
      categoryId: food,
      date,
      title: '',
      note: '',
    });
  if (budgetMinor) {
    await setMonthlyBudget(
      repositories,
      { limitMinor: budgetMinor, currencyCode: 'EUR' },
      '2026-10',
    );
  }
  return { repositories, account, spend };
}

describe('budget', () => {
  it('définit une limite et affiche le reste et le montant par jour', async () => {
    const user = userEvent.setup();
    const { repositories, spend } = await seed();
    await spend(7100, '2026-10-05');
    await spend(5000, '2026-09-30'); // mois précédent : ne compte pas
    await renderApp('/budget', { repositories });

    await user.click(await screen.findByRole('button', { name: 'Définir une limite' }));
    await user.type(screen.getByRole('textbox', { name: 'Limite par mois' }), '300');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Limite enregistrée.')).toBeInTheDocument();
    const card = await screen.findByRole('region', { name: 'Budget de octobre 2026' });
    // (300 − 71) / 13 = 17,615… → 17,61 €.
    expect(within(card).getByText(/17,61\s€/)).toBeInTheDocument();
    expect(within(card).getByText(/229,00\s€/)).toBeInTheDocument();
    expect(within(card).getByText(/71,00\s€/)).toBeInTheDocument();
    expect(within(card).getByText(/13 jour\(s\), aujourd’hui inclus/)).toBeInTheDocument();
    expect(await repositories.budgets.list()).toMatchObject([
      { startMonth: '2026-10', limitMinor: 30000 },
    ]);
  });

  it('montre un dépassement sans le cacher, avec zéro par jour', async () => {
    const { repositories, spend } = await seed({ budgetMinor: 10000 });
    await spend(12500, '2026-10-02');
    await renderApp('/budget', { repositories });

    const card = await screen.findByRole('region', { name: 'Budget de octobre 2026' });
    expect(within(card).getByText('Budget dépassé')).toBeInTheDocument();
    expect(within(card).getByText(/dépassé la limite de 25,00\s€/)).toBeInTheDocument();
    expect(within(card).getByText(/-25,00\s€/)).toBeInTheDocument();
  });

  it('se met à jour quand une dépense est ajoutée ou supprimée', async () => {
    const user = userEvent.setup();
    const { repositories, spend } = await seed({ budgetMinor: 26000 });
    const expense = await spend(13000, '2026-10-01');
    await renderApp('/budget', { repositories });
    const card = await screen.findByRole('region', { name: 'Budget de octobre 2026' });
    expect(within(card).getByText(/10,00\s€/)).toBeInTheDocument(); // 130 / 13

    await user.click(screen.getByRole('link', { name: 'Activité' }));
    await user.click(await screen.findByRole('link', { name: /Alimentation/ }));
    await user.click(await screen.findByRole('button', { name: 'Supprimer l’opération' }));
    await user.click(screen.getByRole('button', { name: 'Oui, supprimer' }));
    await screen.findByText('Opération supprimée.');
    expect(await repositories.transactions.getById(expense.id)).toBeUndefined();

    await user.click(screen.getByRole('link', { name: 'Budget' }));
    const updated = await screen.findByRole('region', { name: 'Budget de octobre 2026' });
    expect(within(updated).getByText(/20,00\s€/)).toBeInTheDocument(); // 260 / 13
  });

  it('modifie puis retire la limite', async () => {
    const user = userEvent.setup();
    const { repositories } = await seed({ budgetMinor: 26000 });
    await renderApp('/budget', { repositories });

    await user.click(await screen.findByRole('button', { name: 'Modifier la limite' }));
    const limit = screen.getByRole('textbox', { name: 'Limite par mois' });
    expect(limit).toHaveValue('260,00');
    await user.clear(limit);
    await user.type(limit, '390');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    const card = await screen.findByRole('region', { name: 'Budget de octobre 2026' });
    expect(within(card).getByText(/30,00\s€/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retirer la limite' }));
    await user.click(screen.getByRole('button', { name: 'Oui, supprimer' }));
    expect(await screen.findByText('Limite retirée.')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Aucune limite de dépenses' }),
    ).toBeInTheDocument();
    expect(await repositories.budgets.list()).toHaveLength(0);
  });

  it('refuse une limite vide ou nulle', async () => {
    const user = userEvent.setup();
    const { repositories } = await seed();
    await renderApp('/budget', { repositories });
    await user.click(await screen.findByRole('button', { name: 'Définir une limite' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(screen.getByText('Saisissez un montant.')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Limite par mois' }), '0');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(screen.getByText('Le montant doit être supérieur à zéro.')).toBeInTheDocument();
    expect(await repositories.budgets.list()).toHaveLength(0);
  });
});

describe('tableau de bord', () => {
  it('affiche revenus et dépenses du mois et permet de voir le mois précédent', async () => {
    const user = userEvent.setup();
    const { repositories, spend } = await seed({ budgetMinor: 26000 });
    await spend(1300, '2026-10-03');
    await spend(4200, '2026-09-12');
    await renderApp('/', { repositories });

    const month = await screen.findByRole('region', { name: 'octobre 2026' });
    expect(within(month).getByText(/13,00\s€/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mois suivant' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Mois précédent' }));
    const september = await screen.findByRole('region', { name: 'septembre 2026' });
    expect(within(september).getByText(/42,00\s€/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mois précédent' }));
    expect(await screen.findByText('Aucun revenu ni dépense en août 2026.')).toBeInTheDocument();
  });

  it('résume le budget du mois en cours', async () => {
    const { repositories, spend } = await seed({ budgetMinor: 26000 });
    await spend(13000, '2026-10-01');
    await renderApp('/', { repositories });
    const budget = await screen.findByRole('region', { name: 'Budget du mois' });
    expect(within(budget).getByText(/10,00\s€/)).toBeInTheDocument();
    expect(within(budget).getByRole('link', { name: 'Voir le budget' })).toHaveAttribute(
      'href',
      '/budget',
    );
  });

  it('propose de définir une limite quand il n’y en a pas', async () => {
    const { repositories } = await seed();
    await renderApp('/', { repositories });
    const budget = await screen.findByRole('region', { name: 'Budget du mois' });
    expect(within(budget).getByRole('link', { name: 'Définir une limite' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Vos soldes' })).toBeInTheDocument(),
    );
  });
});
