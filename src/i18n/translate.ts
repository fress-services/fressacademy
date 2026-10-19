import type { Messages } from './fr';

/** Toutes les clés possibles, sous la forme « section.cle ». */
export type MessageKey = {
  [S in keyof Messages & string]: `${S}.${keyof Messages[S] & string}`;
}[keyof Messages & string];

export type MessageParams = Record<string, string | number>;

/** Renvoie le texte d'une clé, en remplaçant les {variables} par les valeurs fournies. */
export function translate(messages: Messages, key: MessageKey, params?: MessageParams): string {
  const [section, name] = key.split('.') as [keyof Messages, string];
  const template = (messages[section] as Record<string, string>)[name] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, param: string) =>
    param in params ? String(params[param]) : match,
  );
}
