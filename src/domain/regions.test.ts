import { describe, expect, it } from 'vitest';
import { currencyForRegion, suggestCurrency } from './regions';

describe('suggestion de devise', () => {
  it('propose la devise du pays indiqué par le navigateur', () => {
    expect(suggestCurrency(['fr-CM'])).toBe('XAF');
    expect(suggestCurrency(['fr-SN'])).toBe('XOF');
    expect(suggestCurrency(['en-US'])).toBe('USD');
    expect(suggestCurrency(['ja-JP'])).toBe('JPY');
    expect(suggestCurrency(['ar-KW'])).toBe('KWD');
  });

  it('prend la première langue qui indique un pays', () => {
    expect(suggestCurrency(['fr', 'en-GB'])).toBe('GBP');
  });

  it('ne suppose rien sans pays', () => {
    expect(suggestCurrency(['fr', 'en'])).toBeNull();
    expect(suggestCurrency([])).toBeNull();
    expect(suggestCurrency(['pas une langue'])).toBeNull();
  });

  it('ne contient que des devises du catalogue', () => {
    expect(currencyForRegion('fr')).toBe('EUR');
    expect(currencyForRegion('ZZ')).toBeNull();
  });
});
