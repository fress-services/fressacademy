import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { I18nContext, type I18nValue } from './context';
import { MESSAGES, type Language } from './languages';
import { translate } from './translate';

interface Props {
  initialLanguage: Language;
  children: ReactNode;
}

export function I18nProvider({ initialLanguage, children }: Props) {
  const [language, setLanguage] = useState<Language>(initialLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nValue>(
    () => ({
      language,
      setLanguage,
      t: (key, params) => translate(MESSAGES[language], key, params),
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
