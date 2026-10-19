import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createLocalRepositories } from '../data/local/repositories';
import type { KoloRepositories } from '../data/repositories/types';
import type { CurrencyCode } from '../domain/currencies';
import { createAccount } from '../services/accounts';
import { ensureSystemCategories } from '../services/categories';
import { saveTransaction } from '../services/transactions';
import { newTestDatabase } from '../test/database';
import { renderApp } from '../test/renderApp';

async function seed(accounts: { name: string; currency?: CurrencyCode; opening?: number }[]) {
  const repositories = createLocalRepositories(newTestDatabase());
  await ensureSystemCategories(repositories);
  const created = [];
  for (const account of accounts) {
    created.push(
      await createAccount(repositories, {
        name: account.name,
        type: 'cash',
        currencyCode: account.currency ?? 'EUR',
        openingBalanceMinor: account.opening ?? 0,
        openingDate: '2026-01-01',
      }),
    );
  }
  return { repositories, accounts: created };
}

async function otherExpenseId(repositories: KoloRepositories): Promise<string> {
  const categories = await repositories.categories.list();
  return categories.find((category) => category.systemKey === 'otherExpense')!.id;
}

describe('premier lancement', () => {
  it('guide langue, devise et premier compte, puis affiche le solde', async () => {
    const user = userEvent.setup();
    const { repositories } = await renderApp('/', { onboarded: false });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Bienvenue sur Kolo' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Étape 1 sur 4')).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Navigation principale' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuer' }));

    expect(
      screen.getByRole('heading', { level: 1, name: 'Votre devise principale' }),
    ).toBeInTheDocument();
    // jsdom annonce « en-US » : USD est suggéré, l'utilisateur choisit le franc CFA.
    expect(screen.getByText(/Suggestion d’après votre navigateur : USD/)).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Devise' }), 'XAF');
    await user.click(screen.getByRole('button', { name: 'Continuer' }));

    expect(
      screen.getByRole('heading', { level: 1, name: 'Votre premier compte' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Devise' })).toHaveValue('XAF');
    await user.type(screen.getByRole('textbox', { name: 'Nom du compte' }), 'Espèces');
    await user.type(screen.getByRole('textbox', { name: 'Solde initial' }), '15000');
    await user.click(screen.getByRole('button', { name: 'Continuer' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Limite mensuelle de dépenses' }),
    ).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Limite par mois' }), '90000');
    await user.click(screen.getByRole('button', { name: 'Commencer' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Accueil' })).toBeInTheDocument();
    const balances = await screen.findByRole('region', { name: 'Vos soldes' });
    expect(within(balances).getAllByText(/15\s000\sFCFA/)).toHaveLength(2);
    expect(await repositories.accounts.list()).toHaveLength(1);
    expect(await repositories.budgets.list()).toMatchObject([
      { currencyCode: 'XAF', limitMinor: 90000 },
    ]);
    const preferences = await repositories.preferences.get();
    expect(preferences.defaultCurrency).toBe('XAF');
    expect(preferences.onboardingCompletedAt).not.toBeNull();
  });

  it('permet de passer la création du compte', async () => {
    const user = userEvent.setup();
    const { repositories } = await renderApp('/', { onboarded: false });
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    await user.click(screen.getByRole('button', { name: 'Passer cette étape' }));
    await user.click(await screen.findByRole('button', { name: 'Passer et commencer' }));

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Commencez par un compte' }),
    ).toBeInTheDocument();
    expect(await repositories.accounts.list()).toHaveLength(0);
  });

  it('exige une devise et un nom de compte', async () => {
    const user = userEvent.setup();
    await renderApp('/', { onboarded: false, language: 'en' });
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('This field is required.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Account name' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});

describe('comptes', () => {
  it('crée un compte et l’affiche avec son solde', async () => {
    const user = userEvent.setup();
    await renderApp('/more/accounts');
    await user.click(await screen.findByRole('link', { name: 'Ajouter un compte' }));
    await user.type(screen.getByRole('textbox', { name: 'Nom du compte' }), 'Banque');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Type' }), 'checking');
    await user.type(screen.getByRole('textbox', { name: 'Solde initial' }), '1 250,40');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Compte enregistré.')).toBeInTheDocument();
    const link = await screen.findByRole('link', { name: /Banque/ });
    expect(link).toHaveTextContent(/Compte courant · EUR/);
    expect(link).toHaveTextContent(/1\s250,40\s€/);
  });

  it('ajuste le solde par une opération datée, sans toucher au solde initial', async () => {
    const user = userEvent.setup();
    const { repositories, accounts } = await seed([{ name: 'Caisse', opening: 10000 }]);
    await renderApp(`/more/accounts/${accounts[0]!.id}`, { repositories });

    const form = await screen.findByRole('form', { name: 'Ajuster le solde' });
    await user.type(within(form).getByRole('textbox', { name: 'Solde réel' }), '80');
    await user.click(within(form).getByRole('button', { name: 'Enregistrer l’ajustement' }));

    expect(await screen.findByText('Ajustement enregistré.')).toBeInTheDocument();
    expect(within(form).getByText(/80,00\s€/)).toBeInTheDocument();
    const [adjustment] = await repositories.transactions.list();
    expect(adjustment).toMatchObject({ type: 'adjustment', flow: 'out', amountMinor: 2000 });
    expect((await repositories.accounts.getById(accounts[0]!.id))?.openingBalanceMinor).toBe(10000);
  });

  it('refuse la suppression d’un compte utilisé et verrouille sa devise', async () => {
    const { repositories, accounts } = await seed([{ name: 'Caisse', opening: 10000 }]);
    await saveTransaction(repositories, {
      type: 'expense',
      amountMinor: 500,
      accountId: accounts[0]!.id,
      fromAccountId: null,
      toAccountId: null,
      categoryId: await otherExpenseId(repositories),
      date: '2026-02-01',
      title: '',
      note: '',
    });
    await renderApp(`/more/accounts/${accounts[0]!.id}`, { repositories });

    expect(await screen.findByText(/il ne peut pas être supprimé/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Supprimer définitivement' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Devise' })).toBeDisabled();
  });

  it('archive un compte puis supprime un compte inutilisé', async () => {
    const user = userEvent.setup();
    const { repositories, accounts } = await seed([{ name: 'Caisse' }, { name: 'Vieux compte' }]);
    await renderApp(`/more/accounts/${accounts[0]!.id}`, { repositories });

    await user.click(await screen.findByRole('button', { name: 'Archiver le compte' }));
    expect(await screen.findByText('Compte archivé.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Réactiver le compte' })).toBeInTheDocument();
    expect((await repositories.accounts.getById(accounts[0]!.id))?.archivedAt).not.toBeNull();

    await user.click(screen.getByRole('link', { name: 'Retour' }));
    const archived = await screen.findByRole('heading', { level: 2, name: 'Comptes archivés' });
    expect(archived).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Vieux compte/ }));
    await user.click(await screen.findByRole('button', { name: 'Supprimer définitivement' }));
    await user.click(screen.getByRole('button', { name: 'Oui, supprimer' }));
    expect(await screen.findByText('Compte supprimé.')).toBeInTheDocument();
    expect(await repositories.accounts.list()).toHaveLength(1);
  });
});

describe('opérations', () => {
  it('ajoute une dépense et met à jour l’activité et le solde', async () => {
    const user = userEvent.setup();
    const { repositories } = await seed([{ name: 'Caisse', opening: 10000 }]);
    await renderApp('/activity/new?type=expense', { repositories });

    expect(await screen.findByRole('radio', { name: 'Dépense' })).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Catégorie' })).toHaveDisplayValue(
      'Autres dépenses',
    );
    await user.type(screen.getByRole('textbox', { name: 'Montant' }), '12,50');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Catégorie' }), 'Alimentation');
    await user.type(screen.getByRole('textbox', { name: 'Libellé' }), 'Marché');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Opération enregistrée.')).toBeInTheDocument();
    const item = await screen.findByRole('link', { name: /Marché/ });
    expect(item).toHaveTextContent(/Alimentation · Caisse/);
    expect(item).toHaveTextContent(/-12,50\s€/);

    await user.click(screen.getByRole('link', { name: 'Accueil' }));
    expect((await screen.findAllByText(/87,50\s€/)).length).toBeGreaterThan(0);
  });

  it('signale un montant invalide sans rien enregistrer', async () => {
    const user = userEvent.setup();
    const { repositories } = await seed([{ name: 'Caisse' }]);
    await renderApp('/activity/new?type=income', { repositories });

    const amount = await screen.findByRole('textbox', { name: 'Montant' });
    await user.type(amount, '12,345');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(
      screen.getByText('Cette devise accepte au maximum 2 chiffre(s) après la virgule.'),
    ).toBeInTheDocument();
    expect(amount).toHaveAttribute('aria-invalid', 'true');

    await user.clear(amount);
    await user.type(amount, '0');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(screen.getByText('Le montant doit être supérieur à zéro.')).toBeInTheDocument();
    expect(await repositories.transactions.list()).toHaveLength(0);
  });

  it('modifie puis supprime une opération', async () => {
    const user = userEvent.setup();
    const { repositories, accounts } = await seed([{ name: 'Caisse', opening: 10000 }]);
    const saved = await saveTransaction(repositories, {
      type: 'expense',
      amountMinor: 1000,
      accountId: accounts[0]!.id,
      fromAccountId: null,
      toAccountId: null,
      categoryId: await otherExpenseId(repositories),
      date: '2026-02-01',
      title: 'Taxi',
      note: '',
    });
    await renderApp('/activity', { repositories });

    await user.click(await screen.findByRole('link', { name: /Taxi/ }));
    const amount = await screen.findByRole('textbox', { name: 'Montant' });
    expect(amount).toHaveValue('10,00');
    await user.clear(amount);
    await user.type(amount, '15');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByRole('link', { name: /Taxi/ })).toHaveTextContent(/-15,00\s€/);
    expect((await repositories.transactions.getById(saved.id))?.amountMinor).toBe(1500);

    await user.click(screen.getByRole('link', { name: /Taxi/ }));
    await user.click(await screen.findByRole('button', { name: 'Supprimer l’opération' }));
    await user.click(screen.getByRole('button', { name: 'Oui, supprimer' }));
    expect(await screen.findByText('Opération supprimée.')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Aucune opération pour l’instant' }),
    ).toBeInTheDocument();
  });

  it('transfère entre deux comptes de même devise sans changer le total', async () => {
    const user = userEvent.setup();
    const { repositories, accounts } = await seed([
      { name: 'Banque', opening: 50000 },
      { name: 'Caisse', opening: 0 },
    ]);
    await renderApp('/activity/new?type=transfer', { repositories });

    expect(await screen.findByRole('combobox', { name: 'Depuis le compte' })).toHaveDisplayValue(
      'Banque (EUR)',
    );
    expect(screen.getByRole('combobox', { name: 'Vers le compte' })).toHaveDisplayValue(
      'Caisse (EUR)',
    );
    await user.type(screen.getByRole('textbox', { name: 'Montant' }), '30');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByRole('link', { name: /Banque → Caisse/ })).toHaveTextContent(
      /30,00\s€/,
    );
    const [transfer] = await repositories.transactions.list();
    expect(transfer).toMatchObject({
      type: 'transfer',
      fromAccountId: accounts[0]!.id,
      toAccountId: accounts[1]!.id,
      categoryId: null,
    });
    await user.click(screen.getByRole('link', { name: 'Accueil' }));
    expect(await screen.findByText(/500,00\s€/)).toBeInTheDocument();
  });

  it('refuse un transfert entre deux devises', async () => {
    const user = userEvent.setup();
    const { repositories } = await seed([
      { name: 'Banque', opening: 50000 },
      { name: 'Mobile', currency: 'XAF' },
    ]);
    await renderApp('/activity/new?type=transfer', { repositories });

    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Vers le compte' }),
      'Mobile (XAF)',
    );
    await user.type(screen.getByRole('textbox', { name: 'Montant' }), '30');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(
      await screen.findByText('Les deux comptes doivent avoir la même devise.'),
    ).toBeInTheDocument();
    expect(await repositories.transactions.list()).toHaveLength(0);
  });

  it('demande un compte avant toute opération', async () => {
    await renderApp('/activity/new');
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Ajoutez d’abord un compte' }),
    ).toBeInTheDocument();
  });

  it('affiche les soldes par devise sans les additionner', async () => {
    const { repositories } = await seed([
      { name: 'Banque', opening: 50000 },
      { name: 'Mobile', currency: 'XAF', opening: 20000 },
    ]);
    await renderApp('/', { repositories });
    const balances = await screen.findByRole('region', { name: 'Vos soldes' });
    expect(within(balances).getAllByText(/500,00\s€/)).toHaveLength(2);
    expect(within(balances).getAllByText(/20\s000\sFCFA/)).toHaveLength(2);
    expect(within(balances).getByText(/n’additionne jamais deux devises/)).toBeInTheDocument();
  });
});

