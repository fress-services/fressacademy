import { minorUnits, type CurrencyCode } from './currencies';

/**
 * Les montants sont des entiers en unités mineures (centimes, fils…) : 12,50 EUR = 1250.
 * Aucun calcul monétaire ne passe par un nombre à virgule flottante.
 */
export type MinorAmount = number;

export type AmountParseError = 'empty' | 'invalid' | 'tooManyDecimals' | 'notPositive' | 'tooLarge';

export type AmountParseResult =
  { ok: true; amountMinor: MinorAmount } | { ok: false; error: AmountParseError };

/** Plus grand montant accepté (entier exact en JavaScript). Les sommes sont aussi vérifiées. */
export const MAX_AMOUNT_MINOR = Number.MAX_SAFE_INTEGER;

/**
 * Lit un montant saisi par l'utilisateur, sans jamais passer par un flottant.
 * Accepte la virgule ou le point comme séparateur décimal et ignore les espaces.
 * Refuse les signes : le sens d'une opération est porté par son type (cahier des charges §6.1).
 */
export function parseAmount(input: string, currency: CurrencyCode): AmountParseResult {
  const text = input.replace(/[\s\u00a0\u202f]/g, '');
  if (text === '') return { ok: false, error: 'empty' };

  const match = /^(\d*)(?:[.,](\d*))?$/.exec(text);
  if (!match) return { ok: false, error: 'invalid' };

  const whole = match[1] ?? '';
  const fraction = match[2] ?? '';
  if (whole === '' && fraction === '') return { ok: false, error: 'invalid' };

  const digits = minorUnits(currency);
  const significantFraction = fraction.replace(/0+$/, '');
  if (significantFraction.length > digits) return { ok: false, error: 'tooManyDecimals' };

  const normalizedWhole = whole.replace(/^0+(?=\d)/, '');
  if (normalizedWhole.length > 16) return { ok: false, error: 'tooLarge' };

  const minorText = (normalizedWhole || '0') + significantFraction.padEnd(digits, '0');
  const amountMinor = Number(minorText);
  if (!Number.isSafeInteger(amountMinor)) {
    return { ok: false, error: 'tooLarge' };
  }
  if (amountMinor <= 0) return { ok: false, error: 'notPositive' };
  return { ok: true, amountMinor };
}

/** Écrit un montant en texte décimal exact, avec un point : 1250 EUR → "12.50". Pour l'export. */
export function toDecimalString(amountMinor: MinorAmount, currency: CurrencyCode): string {
  assertSafeInteger(amountMinor);
  const digits = minorUnits(currency);
  const sign = amountMinor < 0 ? '-' : '';
  const text = String(Math.abs(amountMinor)).padStart(digits + 1, '0');
  if (digits === 0) return sign + text;
  return `${sign}${text.slice(0, -digits)}.${text.slice(-digits)}`;
}

/**
 * Affiche un montant selon la langue et la région (séparateurs, position du symbole).
 * Le nombre de décimales vient du catalogue ISO 4217, pas des habitudes du navigateur.
 */
export function formatMoney(
  amountMinor: MinorAmount,
  currency: CurrencyCode,
  locale: string,
): string {
  const digits = minorUnits(currency);
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  // Le texte décimal exact évite toute division flottante (Intl accepte les chaînes).
  return formatter.format(toDecimalString(amountMinor, currency) as unknown as number);
}

/** Somme exacte de montants d'une même devise ; refuse tout dépassement de précision. */
export function sumMinor(amounts: readonly MinorAmount[]): MinorAmount {
  let total = 0;
  for (const amount of amounts) {
    assertSafeInteger(amount);
    total += amount;
    assertSafeInteger(total);
  }
  return total;
}

export function assertSafeInteger(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError('Montant hors de la précision exacte');
  }
}
