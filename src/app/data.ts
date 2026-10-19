import { createContext, useContext } from 'react';
import type { KoloRepositories } from '../data/repositories/types';
import type { Preferences } from '../domain/types';

export interface DataValue {
  repositories: KoloRepositories;
  preferences: Preferences;
  /** Enregistre des préférences ; rejette une StorageError si l'écriture échoue. */
  updatePreferences: (patch: Partial<Omit<Preferences, 'id' | 'updatedAt'>>) => Promise<void>;
}

export const DataContext = createContext<DataValue | null>(null);

export function useData(): DataValue {
  const value = useContext(DataContext);
  if (!value) throw new Error('useData doit être utilisé dans AppProviders');
  return value;
}
