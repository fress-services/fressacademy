import { describe, expect, it } from 'vitest';
import { StorageError, toStorageError } from './errors';

describe('toStorageError', () => {
  it('traduit les erreurs du navigateur en codes lisibles', () => {
    expect(toStorageError({ name: 'QuotaExceededError' }).code).toBe('quotaExceeded');
    expect(toStorageError({ name: 'MissingAPIError' }).code).toBe('unavailable');
    expect(toStorageError({ name: 'VersionError' }).code).toBe('newerVersion');
    expect(toStorageError({ name: 'AbortError', inner: { name: 'QuotaExceededError' } }).code).toBe(
      'quotaExceeded',
    );
    expect(toStorageError(new Error('boom')).code).toBe('unknown');
    expect(toStorageError(undefined).code).toBe('unknown');
  });

  it('ne recopie jamais le message d’origine', () => {
    const error = toStorageError(new Error('Montant 1234 EUR pour Marie'));
    expect(error.message).not.toContain('Marie');
    expect(error.message).not.toContain('1234');
  });

  it('laisse passer une StorageError telle quelle', () => {
    const original = new StorageError('notFound');
    expect(toStorageError(original)).toBe(original);
  });
});
