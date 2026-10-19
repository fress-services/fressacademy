import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalRepositories } from '../data/local/repositories';
import { createAccount } from '../services/accounts';
import { exportBackup } from '../services/backup';
import { ensureSystemCategories } from '../services/categories';
import { createDebt } from '../services/debts';
import { saveTransaction } from '../services/transactions';
import { newTestDatabase } from '../test/database';
import { renderApp } from '../test/renderApp';
import { downloadFile } from './shared/download';

vi.mock('./shared/download', () => ({ downloadFile: vi.fn() }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 19, 10, 0, 0) });
  vi.mocked(downloadFile).mockClear();
});
afterEach(() => {
  vi.useRealTimers();
});

/** Données fictives : un compte, des dépenses et un revenu en octobre et septembre. */
async function seed() {
  const repositories = createLocalRepositories(newTestDatabase());
  await ensureSystemCategories(repositories);
  const account = await createAccount(repositories, {
    name: 'Caisse',
    type: 'cash',
    currencyCode: 'EUR',
    openingBalanceMinor: 100000,
    openingDate: '2026-01-01',
  });
  const categories = await repositories.categories.list();
  const category = (key: string) => categories.find((c) => c.systemKey === key)!.id;
  const add = (
    type: 'income' | 'expense',
    amountMinor: number,
    key: string,
    date: string,
    title: string,
    note = '',
  ) =>
    saveTransaction(repositories, {
      type,
      amountMinor,
      accountId: account.id,
      fromAccountId: null,
      toAccountId: null,
      categoryId: category(key),
      date,
      title,
      note,
    });
  await add('expense', 3000, 'food', '2026-10-05', 'Marché', 'légumes et fruits');
  await add('expense', 1000, 'transport', '2026-10-06', 'Bus');
  await add('income', 20000, 'salary', '2026-10-01', 'Salaire');
  await add('expense', 2500, 'food', '2026-09-12', 'Épicerie');
  await repositories.preferences.update({
    language: 'fr',
    defaultCurrency: 'EUR',
    onboardingCompletedAt: '2026-01-01T00:00:00.000Z',
  });
  return { repositories, account };
}

describe('recherche et filtres de l’activité', () => {
  it('cherche sans accent dans les libellés et notes, puis filtre par type', async () => {
    const user = userEvent.setup();
    const { repositories } = await seed();
    await renderApp('/activity', { repositories });

    await user.type(await screen.findByRole('searchbox', { name: 'Rechercher' }), 'legumes');
    expect(screen.getByRole('status')).toHaveTextContent('1 opération(s) trouvée(s)');
    expect(screen.getByText('Marché')).toBeInTheDocument();
    expect(screen.queryByText('Bus')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Effacer la recherche et les filtres' }));
    expect(screen.getByText('Bus')).toBeInTheDocument();

    await user.click(screen.getByText('Filtres'));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Type' }), 'Revenu');
    expect(screen.getByText('Filtres (1)')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 opération(s) trouvée(s)');
    expect(screen.getByRole('link', { name: /Salaire/ })).toBeInTheDocument();
  });

  it('cherche aussi par nom de catégorie et filtre par période', async () => {
    const user = userEvent.setup();
    const { repositories } = await seed();
    await renderApp('/activity', { repositories });

    await user.type(await screen.findByRole('searchbox', { name: 'Rechercher' }), 'alimentation');
    expect(screen.getByRole('status')).toHaveTextContent('2 opération(s) trouvée(s)');

    await user.click(screen.getByText('Filtres'));
    // Champ date : saisie directe de la valeur au format du navigateur.
    const from = screen.getByLabelText('Du');
    await user.clear(from);
    await user.type(from, '2026-10-01');
    expect(screen.getByRole('status')).toHaveTextContent('1 opération(s) trouvée(s)');
    expect(screen.getByText('Marché')).toBeInTheDocument();
  });

  it('affiche un message clair quand rien ne correspond', async () => {
    const user = userEvent.setup();
    const { repositories } = await seed();
    await renderApp('/activity', { repositories });
    await user.type(await screen.findByRole('searchbox', { name: 'Rechercher' }), 'introuvable');
    expect(screen.getByRole('heading', { name: 'Aucun résultat' })).toBeInTheDocument();
  });
});

describe('recherche des dettes', () => {
  it('filtre les dettes par nom et par note', async () => {
    const user = userEvent.setup();
    const { repositories } = await seed();
    const base = {
      direction: 'receivable' as const,
      originalAmountMinor: 1000,
      currencyCode: 'EUR' as const,
      createdDate: '2026-10-01',
      dueDate: null,
      accountId: null,
    };
    await createDebt(repositories, { ...base, contactLabel: 'Awa', note: 'loyer' });
    await createDebt(repositories, { ...base, contactLabel: 'Paul', note: '' });
    await renderApp('/debts', { repositories });

    const panel = await screen.findByRole('tabpanel');
    expect(within(panel).getByText('Paul')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher une dette' }), 'LOYER');
    expect(within(panel).getByText('Awa')).toBeInTheDocument();
    expect(within(panel).queryByText('Paul')).not.toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: 'Rechercher une dette' }), ' xyz');
    expect(within(panel).getByText('Aucune dette ne correspond à cette recherche.')).toBeVisible();
  });
});

