import { useEffect, useMemo, type ReactNode } from 'react';
import { I18nContext, type I18nValue } from './context';
import { MESSAGES, type Language } from './languages';
import { translate } from './translate';

interface Props {
  language: Language;
  /** Appelé quand l'utilisateur choisit une autre langue (l'enregistrement est fait ailleurs). */
  onLanguageChange: (language: Language) => Promise<void>;
  children: ReactNode;
}

export function I18nProvider({ language, onLanguageChange, children }: Props) {
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nValue>(
    () => ({
      language,
      setLanguage: onLanguageChange,
      t: (key, params) => translate(MESSAGES[language], key, params),
    }),
    [language, onLanguageChange],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
