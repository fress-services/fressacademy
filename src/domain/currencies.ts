/**
 * Catalogue des devises ISO 4217 en circulation et leur nombre de décimales (« minor units »).
 * Source : liste ISO 4217 (SIX). Mettre à jour ce fichier quand l'ISO publie un amendement ;
 * une devise retirée doit rester ici tant que des données peuvent l'utiliser.
 * Le nom affiché vient du navigateur (Intl.DisplayNames), jamais de ce fichier.
 */

const ZERO_DECIMALS = [
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'ISK',
  'JPY',
  'KMF',
  'KRW',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
] as const;

const THREE_DECIMALS = ['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND'] as const;

const TWO_DECIMALS = [
  'AED',
  'AFN',
  'ALL',
  'AMD',
  'ANG',
  'AOA',
  'ARS',
  'AUD',
  'AWG',
  'AZN',
  'BAM',
  'BBD',
  'BDT',
  'BGN',
  'BMD',
  'BND',
  'BOB',
  'BRL',
  'BSD',
  'BTN',
  'BWP',
  'BYN',
  'BZD',
  'CAD',
  'CDF',
  'CHF',
  'CNY',
  'COP',
  'CRC',
  'CUP',
  'CVE',
  'CZK',
  'DKK',
  'DOP',
  'DZD',
  'EGP',
  'ERN',
  'ETB',
  'EUR',
  'FJD',
  'FKP',
  'GBP',
  'GEL',
  'GHS',
  'GIP',
  'GMD',
  'GTQ',
  'GYD',
  'HKD',
  'HNL',
  'HTG',
  'HUF',
  'IDR',
  'ILS',
  'INR',
  'IRR',
  'JMD',
  'KES',
  'KGS',
  'KHR',
  'KPW',
  'KYD',
  'KZT',
  'LAK',
  'LBP',
  'LKR',
  'LRD',
  'LSL',
  'MAD',
  'MDL',
  'MGA',
  'MKD',
  'MMK',
  'MNT',
  'MOP',
  'MRU',
  'MUR',
  'MVR',
  'MWK',
  'MXN',
  'MYR',
  'MZN',
  'NAD',
  'NGN',
  'NIO',
  'NOK',
  'NPR',
  'NZD',
  'PAB',
  'PEN',
  'PGK',
  'PHP',
  'PKR',
  'PLN',
  'QAR',
  'RON',
  'RSD',
  'RUB',
  'SAR',
  'SBD',
  'SCR',
  'SDG',
  'SEK',
  'SGD',
  'SHP',
  'SLE',
  'SOS',
  'SRD',
  'SSP',
  'STN',
  'SVC',
  'SYP',
  'SZL',
  'THB',
  'TJS',
  'TMT',
  'TOP',
  'TRY',
  'TTD',
  'TWD',
  'TZS',
  'UAH',
  'USD',
  'UYU',
  'UZS',
  'VED',
  'VES',
  'WST',
  'XCD',
  'XCG',
  'YER',
  'ZAR',
  'ZMW',
  'ZWG',
] as const;

export type CurrencyCode =
  (typeof ZERO_DECIMALS)[number] | (typeof TWO_DECIMALS)[number] | (typeof THREE_DECIMALS)[number];

const MINOR_UNITS: ReadonlyMap<string, number> = new Map<string, number>([
  ...ZERO_DECIMALS.map((code) => [code, 0] as const),
  ...TWO_DECIMALS.map((code) => [code, 2] as const),
  ...THREE_DECIMALS.map((code) => [code, 3] as const),
]);

export const CURRENCY_CODES: readonly CurrencyCode[] = [
  ...ZERO_DECIMALS,
  ...TWO_DECIMALS,
  ...THREE_DECIMALS,
].sort() as CurrencyCode[];

export function isCurrencyCode(value: string): value is CurrencyCode {
  return MINOR_UNITS.has(value);
}

/** Nombre de décimales autorisées pour une devise (0 pour JPY ou XAF, 3 pour KWD…). */
export function minorUnits(currency: CurrencyCode): number {
  const digits = MINOR_UNITS.get(currency);
  if (digits === undefined) throw new Error(`Devise inconnue : ${currency}`);
  return digits;
}

/** Nom de la devise dans la langue de l'interface, ou le code si le navigateur ne le connaît pas. */
export function currencyName(currency: CurrencyCode, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'currency' }).of(currency) ?? currency;
  } catch {
    return currency;
  }
}