describe('rapport mensuel', () => {
  it('montre revenus, dépenses, différence, catégories et comparaison', async () => {
    const user = userEvent.setup();
    const { repositories } = await seed();
    await renderApp('/more', { repositories });
    await user.click(screen.getByRole('link', { name: /Rapports/ }));

    const card = await screen.findByRole('region', { name: 'EUR' });
    const figure = (label: string) => within(card).getAllByText(label)[0]!.nextElementSibling;
    expect(figure('Revenus')).toHaveTextContent(/200,00/);
    expect(figure('Dépenses réelles')).toHaveTextContent(/40,00/);
    expect(figure('Différence')).toHaveTextContent(/160,00/);

    const categories = within(card).getByRole('region', { name: 'Dépenses par catégorie' });
    const items = within(categories).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent(/Alimentation.*30,00.*75 %/);
    expect(items[1]).toHaveTextContent(/Transport.*10,00.*25 %/);

    const comparison = within(card).getByRole('region', { name: 'Par rapport à septembre 2026' });
    expect(comparison).toHaveTextContent(/Revenus.*200,00.*de plus/);
    expect(comparison).toHaveTextContent(/Dépenses réelles.*15,00.*de plus/);

    // Septembre : pas de mois d'août à comparer.
    await user.click(screen.getByRole('button', { name: 'Mois précédent' }));
    const september = await screen.findByRole('region', { name: 'EUR' });
    expect(september).toHaveTextContent(
      'Pas encore assez de données pour comparer avec août 2026.',
    );

    await user.click(screen.getByRole('button', { name: 'Mois précédent' }));
    expect(await screen.findByText('Aucun revenu ni dépense en août 2026.')).toBeInTheDocument();
  });
});

