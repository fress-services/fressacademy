/**
 * Dates métier : chaînes locales « AAAA-MM-JJ », sans heure ni fuseau.
 * Une opération du 31 janvier reste au 31 janvier même si l'appareil change de fuseau.
 * Les horodatages techniques (création, modification) sont des chaînes ISO en UTC.
 */
export type LocalDate = string;
/** Mois métier « AAAA-MM ». */
export type LocalMonth = string;
export type IsoTimestamp = string;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Nombre de jours d'un mois (month de 1 à 12). */
export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function isLocalDate(value: string): value is LocalDate {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

export function isLocalMonth(value: string): value is LocalMonth {
  const match = MONTH_PATTERN.exec(value);
  return !!match && Number(match[1]) >= 1 && Number(match[2]) >= 1 && Number(match[2]) <= 12;
}

function parts(date: LocalDate): [number, number, number] {
  const match = DATE_PATTERN.exec(date);
  if (!match || !isLocalDate(date)) throw new RangeError(`Date invalide : ${date}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Date du jour selon l'horloge et le fuseau de l'appareil. */
export function toLocalDate(moment: Date): LocalDate {
  return `${pad(moment.getFullYear(), 4)}-${pad(moment.getMonth() + 1)}-${pad(moment.getDate())}`;
}

export function monthOf(date: LocalDate): LocalMonth {
  const [year, month] = parts(date);
  return `${pad(year, 4)}-${pad(month)}`;
}

export function firstDayOfMonth(month: LocalMonth): LocalDate {
  if (!isLocalMonth(month)) throw new RangeError(`Mois invalide : ${month}`);
  return `${month}-01`;
}

export function lastDayOfMonth(month: LocalMonth): LocalDate {
  if (!isLocalMonth(month)) throw new RangeError(`Mois invalide : ${month}`);
  const [year, monthNumber] = month.split('-').map(Number) as [number, number];
  return `${month}-${pad(daysInMonth(year, monthNumber))}`;
}

/** Ajoute (ou retire) des mois à un mois métier : addMonths("2026-01", -1) → "2025-12". */
export function addMonths(month: LocalMonth, count: number): LocalMonth {
  if (!isLocalMonth(month)) throw new RangeError(`Mois invalide : ${month}`);
  const [year, monthNumber] = month.split('-').map(Number) as [number, number];
  const index = year * 12 + (monthNumber - 1) + count;
  return `${pad(Math.floor(index / 12), 4)}-${pad((index % 12) + 1)}`;
}

/** Nombre de jours restants dans le mois, aujourd'hui inclus (dernier jour → 1). */
export function daysRemainingInMonth(today: LocalDate): number {
  const [year, month, day] = parts(today);
  return daysInMonth(year, month) - day + 1;
}

/** Comparaison de dates métier : négatif si a < b, 0 si égales, positif si a > b. */
export function compareLocalDates(a: LocalDate, b: LocalDate): number {
  parts(a);
  parts(b);
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Vrai si la date est dans le mois donné (dates comparées comme dates locales). */
export function isInMonth(date: LocalDate, month: LocalMonth): boolean {
  return monthOf(date) === month;
}
