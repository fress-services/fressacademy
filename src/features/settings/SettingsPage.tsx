import { Page } from '../../components/Page';
import { useI18n } from '../../i18n/context';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES } from '../../i18n/languages';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  const { t, language, setLanguage } = useI18n();
  return (
    <Page title={t('settings.title')} backTo="/more">
      <fieldset className={styles.group}>
        <legend className={styles.legend}>{t('settings.language')}</legend>
        {SUPPORTED_LANGUAGES.map((code) => (
          <label key={code} className={styles.option} lang={code}>
            <input
              type="radio"
              name="language"
              value={code}
              checked={language === code}
              onChange={() => setLanguage(code)}
            />
            {LANGUAGE_NAMES[code]}
          </label>
        ))}
      </fieldset>
      <p className={styles.note}>{t('settings.themeNote')}</p>
    </Page>
  );
}