describe('sauvegarde, export et effacement', () => {
  it('télécharge le CSV des opérations', async () => {
    const user = userEvent.setup();
    const { repositories } = await seed();
    await renderApp('/more/backup', { repositories });

    await user.click(await screen.findByRole('button', { name: 'Télécharger le CSV' }));
    expect(downloadFile).toHaveBeenCalledTimes(1);
    const [fileName, content, mime] = vi.mocked(downloadFile).mock.calls[0]!;
    expect(fileName).toBe('kolo-operations-2026-10-19.csv');
    expect(mime).toBe('text/csv;charset=utf-8');
    const lines = content.split('\r\n');
    expect(lines[0]).toBe(
      '﻿Identifiant,Date,Type,Montant,Devise,Compte,Compte source,Compte destination,Catégorie,Libellé,Note',
    );
    expect(lines[1]).toMatch(/,2026-09-12,Dépense,-25.00,EUR,Caisse,,,Alimentation,Épicerie,$/);
    expect(lines[2]).toMatch(/,2026-10-01,Revenu,200.00,EUR,Caisse,,,Salaire,Salaire,$/);
    expect(screen.getByText(/Fichier CSV préparé/)).toBeInTheDocument();
  });

  it('télécharge une sauvegarde et retient sa date', async () => {
    const user = userEvent.setup();
    const { repositories } = await seed();
    await renderApp('/more/backup', { repositories });

    expect(
      await screen.findByText('Aucune sauvegarde téléchargée depuis cet appareil.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/contient vos informations financières en clair/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Télécharger une sauvegarde' }));

    await waitFor(() => expect(downloadFile).toHaveBeenCalledTimes(1));
    const [fileName, content] = vi.mocked(downloadFile).mock.calls[0]!;
    expect(fileName).toBe('kolo-sauvegarde-2026-10-19.json');
    expect(JSON.parse(content).data.transactions).toHaveLength(4);
    expect(await screen.findByText('Dernière sauvegarde : 19 oct. 2026.')).toBeInTheDocument();
  });

  it('restaure après prévisualisation et confirmation, avec sauvegarde de secours', async () => {
    const user = userEvent.setup();
    const { repositories } = await seed();
    const { content } = await exportBackup(repositories);
    const target = createLocalRepositories(newTestDatabase());
    await ensureSystemCategories(target);
    await renderApp('/more/backup', { repositories: target });

    const input = await screen.findByLabelText('Fichier de sauvegarde');
    await user.upload(input, new File([content], 'sauvegarde.json', { type: 'application/json' }));

    expect(await screen.findByText(/Fichier valide, créé le 19 oct. 2026/)).toBeInTheDocument();
    expect(screen.getByText('Comptes : 1')).toBeInTheDocument();
    expect(screen.getByText('Opérations : 4')).toBeInTheDocument();
    const restore = screen.getByRole('button', { name: 'Restaurer ce fichier' });
    expect(restore).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Télécharger une sauvegarde de secours' }));
    await waitFor(() => expect(downloadFile).toHaveBeenCalledTimes(1));

    await user.click(
      screen.getByRole('checkbox', {
        name: 'J’ai compris que mes données actuelles seront remplacées',
      }),
    );
    await user.click(restore);
    expect(await screen.findByText('Données restaurées.')).toBeInTheDocument();
    expect(await target.transactions.list()).toHaveLength(4);
  });

  it('refuse un fichier invalide sans rien modifier', async () => {
    const user = userEvent.setup();
    const { repositories } = await seed();
    await renderApp('/more/backup', { repositories });

    const input = await screen.findByLabelText('Fichier de sauvegarde');
    await user.upload(
      input,
      new File(['{"format":"autre"}'], 'x.json', { type: 'application/json' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ce fichier n’est pas une sauvegarde Kolo. Vos données actuelles n’ont pas été modifiées.',
    );
    expect(screen.queryByRole('button', { name: 'Restaurer ce fichier' })).not.toBeInTheDocument();
    expect(await repositories.transactions.list()).toHaveLength(4);
  });

  it('efface toutes les données après une confirmation distincte', async () => {
    const user = userEvent.setup();
    const { repositories } = await seed();
    await renderApp('/more/settings', { repositories });

    await user.click(
      screen.getByRole('link', { name: 'Exporter, sauvegarder, restaurer ou effacer mes données' }),
    );
    const erase = await screen.findByRole('button', { name: 'Tout effacer' });
    expect(erase).toBeDisabled();
    await user.click(
      screen.getByRole('checkbox', { name: 'J’ai compris que tout sera effacé définitivement' }),
    );
    await user.click(erase);

    // L'application revient au premier lancement.
    expect(await screen.findByText(/Étape 1 sur 4/)).toBeInTheDocument();
    await waitFor(async () => expect(await repositories.accounts.list()).toEqual([]));
    expect(await repositories.transactions.list()).toEqual([]);
  });
});

describe('rappel de sauvegarde', () => {
  it('apparaît après dix opérations sans sauvegarde, puis disparaît', async () => {
    const { repositories, account } = await seed();
    for (let index = 0; index < 6; index += 1) {
      await saveTransaction(repositories, {
        type: 'expense',
        amountMinor: 100,
        accountId: account.id,
        fromAccountId: null,
        toAccountId: null,
        categoryId: (await repositories.categories.list()).find((c) => c.kind === 'expense')!.id,
        date: '2026-10-10',
        title: `Achat ${index}`,
        note: '',
      });
    }
    const { unmount } = await renderApp('/', { repositories });
    expect(await screen.findByRole('link', { name: 'Sauvegarder mes données' })).toBeVisible();
    unmount();

    await repositories.preferences.update({ lastBackupAt: new Date().toISOString() });
    await renderApp('/', { repositories });
    await screen.findByRole('heading', { name: 'Vos soldes' });
    expect(screen.queryByRole('link', { name: 'Sauvegarder mes données' })).not.toBeInTheDocument();
  });
});

describe('nouvel appareil', () => {
  it('récupère une sauvegarde dès le premier lancement', async () => {
    const user = userEvent.setup();
    const { repositories } = await seed();
    const { content } = await exportBackup(repositories);
    const target = createLocalRepositories(newTestDatabase());
    await ensureSystemCategories(target);
    await renderApp('/', { repositories: target, onboarded: false });

    await user.click(await screen.findByRole('button', { name: 'J’ai déjà une sauvegarde Kolo' }));
    await user.upload(
      screen.getByLabelText('Fichier de sauvegarde'),
      new File([content], 'sauvegarde.json', { type: 'application/json' }),
    );
    await user.click(await screen.findByRole('button', { name: 'Restaurer ce fichier' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Accueil' })).toBeInTheDocument();
    expect(await screen.findAllByText(/Caisse/)).not.toHaveLength(0);
  });
});
