import { useState } from 'react';
import { useData } from '../../app/data';
import { Page } from '../../components/Page';
import { toStorageError } from '../../data/errors';
import type { ThemePreference } from '../../domain/types';
import { useI18n } from '../../i18n/context';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES } from '../../i18n/languages';
import type { MessageKey } from '../../i18n/translate';
import styles from './SettingsPage.module.css';

const THEMES: readonly { value: ThemePreference; label: MessageKey }[] = [
  { value: 'dark', label: 'settings.themeDark' },
  { value: 'light', label: 'settings.themeLight' },
  { value: 'system', label: 'settings.themeSystem' },
];

type SaveStatus = { kind: 'idle' } | { kind: 'saved' } | { kind: 'error'; message: string };

export function SettingsPage() {
  const { t, language, setLanguage } = useI18n();
  const { preferences, updatePreferences } = useData();
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' });

  async function save(work: () => Promise<void>) {
    try {
      await work();
      setStatus({ kind: 'saved' });
    } catch (error) {
      const reason = t(`errors.${toStorageError(error).code}`);
      setStatus({ kind: 'error', message: t('errors.saveFailed', { reason }) });
    }
  }

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
              onChange={() => save(() => setLanguage(code))}
            />
            {LANGUAGE_NAMES[code]}
          </label>
        ))}
      </fieldset>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>{t('settings.theme')}</legend>
        {THEMES.map((theme) => (
          <label key={theme.value} className={styles.option}>
            <input
              type="radio"
              name="theme"
              value={theme.value}
              checked={preferences.theme === theme.value}
              onChange={() => save(() => updatePreferences({ theme: theme.value }))}
            />
            {t(theme.label)}
          </label>
        ))}
      </fieldset>
      <p role="status" className={status.kind === 'error' ? styles.error : styles.note}>
        {status.kind === 'saved' && t('settings.saved')}
      </p>
      {status.kind === 'error' && (
        <p role="alert" className={styles.error}>
          {status.message}
        </p>
      )}
    </Page>
  );
}
