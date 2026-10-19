import { describe, expect, it } from 'vitest';
import { en } from './en';
import { fr } from './fr';
import { detectLanguage } from './languages';
import { translate } from './translate';

function keysOf(messages: object, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : keysOf(value as object, `${prefix}${key}.`),
  );
}

function valuesOf(messages: object): string[] {
  return Object.values(messages).flatMap((value) =>
    typeof value === 'string' ? [value] : valuesOf(value as object),
  );
}

describe('traductions', () => {
  it('le français et l’anglais ont exactement les mêmes clés', () => {
    expect(keysOf(en).sort()).toEqual(keysOf(fr).sort());
  });

  it('aucun texte n’est vide', () => {
    for (const value of [...valuesOf(fr), ...valuesOf(en)]) {
      expect(value.trim()).not.toBe('');
    }
  });

  it('les variables {x} sont les mêmes dans les deux langues', () => {
    const vars = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
    const frTexts = Object.fromEntries(keysOf(fr).map((k, i) => [k, valuesOf(fr)[i]]));
    const enTexts = Object.fromEntries(keysOf(en).map((k, i) => [k, valuesOf(en)[i]]));
    for (const key of Object.keys(frTexts)) {
      expect(vars(enTexts[key] ?? ''), key).toEqual(vars(frTexts[key] ?? ''));
    }
  });
});

describe('translate', () => {
  it('renvoie le texte de la clé', () => {
    expect(translate(fr, 'nav.home')).toBe('Accueil');
    expect(translate(en, 'nav.home')).toBe('Home');
  });

  it('remplace les variables', () => {
    expect(translate(fr, 'app.pageTitle', { page: 'Budget' })).toBe('Budget · Kolo');
  });

  it('laisse visible une variable non fournie', () => {
    expect(translate(fr, 'app.pageTitle', {})).toBe('{page} · Kolo');
  });
});

describe('detectLanguage', () => {
  it('choisit la première langue prise en charge', () => {
    expect(detectLanguage(['fr-CM', 'en-US'])).toBe('fr');
    expect(detectLanguage(['de-DE', 'en-GB', 'fr'])).toBe('en');
    expect(detectLanguage(['FR'])).toBe('fr');
  });

  it('utilise l’anglais si aucune langue n’est prise en charge', () => {
    expect(detectLanguage(['ja-JP'])).toBe('en');
    expect(detectLanguage([])).toBe('en');
  });
});
