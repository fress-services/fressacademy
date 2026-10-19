import { describe, expect, it } from 'vitest';
import { formatMoney, MAX_AMOUNT_MINOR, parseAmount, sumMinor, toDecimalString } from './money';

const nbsp = /[\u00a0\u202f]/g;
const plain = (text: string) => text.replace(nbsp, ' ');

describe('parseAmount', () => {
  it('lit un montant avec virgule ou point', () => {
    expect(parseAmount('12,50', 'EUR')).toEqual({ ok: true, amountMinor: 1250 });
    expect(parseAmount('12.5', 'EUR')).toEqual({ ok: true, amountMinor: 1250 });
    expect(parseAmount('12', 'EUR')).toEqual({ ok: true, amountMinor: 1200 });
    expect(parseAmount(',5', 'EUR')).toEqual({ ok: true, amountMinor: 50 });
    expect(parseAmount('1 250,00', 'EUR')).toEqual({ ok: true, amountMinor: 125000 });
  });

  it('respecte la précision de chaque devise', () => {
    expect(parseAmount('1500', 'XAF')).toEqual({ ok: true, amountMinor: 1500 });
    expect(parseAmount('1500,5', 'XAF')).toEqual({ ok: false, error: 'tooManyDecimals' });
    expect(parseAmount('1500,0', 'JPY')).toEqual({ ok: false, error: 'tooManyDecimals' });
    expect(parseAmount('1,234', 'KWD')).toEqual({ ok: true, amountMinor: 1234 });
    expect(parseAmount('1,2345', 'KWD')).toEqual({ ok: false, error: 'tooManyDecimals' });
    expect(parseAmount('1,005', 'EUR')).toEqual({ ok: false, error: 'tooManyDecimals' });
  });

  it('ne lit jamais un séparateur de milliers comme une virgule (2,500 n’est pas 2,50)', () => {
    expect(parseAmount('2,500', 'EUR')).toEqual({ ok: false, error: 'tooManyDecimals' });
    expect(parseAmount('1.000', 'USD')).toEqual({ ok: false, error: 'tooManyDecimals' });
    expect(parseAmount('25.000', 'XAF')).toEqual({ ok: false, error: 'tooManyDecimals' });
    expect(parseAmount('1,000', 'JPY')).toEqual({ ok: false, error: 'tooManyDecimals' });
    expect(parseAmount('12,50', 'EUR')).toEqual({ ok: true, amountMinor: 1250 });
    expect(parseAmount('2 500', 'EUR')).toEqual({ ok: true, amountMinor: 250000 });
  });

  it('ne passe jamais par un flottant (0,1 + 0,2)', () => {
    const a = parseAmount('0,1', 'EUR');
    const b = parseAmount('0,2', 'EUR');
    expect(a.ok && b.ok && sumMinor([a.amountMinor, b.amountMinor])).toBe(30);
    expect(parseAmount('19,99', 'EUR')).toEqual({ ok: true, amountMinor: 1999 });
    expect(parseAmount('4.35', 'USD')).toEqual({ ok: true, amountMinor: 435 });
  });

  it('refuse les saisies invalides, nulles ou signées', () => {
    expect(parseAmount('', 'EUR')).toEqual({ ok: false, error: 'empty' });
    expect(parseAmount('   ', 'EUR')).toEqual({ ok: false, error: 'empty' });
    expect(parseAmount('abc', 'EUR')).toEqual({ ok: false, error: 'invalid' });
    expect(parseAmount('-5', 'EUR')).toEqual({ ok: false, error: 'invalid' });
    expect(parseAmount('+5', 'EUR')).toEqual({ ok: false, error: 'invalid' });
    expect(parseAmount('1,2,3', 'EUR')).toEqual({ ok: false, error: 'invalid' });
    expect(parseAmount('1e3', 'EUR')).toEqual({ ok: false, error: 'invalid' });
    expect(parseAmount(',', 'EUR')).toEqual({ ok: false, error: 'invalid' });
    expect(parseAmount('0', 'EUR')).toEqual({ ok: false, error: 'notPositive' });
    expect(parseAmount('0,00', 'EUR')).toEqual({ ok: false, error: 'notPositive' });
  });

  it('refuse un montant au-delà de 10^13 unités mineures, pour que les totaux restent exacts', () => {
    expect(parseAmount('99999999999999999', 'EUR')).toEqual({ ok: false, error: 'tooLarge' });
    expect(parseAmount('100000000000', 'EUR')).toEqual({ ok: true, amountMinor: MAX_AMOUNT_MINOR });
    expect(parseAmount('100000000000,01', 'EUR')).toEqual({ ok: false, error: 'tooLarge' });
    expect(parseAmount('10000000000000', 'JPY')).toEqual({ ok: true, amountMinor: 10 ** 13 });
    expect(parseAmount('10000000000001', 'JPY')).toEqual({ ok: false, error: 'tooLarge' });
  });
});

describe('toDecimalString', () => {
  it('écrit la valeur exacte selon la devise', () => {
    expect(toDecimalString(1250, 'EUR')).toBe('12.50');
    expect(toDecimalString(5, 'EUR')).toBe('0.05');
    expect(toDecimalString(1500, 'XAF')).toBe('1500');
    expect(toDecimalString(1234, 'KWD')).toBe('1.234');
    expect(toDecimalString(-205, 'USD')).toBe('-2.05');
  });
});

describe('formatMoney', () => {
  it('formate selon la langue sans concaténer de symbole à la main', () => {
    expect(plain(formatMoney(123456, 'EUR', 'fr-FR'))).toBe('1 234,56 €');
    expect(formatMoney(123456, 'USD', 'en-US')).toBe('$1,234.56');
    expect(plain(formatMoney(1500, 'XAF', 'fr-CM'))).toBe('1 500 FCFA');
    expect(formatMoney(1500, 'JPY', 'en-US')).toBe('¥1,500');
    expect(plain(formatMoney(1234, 'KWD', 'en-US'))).toBe('KWD 1.234');
  });

  it('affiche les montants négatifs', () => {
    expect(formatMoney(-2500, 'USD', 'en-US')).toBe('-$25.00');
  });
});

describe('sumMinor', () => {
  it('additionne exactement et refuse un dépassement', () => {
    expect(sumMinor([])).toBe(0);
    expect(sumMinor([100, -30, 5])).toBe(75);
    expect(() => sumMinor([Number.MAX_SAFE_INTEGER, 1])).toThrow(RangeError);
    expect(() => sumMinor([0.5])).toThrow(RangeError);
  });
});
