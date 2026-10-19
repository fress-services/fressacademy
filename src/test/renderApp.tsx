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
  /** Faux pour afficher le premier lancement ; vrai par défaut (application déjà configurée). */
  onboarded?: boolean;
}

/**
 * Affiche l'application complète à une adresse donnée, sur une base locale neuve,
 * et attend que les préférences soient chargées.
 */
export async function renderApp(
  path = '/',
  { language = 'fr', repositories, onboarded = true }: Options = {},
) {
  const repos = repositories ?? createLocalRepositories(newTestDatabase());
  await repos.preferences.update({
    language,
    ...(onboarded
      ? { onboardingCompletedAt: '2026-01-01T00:00:00.000Z', defaultCurrency: 'EUR' }
      : {}),
  });
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
