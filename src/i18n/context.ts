import { createContext, useContext } from 'react';
import type { Language } from './languages';
import type { MessageKey, MessageParams } from './translate';

export interface I18nValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: MessageKey, params?: MessageParams) => string;
}

export const I18nContext = createContext<I18nValue | null>(null);

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n doit être utilisé dans un I18nProvider');
  return value;
}
