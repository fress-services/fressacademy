import { EmptyState } from '../../components/EmptyState';
import { Page } from '../../components/Page';
import { useI18n } from '../../i18n/context';
import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const { t } = useI18n();
  return (
    <Page title={t('home.title')}>
      <p className={styles.notice}>{t('home.notice')}</p>
      <EmptyState title={t('home.emptyTitle')}>{t('home.emptyBody')}</EmptyState>
    </Page>
  );
}
