import type { FieldErrors } from '../domain/validation';

/** Saisie refusée par les règles du domaine ; chaque champ porte un code traduisible. */
export class ValidationError<F extends string = string> extends Error {
  readonly fieldErrors: FieldErrors<F>;

  constructor(fieldErrors: FieldErrors<F>) {
    super('Saisie invalide');
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}

export type BusinessErrorCode =
  | 'accountInUse'
  | 'currencyLocked'
  | 'managedElsewhere'
  | 'plannedStaysExpense'
  | 'systemCategory'
  | 'notFound';

/** Action refusée pour préserver la cohérence des données (historique, liens…). */
export class BusinessError extends Error {
  readonly code: BusinessErrorCode;

  constructor(code: BusinessErrorCode) {
    super(`Action refusée : ${code}`);
    this.name = 'BusinessError';
    this.code = code;
  }
}
