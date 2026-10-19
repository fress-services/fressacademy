import { toStorageError } from '../data/errors';
import type { MessageKey } from '../i18n/translate';
import { BusinessError, ValidationError } from '../services/errors';

/** Message lisible pour n'importe quelle erreur, sans détail technique ni donnée personnelle. */
export function describeError(error: unknown, t: (key: MessageKey) => string): string {
  if (error instanceof ValidationError) return t('validation.formHasErrors');
  if (error instanceof BusinessError) return t(`business.${error.code}`);
  return t(`errors.${toStorageError(error).code}`);
}
