import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { StorageError } from '../data/errors';
import { createLocalRepositories } from '../data/local/repositories';
import { newTestDatabase } from '../test/database';
import { renderApp } from '../test/renderApp';
import { App } from './App';
import { AppProviders } from './AppProviders';

describe('préférences enregistrées', () => {
  it('garde la langue choisie après redémarrage de l’application', async () => {
    const user = userEvent.setup();
    const { repositories, unmount } = await renderApp('/more/settings', { language: 'fr' });
    await user.click(screen.getByRole('radio', { name: 'English' }));
    expect(await screen.findByText('Preference saved.')).toBeInTheDocument();
    unmount();

    const reopened = render(
      <AppProviders openRepositories={async () => repositories}>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </AppProviders>,
    );
    const nav = await reopened.findByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect((await repositories.preferences.get()).language).toBe('en');
  });

  it('applique le thème sombre par défaut puis le thème choisi', async () => {
    const user = userEvent.setup();
    const { repositories } = await renderApp('/more/settings');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByRole('radio', { name: 'Sombre' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: 'Clair' }));

    expect(await screen.findByText('Préférence enregistrée.')).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('light');
    expect((await repositories.preferences.get()).theme).toBe('light');
  });

  it('affiche une erreur lisible si l’enregistrement échoue', async () => {
    const user = userEvent.setup();
    const repositories = createLocalRepositories(newTestDatabase());
    let storageFull = false;
    await renderApp('/more/settings', {
      repositories: {
        ...repositories,
        preferences: {
          get: repositories.preferences.get,
          update: async (patch) => {
            if (storageFull) throw new StorageError('quotaExceeded');
            return repositories.preferences.update(patch);
          },
        },
      },
    });
    storageFull = true;

    await user.click(screen.getByRole('radio', { name: 'Clair' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'L’enregistrement a échoué : L’espace de stockage de ce navigateur est plein.',
    );
    expect(screen.getByRole('radio', { name: 'Sombre' })).toBeChecked();
  });
});

describe('démarrage', () => {
  it('explique le problème si le stockage local est indisponible', async () => {
    render(
      <AppProviders
        openRepositories={async () => {
          throw { name: 'MissingAPIError' };
        }}
      >
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </AppProviders>,
    );
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      /stockage de ce navigateur n’est pas disponible|storage is not available/,
    );
    expect(within(alert).getByRole('button')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});

describe('vos données', () => {
  it('indique si la protection du stockage est disponible', async () => {
    await renderApp('/more/data');
    expect(
      await screen.findByText(
        'Ce navigateur ne permet pas de protéger les données contre l’effacement.',
      ),
    ).toBeInTheDocument();
  });
});
