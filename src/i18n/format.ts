import { useMemo } from 'react';
import { useData } from '../app/data';
import { currencyName, minorUnits, type CurrencyCode } from '../domain/currencies';
import type { LocalDate, LocalMonth } from '../domain/dates';
import { formatMoney, type MinorAmount } from '../domain/money';
import { useI18n } from './context';
import type { Language } from './languages';

/**
 * Locale d'affichage : celle choisie par l'utilisateur, sinon celle du navigateur si elle
 * correspond à la langue de l'interface (fr-CM garde ses formats), sinon la langue seule.
 */
export function resolveLocale(
  language: Language,
  preferred: string | null,
  browserLanguages: readonly string[],
): string {
  if (preferred) return preferred;
  const match = browserLanguages.find((tag) => tag.toLowerCase().split('-')[0] === language);
  return match ?? language;
}

/** Date métier affichée selon la locale, sans décalage de fuseau (lue comme date UTC). */
export function formatLocalDate(
  date: LocalDate,
  locale: string,
  style: 'long' | 'medium' = 'long',
): string {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return new Intl.DateTimeFormat(locale, { dateStyle: style, timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day, 12)),
  );
}

/** Mois métier affiché selon la locale (« octobre 2026 »). */
export function formatLocalMonth(month: LocalMonth, locale: string): string {
  const [year, monthNumber] = month.split('-').map(Number) as [number, number];
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, monthNumber - 1, 15)));
}

/**
 * « EUR · euro ». Certains navigateurs ne connaissent pas encore les devises récentes (SLE,
 * VED…) : on affiche alors le code seul plutôt que « SLE · SLE ».
 */
export function formatCurrencyLabel(currency: CurrencyCode, locale: string): string {
  const name = currencyName(currency, locale);
  return name === currency ? currency : `${currency} · ${name}`;
}

export interface Formatters {
  locale: string;
  money: (amountMinor: MinorAmount, currency: CurrencyCode) => string;
  date: (date: LocalDate, style?: 'long' | 'medium') => string;
  month: (month: LocalMonth) => string;
  currencyLabel: (currency: CurrencyCode) => string;
  decimalSeparator: string;
  minorUnits: (currency: CurrencyCode) => number;
}

export function useFormat(): Formatters {
  const { language } = useI18n();
  const { preferences } = useData();
  return useMemo(() => {
    const locale = resolveLocale(
      language,
      preferences.locale,
      typeof navigator === 'undefined' ? [] : navigator.languages,
    );
    const decimalSeparator =
      new Intl.NumberFormat(locale).formatToParts(1.5).find((part) => part.type === 'decimal')
        ?.value ?? '.';
    return {
      locale,
      money: (amountMinor, currency) => formatMoney(amountMinor, currency, locale),
      date: (date, style = 'long') => formatLocalDate(date, locale, style),
      month: (month) => formatLocalMonth(month, locale),
      currencyLabel: (currency) => formatCurrencyLabel(currency, locale),
      decimalSeparator,
      minorUnits,
    };
  }, [language, preferences.locale]);
}

/** Montant en texte modifiable (« 12,50 ») pour pré-remplir un champ, sans séparateur de milliers. */
export function amountToInput(
  amountMinor: MinorAmount,
  currency: CurrencyCode,
  decimalSeparator: string,
): string {
  const digits = minorUnits(currency);
  const text = String(Math.abs(amountMinor)).padStart(digits + 1, '0');
  const sign = amountMinor < 0 ? '-' : '';
  return digits === 0
    ? sign + text
    : `${sign}${text.slice(0, -digits)}${decimalSeparator}${text.slice(-digits)}`;
}
