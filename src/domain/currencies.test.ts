import { describe, expect, it } from 'vitest';
import { CURRENCY_CODES, currencyName, isCurrencyCode, minorUnits } from './currencies';

describe('catalogue des devises', () => {
  it('connaît les précisions 0, 2 et 3 décimales', () => {
    expect(minorUnits('JPY')).toBe(0);
    expect(minorUnits('XAF')).toBe(0);
    expect(minorUnits('XOF')).toBe(0);
    expect(minorUnits('EUR')).toBe(2);
    expect(minorUnits('USD')).toBe(2);
    expect(minorUnits('KWD')).toBe(3);
    expect(minorUnits('TND')).toBe(3);
  });

  it('valide les codes ISO et refuse les symboles', () => {
    expect(isCurrencyCode('EUR')).toBe(true);
    expect(isCurrencyCode('$')).toBe(false);
    expect(isCurrencyCode('eur')).toBe(false);
    expect(isCurrencyCode('XAU')).toBe(false);
  });

  it('contient des codes uniques de trois lettres, triés', () => {
    expect(new Set(CURRENCY_CODES).size).toBe(CURRENCY_CODES.length);
    for (const code of CURRENCY_CODES) expect(code).toMatch(/^[A-Z]{3}$/);
    expect([...CURRENCY_CODES].sort()).toEqual(CURRENCY_CODES);
    expect(CURRENCY_CODES.length).toBeGreaterThan(150);
  });

  it('donne le nom de la devise dans la langue de l’interface', () => {
    expect(currencyName('EUR', 'fr')).toBe('euro');
    expect(currencyName('EUR', 'en')).toBe('Euro');
  });
});
