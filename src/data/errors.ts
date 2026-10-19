/**
 * Erreurs de stockage présentées à l'interface. Le message technique d'origine n'est jamais
 * affiché ni journalisé tel quel : il pourrait contenir des données personnelles (§9.1).
 */
export type StorageErrorCode =
  'unavailable' | 'quotaExceeded' | 'newerVersion' | 'notFound' | 'unknown';

export class StorageError extends Error {
  readonly code: StorageErrorCode;

  constructor(code: StorageErrorCode) {
    super(`Erreur de stockage : ${code}`);
    this.name = 'StorageError';
    this.code = code;
  }
}

const CODES_BY_ERROR_NAME: Record<string, StorageErrorCode> = {
  QuotaExceededError: 'quotaExceeded',
  MissingAPIError: 'unavailable',
  OpenFailedError: 'unavailable',
  DatabaseClosedError: 'unavailable',
  InvalidStateError: 'unavailable',
  SecurityError: 'unavailable',
  VersionError: 'newerVersion',
  NotFoundError: 'notFound',
};

/** Vrai si l'erreur vient du stockage (IndexedDB, Dexie, navigateur) et non d'une règle métier. */
export function isStorageFailure(error: unknown): boolean {
  if (error instanceof StorageError) return true;
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) return true;
  const name = (error as { name?: unknown } | null)?.name;
  // Les erreurs Dexie portent un nom en « …Error » listé ici ou une erreur interne « inner ».
  return (
    (typeof name === 'string' && name in CODES_BY_ERROR_NAME) ||
    (typeof error === 'object' && error !== null && 'inner' in error) ||
    name === 'DexieError' ||
    name === 'AbortError' ||
    name === 'ConstraintError' ||
    name === 'DataError' ||
    name === 'UnknownError'
  );
}

/** Convertit n'importe quelle erreur (Dexie, IndexedDB, navigateur) en StorageError. */
export function toStorageError(error: unknown): StorageError {
  if (error instanceof StorageError) return error;
  let current: unknown = error;
  // Dexie enveloppe parfois l'erreur réelle dans « inner ».
  for (let depth = 0; depth < 3 && current && typeof current === 'object'; depth++) {
    const name = (current as { name?: unknown }).name;
    if (typeof name === 'string' && name in CODES_BY_ERROR_NAME) {
      return new StorageError(CODES_BY_ERROR_NAME[name] ?? 'unknown');
    }
    current = (current as { inner?: unknown }).inner;
  }
  return new StorageError('unknown');
}
