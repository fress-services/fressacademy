import { useEffect, useState } from 'react';
import { toStorageError, type StorageErrorCode } from '../data/errors';
import type { KoloRepositories } from '../data/repositories/types';
import { useData } from './data';

export type QueryState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; code: StorageErrorCode };

/**
 * Lit des données via les repositories et relit automatiquement après chaque écriture,
 * pour que soldes, listes et totaux soient toujours recalculés (§5.3).
 * `deps` liste les valeurs dont dépend la requête (comme pour useEffect).
 */
export function useRepositoryQuery<T>(
  query: (repositories: KoloRepositories) => Promise<T>,
  deps: readonly unknown[],
): QueryState<T> {
  const { repositories } = useData();
  const [state, setState] = useState<QueryState<T>>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    let run = 0;
    const load = () => {
      const current = ++run;
      query(repositories).then(
        (data) => {
          if (active && current === run) setState({ status: 'ready', data });
        },
        (error: unknown) => {
          if (active && current === run)
            setState({ status: 'error', code: toStorageError(error).code });
        },
      );
    };
    load();
    const unsubscribe = repositories.subscribe(load);
    return () => {
      active = false;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la requête est recréée à chaque rendu
  }, [repositories, ...deps]);

  return state;
}
