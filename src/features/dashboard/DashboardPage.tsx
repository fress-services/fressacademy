import { Page } from '../../components/Page';
import { useI18n } from '../../i18n/context';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const { t } = useI18n();
  return (
    <Page title={t('home.title')}>
      <section className={styles.hero}>
        <p className={styles.heroLabel}>{t('app.tagline')}</p>
        <h2 className={styles.heroTitle}>{t('home.emptyTitle')}</h2>
        <p className={styles.heroNote}>{t('home.emptyBody')}</p>
      </section>
      <p className={styles.notice}>{t('home.notice')}</p>
    </Page>
  );
}