describe('catégories', () => {
  it('ajoute, renomme et archive une catégorie personnelle', async () => {
    const user = userEvent.setup();
    const { repositories } = await renderApp('/more/categories');
    const expenses = await screen.findByRole('region', { name: 'Catégories de dépenses' });
    expect(
      within(expenses).queryByRole('button', { name: 'Renommer Logement' }),
    ).not.toBeInTheDocument();

    await user.type(
      within(expenses).getByRole('textbox', { name: 'Nouvelle catégorie de dépense' }),
      'Tontine',
    );
    await user.click(within(expenses).getByRole('button', { name: 'Ajouter' }));
    await user.click(await within(expenses).findByRole('button', { name: 'Renommer Tontine' }));
    const name = within(expenses).getByRole('textbox', { name: 'Nom de la catégorie' });
    await user.clear(name);
    await user.type(name, 'Cotisations');
    await user.click(within(expenses).getByRole('button', { name: 'Enregistrer' }));
    await user.click(await within(expenses).findByRole('button', { name: 'Archiver Cotisations' }));

    await waitFor(async () => {
      const custom = (await repositories.categories.list()).find((category) => !category.systemKey);
      expect(custom).toMatchObject({ customName: 'Cotisations', kind: 'expense' });
      expect(custom?.archivedAt).not.toBeNull();
    });
    expect(
      await within(expenses).findByRole('button', { name: 'Réactiver Cotisations' }),
    ).toBeInTheDocument();
  });
});
