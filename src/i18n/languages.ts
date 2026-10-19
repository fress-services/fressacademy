import { en } from './en';
import { fr, type Messages } from './fr';

export const SUPPORTED_LANGUAGES = ['fr', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** Nom de chaque langue, écrit dans cette langue (identique quelle que soit l'interface). */
export const LANGUAGE_NAMES: Record<Language, string> = {
  fr: 'Français',
  en: 'English',
};

export const MESSAGES: Record<Language, Messages> = { fr, en };

export function isLanguage(value: string): value is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Propose une langue à partir des préférences du navigateur.
 * Ce n'est qu'une suggestion : l'utilisateur peut la changer dans les paramètres.
 */
export function detectLanguage(preferred: readonly string[]): Language {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0] ?? '';
    if (isLanguage(base)) return base;
  }
  return 'en';
}
