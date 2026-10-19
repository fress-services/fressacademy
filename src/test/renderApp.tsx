import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../app/App';
import { AppProviders } from '../app/AppProviders';
import { createLocalRepositories } from '../data/local/repositories';
import type { KoloRepositories } from '../data/repositories/types';
import type { Language } from '../i18n/languages';
import { newTestDatabase } from './database';

interface Options {
  language?: Language;
  repositories?: KoloRepositories;
}

/**
 * Affiche l'application complète à une adresse donnée, sur une base locale neuve,
 * et attend que les préférences soient chargées.
 */
export async function renderApp(path = '/', { language = 'fr', repositories }: Options = {}) {
  const repos = repositories ?? createLocalRepositories(newTestDatabase());
  await repos.preferences.update({ language });
  const result = render(
    <AppProviders openRepositories={async () => repos}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </AppProviders>,
  );
  await screen.findByRole('main');
  return { ...result, repositories: repos };
}
