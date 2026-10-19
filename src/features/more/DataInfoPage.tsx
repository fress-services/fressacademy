import { useEffect, useState } from 'react';
import { Page } from '../../components/Page';
import {
  checkPersistentStorage,
  requestPersistentStorage,
  type PersistenceStatus,
} from '../../data/local/persistence';
import { useI18n } from '../../i18n/context';
import styles from './DataInfoPage.module.css';

export function DataInfoPage() {
  const { t } = useI18n();
  const [protection, setProtection] = useState<PersistenceStatus | 'checking'>('checking');
  const [refused, setRefused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void checkPersistentStorage().then((status) => {
      if (!cancelled) setProtection(status);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function requestProtection() {
    const status = await requestPersistentStorage();
    setProtection(status);
    setRefused(status === 'denied');
  }

  return (
    <Page title={t('data.title')} backTo="/more">
      <div className={styles.text}>
        <p>{t('data.where')}</p>
        <p>{t('data.risk')}</p>
        <p>{t('data.privacy')}</p>
      </div>
      <section className={styles.text} aria-labelledby="protection-title">
        <h2 id="protection-title" className={styles.subtitle}>
          {t('data.protectionTitle')}
        </h2>
        <p className={styles.status} role="status">
          {protection === 'checking' && t('data.protectionChecking')}
          {protection === 'granted' && t('data.protectionGranted')}
          {protection === 'denied' && t('data.protectionDenied')}
          {protection === 'unsupported' && t('data.protectionUnsupported')}
        </p>
        {protection === 'denied' && (
          <button type="button" className={styles.button} onClick={requestProtection}>
            {t('data.protectionAction')}
          </button>
        )}
        {refused && <p className={styles.hint}>{t('data.protectionRefused')}</p>}
      </section>
    </Page>
  );
}
