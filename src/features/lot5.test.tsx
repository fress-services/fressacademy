import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { accountBalance } from '../domain/balances';
import { createLocalRepositories } from '../data/local/repositories';
import { createAccount } from '../services/accounts';
import { ensureSystemCategories } from '../services/categories';
import { addRepayment, createDebt } from '../services/debts';
import { createPlanned } from '../services/planned';
import { newTestDatabase } from '../test/database';
import { renderApp } from '../test/renderApp';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 19, 10, 0, 0) });
});
afterEach(() => {
  vi.useRealTimers();
});

async function seed() {
  const repositories = createLocalRepositories(newTestDatabase());
  await ensureSystemCategories(repositories);
  const account = await createAccount(repositories, {
    name: 'Caisse',
    type: 'cash',
    currencyCode: 'EUR',
    openingBalanceMinor: 10000,
    openingDate: '2026-01-01',
  });
  const balance = async () =>
    accountBalance(
      (await repositories.accounts.getById(account.id))!,
      await repositories.transactions.list(),
    );
  return { repositories, account, balance };
}

describe('dettes', () => {
  it('crée un prêt lié au compte puis enregistre deux remboursements', async () => {
    const user = userEvent.setup();
    const { repositories, balance } = await seed();
    await renderApp('/debts', { repositories });

    await user.click(await screen.findByRole('link', { name: 'Ajouter une dette' }));
    await user.type(await screen.findByRole('textbox', { name: 'Personne ou libellé' }), 'Awa');
    await user.type(screen.getByRole('textbox', { name: 'Montant initial' }), '30');
    await user.click(
      screen.getByRole('checkbox', { name: 'Enregistrer ce mouvement d’argent dans un compte' }),
    );
    await user.selectOptions(screen.getByRole('combobox', { name: 'Compte' }), 'Caisse (EUR)');
    expect(screen.getByText(/L’argent prêté sort du compte choisi/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Dette enregistrée.')).toBeInTheDocument();
    expect(await balance()).toBe(7000);

    const form = screen.getByRole('form', { name: 'Enregistrer un remboursement' });
    await user.type(within(form).getByRole('textbox', { name: 'Montant remboursé' }), '10');
    await user.click(within(form).getByRole('checkbox', { name: 'Enregistrer dans un compte' }));
    await user.selectOptions(
      within(form).getByRole('combobox', { name: 'Compte' }),
      'Caisse (EUR)',
    );
    await user.click(within(form).getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Remboursement enregistré.')).toBeInTheDocument();

    const second = screen.getByRole('form', { name: 'Enregistrer un remboursement' });
    await user.type(within(second).getByRole('textbox', { name: 'Montant remboursé' }), '25');
    await user.click(within(second).getByRole('button', { name: 'Enregistrer' }));
    expect(
      await within(second).findByText('Le montant dépasse ce qui reste à rembourser.'),
    ).toBeInTheDocument();
    const amount = within(second).getByRole('textbox', { name: 'Montant remboursé' });
    await user.clear(amount);
    await user.type(amount, '5');
    await user.click(within(second).getByRole('button', { name: 'Enregistrer' }));
    await waitFor(async () => expect(await repositories.debtRepayments.list()).toHaveLength(2));

    const card = screen.getByRole('region', { name: 'Awa' });
    expect(within(card).getByText('Partiellement remboursée')).toBeInTheDocument();
    expect(within(card).getAllByText(/15,00\s€/)).toHaveLength(2); // remboursé et restant
    expect(await balance()).toBe(8000); // seul le remboursement de 10 € est lié au compte
    const repayments = screen.getByRole('region', { name: 'Remboursements' });
    expect(within(repayments).getByText('Hors comptes')).toBeInTheDocument();
    expect(within(repayments).getByText('Enregistré sur Caisse')).toBeInTheDocument();
  });

  it('montre le statut et l’échéance dépassée dans la liste', async () => {
    const { repositories } = await seed();
    const debt = await createDebt(repositories, {
      direction: 'payable',
      contactLabel: 'Paul',
      originalAmountMinor: 5000,
      currencyCode: 'EUR',
      createdDate: '2026-09-01',
      dueDate: '2026-10-01',
      note: '',
      accountId: null,
    });
    await addRepayment(repositories, debt.id, {
      amountMinor: 1000,
      date: '2026-09-15',
      note: '',
      accountId: null,
    });
    await renderApp('/debts?direction=payable', { repositories });
    const link = await screen.findByRole('link', { name: /Paul/ });
    expect(link).toHaveTextContent('Partiellement remboursée');
    expect(link).toHaveTextContent('En retard');
    expect(link).toHaveTextContent(/40,00\s€/);
  });

  it('le règlement dans l’activité renvoie vers la dette et ne se supprime pas ici', async () => {
    const user = userEvent.setup();
    const { repositories, account } = await seed();
    const debt = await createDebt(repositories, {
      direction: 'receivable',
      contactLabel: 'Awa',
      originalAmountMinor: 3000,
      currencyCode: 'EUR',
      createdDate: '2026-10-02',
      dueDate: null,
      note: '',
      accountId: account.id,
    });
    await renderApp(`/activity/${debt.openingTransactionId}`, { repositories });
    expect(
      await screen.findByText('Règlement de dette : il se gère depuis la dette concernée.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Supprimer l’opération' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Voir la dette' }));
    expect(await screen.findByRole('region', { name: 'Awa' })).toBeInTheDocument();
  });
});

describe('dépenses prévues', () => {
  it('ajoute une dépense prévue sans toucher au solde, puis la paie une seule fois', async () => {
    const user = userEvent.setup();
    const { repositories, balance } = await seed();
    await renderApp('/more/planned', { repositories });

    await user.click(await screen.findByRole('link', { name: 'Ajouter une dépense prévue' }));
    await user.type(await screen.findByRole('textbox', { name: 'Libellé' }), 'Loyer');
    await user.type(screen.getByRole('textbox', { name: 'Montant' }), '60');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Dépense prévue enregistrée.')).toBeInTheDocument();
    expect(await balance()).toBe(10000);

    await user.click(screen.getByRole('link', { name: /Loyer/ }));
    await user.click(await screen.findByRole('button', { name: 'Marquer comme payée' }));
    const pay = screen.getByRole('form', { name: 'Marquer comme payée' });
    expect(within(pay).getByText(/dépense réelle de 60,00\s€/)).toBeInTheDocument();
    const confirm = within(pay).getByRole('button', { name: 'Confirmer le paiement' });
    await user.dblClick(confirm);

    expect(
      await screen.findByText('Dépense payée : l’opération a été ajoutée à l’activité.'),
    ).toBeInTheDocument();
    const transactions = await repositories.transactions.list();
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({ type: 'expense', amountMinor: 6000, title: 'Loyer' });
    expect(await balance()).toBe(4000);
    expect(await screen.findByRole('link', { name: /Loyer/ })).toBeInTheDocument();

    // L'opération créée reste une dépense : son type n'est pas modifiable.
    cleanup();
    await renderApp(`/activity/${transactions[0]!.id}`, { repositories });
    expect(
      await screen.findByText('Cette opération paie une dépense prévue : elle reste une dépense.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Revenu' })).not.toBeInTheDocument();
  });

  it('apparaît dans « À venir » sur l’accueil, avec les dettes ouvertes', async () => {
    const { repositories } = await seed();
    await createPlanned(repositories, {
      title: 'Électricité',
      amountMinor: 4500,
      currencyCode: 'EUR',
      dueDate: '2026-10-25',
      categoryId: null,
      accountId: null,
      note: '',
    });
    await createDebt(repositories, {
      direction: 'receivable',
      contactLabel: 'Awa',
      originalAmountMinor: 3000,
      currencyCode: 'EUR',
      createdDate: '2026-10-02',
      dueDate: null,
      note: '',
      accountId: null,
    });
    await renderApp('/', { repositories });
    const upcoming = await screen.findByRole('region', { name: 'À venir' });
    expect(within(upcoming).getByRole('link', { name: /Électricité/ })).toHaveTextContent(
      /45,00\s€/,
    );
    expect(within(upcoming).getByRole('link', { name: /À récupérer/ })).toHaveTextContent(
      /30,00\s€/,
    );
  });
});

describe('objectifs', () => {
  it('crée un objectif et affiche sa progression bornée', async () => {
    const user = userEvent.setup();
    const { repositories, balance } = await seed();
    await renderApp('/more/goals', { repositories });

    await user.click(await screen.findByRole('link', { name: 'Ajouter un objectif' }));
    await user.type(await screen.findByRole('textbox', { name: 'Nom de l’objectif' }), 'Moto');
    await user.type(screen.getByRole('textbox', { name: 'Montant cible' }), '400');
    await user.type(screen.getByRole('textbox', { name: 'Déjà mis de côté' }), '100');
    expect(screen.getByText(/ne modifie aucun solde de compte ni le budget/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText('Objectif enregistré.')).toBeInTheDocument();
    const goal = await screen.findByRole('link', { name: /Moto/ });
    expect(goal).toHaveTextContent('25 %');
    expect(goal).toHaveTextContent(/Reste 300,00\s€/);
    expect(
      within(goal).getByRole('progressbar', { name: 'Progression de l’objectif' }),
    ).toHaveAttribute('value', '25');
    expect(await balance()).toBe(10000);
  });
});
