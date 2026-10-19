import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/renderApp';

describe('navigation principale', () => {
  it('affiche les 5 onglets et l’accueil par défaut', async () => {
    await renderApp('/');
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Accueil',
      'Activité',
      'Budget',
      'Dettes',
      'Plus',
    ]);
    expect(within(nav).getByRole('link', { name: 'Accueil' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Accueil' })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Accueil · Kolo'));
  });

  it('change de page et met à jour l’onglet actif', async () => {
    const user = userEvent.setup();
    await renderApp('/');
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });

    for (const name of ['Activité', 'Budget', 'Dettes', 'Plus']) {
      await user.click(within(nav).getByRole('link', { name }));
      expect(screen.getByRole('heading', { level: 1, name })).toBeInTheDocument();
      expect(within(nav).getByRole('link', { name })).toHaveAttribute('aria-current', 'page');
    }
  });

  it('chaque onglet affiche un état vide explicatif', async () => {
    const cases: [string, string][] = [
      ['/', 'Commencez par un compte'],
      ['/activity', 'Aucune opération pour l’instant'],
      ['/budget', 'Aucune limite de dépenses'],
      ['/debts', 'Rien à récupérer'],
    ];
    for (const [path, title] of cases) {
      const { unmount } = await renderApp(path);
      expect(await screen.findByRole('heading', { level: 2, name: title })).toBeInTheDocument();
      unmount();
    }
  });

  it('affiche une page introuvable avec un lien vers l’accueil', async () => {
    const user = userEvent.setup();
    await renderApp('/nimporte-quoi');
    expect(screen.getByRole('heading', { level: 1, name: 'Page introuvable' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Revenir à l’accueil' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Accueil' })).toBeInTheDocument();
  });

  it('propose un lien d’évitement vers le contenu', async () => {
    await renderApp('/');
    expect(screen.getByRole('link', { name: 'Aller au contenu' })).toHaveAttribute('href', '#main');
  });
});

describe('langue', () => {
  it('passe de français à anglais depuis les paramètres', async () => {
    const user = userEvent.setup();
    await renderApp('/more/settings', { language: 'fr' });
    expect(document.documentElement.lang).toBe('fr');

    await user.click(screen.getByRole('radio', { name: 'English' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked();
    expect(document.documentElement.lang).toBe('en');
    await waitFor(() => expect(document.title).toBe('Settings · Kolo'));
  });

  it('affiche l’anglais quand c’est la langue initiale', async () => {
    await renderApp('/budget', { language: 'en' });
    expect(screen.getByRole('heading', { level: 1, name: 'Budget' })).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 2, name: 'No spending limit' }),
    ).toBeInTheDocument();
  });
});

describe('dettes', () => {
  it('bascule entre « À récupérer » et « À rembourser » à la souris et au clavier', async () => {
    const user = userEvent.setup();
    await renderApp('/debts');
    const receivable = screen.getByRole('tab', { name: 'À récupérer' });
    const payable = screen.getByRole('tab', { name: 'À rembourser' });
    expect(receivable).toHaveAttribute('aria-selected', 'true');

    await user.click(payable);
    expect(payable).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Rien à rembourser');

    await user.keyboard('{ArrowRight}');
    expect(receivable).toHaveAttribute('aria-selected', 'true');
    expect(receivable).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Rien à récupérer');

    await user.keyboard('{End}');
    expect(payable).toHaveFocus();
  });
});

describe('plus', () => {
  it('donne accès aux paramètres et à l’explication sur les données', async () => {
    const user = userEvent.setup();
    await renderApp('/more');
    await user.click(screen.getByRole('link', { name: /Vos données/ }));
    expect(screen.getByRole('heading', { level: 1, name: 'Vos données' })).toBeInTheDocument();
    expect(screen.getByText(/sauf si vous en avez exporté une sauvegarde/)).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Retour/ }));
    await user.click(screen.getByRole('link', { name: /Paramètres/ }));
    expect(screen.getByRole('heading', { level: 1, name: 'Paramètres' })).toBeInTheDocument();
  });
});
