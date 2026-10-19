import { describe, expect, it } from 'vitest';
import {
  amountToInput,
  formatCurrencyLabel,
  formatLocalDate,
  formatLocalMonth,
  resolveLocale,
} from './format';

describe('formats', () => {
  it('garde la région du navigateur si la langue correspond', () => {
    expect(resolveLocale('fr', null, ['fr-CM', 'en-US'])).toBe('fr-CM');
    expect(resolveLocale('en', null, ['fr-CM', 'en-GB'])).toBe('en-GB');
    expect(resolveLocale('en', null, ['fr-CM'])).toBe('en');
    expect(resolveLocale('fr', 'fr-CA', ['fr-FR'])).toBe('fr-CA');
  });

  it('affiche une date métier sans décalage de fuseau', () => {
    expect(formatLocalDate('2026-01-31', 'fr-FR')).toBe('31 janvier 2026');
    expect(formatLocalDate('2026-01-31', 'en-US')).toBe('January 31, 2026');
    expect(formatLocalMonth('2026-10', 'fr-FR')).toBe('octobre 2026');
    expect(formatLocalMonth('2026-02', 'en-US')).toBe('February 2026');
  });

  it('n’affiche pas deux fois le code d’une devise sans nom connu du navigateur', () => {
    expect(formatCurrencyLabel('EUR', 'fr')).toBe('EUR · euro');
    // Node ne connaît pas encore le nom français du bolívar souverain (VED).
    expect(formatCurrencyLabel('VED', 'fr')).toBe('VED');
  });

  it('prépare un montant pour un champ de saisie', () => {
    expect(amountToInput(1250, 'EUR', ',')).toBe('12,50');
    expect(amountToInput(5, 'USD', '.')).toBe('0.05');
    expect(amountToInput(15000, 'XAF', ',')).toBe('15000');
    expect(amountToInput(1234, 'KWD', '.')).toBe('1.234');
  });
});
