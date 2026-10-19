import type { StorageErrorCode } from '../data/errors';
import { useI18n } from '../i18n/context';
import styles from './StartupError.module.css';

/** Écran affiché quand les données locales ne peuvent pas être ouvertes. */
export function StartupError({ code }: { code: StorageErrorCode }) {
  const { t } = useI18n();
  return (
    <main className={styles.screen}>
      <section className={styles.card} role="alert">
        <h1 className={styles.title}>{t('errors.startTitle')}</h1>
        <p>{t(`errors.${code}`)}</p>
        <button type="button" className={styles.button} onClick={() => window.location.reload()}>
          {t('common.reload')}
        </button>
      </section>
    </main>
  );
}
