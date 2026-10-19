import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toStorageError, type StorageErrorCode } from '../data/errors';
import type { KoloRepositories } from '../data/repositories/types';
import type { Preferences } from '../domain/types';
import { I18nProvider } from '../i18n/I18nProvider';
import { detectLanguage, type Language } from '../i18n/languages';
import { DataContext, type DataValue } from './data';
import { StartupError } from './StartupError';

interface Props {
  /** Ouvre le stockage local (IndexedDB en production, base de test sinon). */
  openRepositories: () => Promise<KoloRepositories>;
  children: ReactNode;
}

type State =
  | { status: 'loading' }
  | { status: 'error'; code: StorageErrorCode }
  | { status: 'ready'; repositories: KoloRepositories; preferences: Preferences };

function browserLanguage(): Language {
  return detectLanguage(typeof navigator === 'undefined' ? [] : navigator.languages);
}

/** Ouvre les données locales, applique les préférences (langue, thème) puis affiche l'app. */
export function AppProviders({ openRepositories, children }: Props) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const repositories = await openRepositories();
        const preferences = await repositories.preferences.get();
        if (!cancelled) setState({ status: 'ready', repositories, preferences });
      } catch (error) {
        if (!cancelled) setState({ status: 'error', code: toStorageError(error).code });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openRepositories]);

  const repositories = state.status === 'ready' ? state.repositories : null;
  const preferences = state.status === 'ready' ? state.preferences : null;

  const updatePreferences = useCallback<DataValue['updatePreferences']>(
    async (patch) => {
      if (!repositories) return;
      const saved = await repositories.preferences.update(patch);
      setState((current) =>
        current.status === 'ready' ? { ...current, preferences: saved } : current,
      );
    },
    [repositories],
  );

  const setLanguage = useCallback(
    (language: Language) => updatePreferences({ language }),
    [updatePreferences],
  );

  const theme = preferences?.theme ?? 'dark';
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value = useMemo<DataValue | null>(
    () => (repositories && preferences ? { repositories, preferences, updatePreferences } : null),
    [repositories, preferences, updatePreferences],
  );

  const language = preferences?.language ?? browserLanguage();
  const noop = useCallback(async () => {}, []);

  if (state.status === 'loading') {
    return <div aria-busy="true" />;
  }

  if (state.status === 'error' || !value) {
    return (
      <I18nProvider language={language} onLanguageChange={noop}>
        <StartupError code={state.status === 'error' ? state.code : 'unknown'} />
      </I18nProvider>
    );
  }

  return (
    <DataContext.Provider value={value}>
      <I18nProvider language={language} onLanguageChange={setLanguage}>
        {children}
      </I18nProvider>
    </DataContext.Provider>
  );
}
