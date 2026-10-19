/**
 * Écriture CSV (RFC 4180) : séparateur virgule, guillemets doublés, fins de ligne CRLF.
 * Le fichier commence par une marque d'ordre des octets (BOM) pour que les tableurs lisent
 * correctement l'UTF-8 (accents, symboles de devises).
 */

const BOM = '﻿';

/**
 * Une cellule de texte qui commence par = + - @ (ou une tabulation) serait lue comme une
 * formule par un tableur : on la préfixe d'une apostrophe (injection CSV, OWASP).
 */
export function protectFormula(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function escapeCell(cell: string): string {
  return /[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

export function toCsv(header: readonly string[], rows: readonly (readonly string[])[]): string {
  return BOM + [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n') + '\r\n';
}
