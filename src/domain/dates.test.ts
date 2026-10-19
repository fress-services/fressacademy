import { describe, expect, it } from 'vitest';
import {
  addMonths,
  compareLocalDates,
  daysInMonth,
  daysRemainingInMonth,
  firstDayOfMonth,
  isInMonth,
  isLocalDate,
  isLocalMonth,
  lastDayOfMonth,
  monthOf,
  toLocalDate,
} from './dates';

describe('daysInMonth', () => {
  it('gère les mois de 28, 29, 30 et 31 jours', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2100, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 1)).toBe(31);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
});

describe('daysRemainingInMonth', () => {
  it('inclut aujourd’hui : premier jour = taille du mois, dernier jour = 1', () => {
    expect(daysRemainingInMonth('2026-01-01')).toBe(31);
    expect(daysRemainingInMonth('2026-01-31')).toBe(1);
    expect(daysRemainingInMonth('2026-02-01')).toBe(28);
    expect(daysRemainingInMonth('2028-02-01')).toBe(29);
    expect(daysRemainingInMonth('2028-02-29')).toBe(1);
    expect(daysRemainingInMonth('2026-04-15')).toBe(16);
  });
});

describe('validation', () => {
  it('reconnaît les dates locales valides', () => {
    expect(isLocalDate('2026-10-19')).toBe(true);
    expect(isLocalDate('2028-02-29')).toBe(true);
    expect(isLocalDate('2026-02-29')).toBe(false);
    expect(isLocalDate('2026-13-01')).toBe(false);
    expect(isLocalDate('2026-1-01')).toBe(false);
    expect(isLocalDate('19/10/2026')).toBe(false);
    expect(isLocalMonth('2026-10')).toBe(true);
    expect(isLocalMonth('2026-00')).toBe(false);
  });

  it('refuse une date invalide dans les calculs', () => {
    expect(() => monthOf('2026-02-30')).toThrow(RangeError);
    expect(() => daysRemainingInMonth('n’importe quoi')).toThrow(RangeError);
  });
});

describe('mois', () => {
  it('calcule le mois, son premier et son dernier jour', () => {
    expect(monthOf('2026-10-19')).toBe('2026-10');
    expect(firstDayOfMonth('2026-02')).toBe('2026-02-01');
    expect(lastDayOfMonth('2026-02')).toBe('2026-02-28');
    expect(lastDayOfMonth('2028-02')).toBe('2028-02-29');
    expect(isInMonth('2026-09-30', '2026-10')).toBe(false);
    expect(isInMonth('2026-10-01', '2026-10')).toBe(true);
  });

  it('avance et recule de mois en changeant d’année', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-10', 0)).toBe('2026-10');
    expect(addMonths('2026-10', -22)).toBe('2024-12');
  });
});

describe('toLocalDate', () => {
  it('utilise la date locale de l’appareil, pas UTC', () => {
    // 23 h 30 le 31 janvier en heure locale reste le 31 janvier.
    expect(toLocalDate(new Date(2026, 0, 31, 23, 30))).toBe('2026-01-31');
    expect(toLocalDate(new Date(2026, 1, 1, 0, 0))).toBe('2026-02-01');
  });

  it('compare des dates comme des dates locales', () => {
    expect(compareLocalDates('2026-01-31', '2026-02-01')).toBeLessThan(0);
    expect(compareLocalDates('2026-02-01', '2026-02-01')).toBe(0);
    expect(compareLocalDates('2027-01-01', '2026-12-31')).toBeGreaterThan(0);
  });
});
