import type { ValidationCode } from '../../domain/validation';
import type { MessageKey, MessageParams } from '../../i18n/translate';
import { ValidationError } from '../../services/errors';

type T = (key: MessageKey, params?: MessageParams) => string;

/** Messages traduits par champ pour une erreur de validation renvoyée par un service. */
export function fieldMessages(error: unknown, t: T): Record<string, string> {
  if (!(error instanceof ValidationError)) return {};
  return Object.fromEntries(
    Object.entries(error.fieldErrors).map(([field, code]) => [
      field,
      t(`validation.${code as ValidationCode}`),
    ]),
  );
}
