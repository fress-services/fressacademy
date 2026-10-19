import { Page } from '../../components/Page';
import { useI18n } from '../../i18n/context';
import styles from './DataInfoPage.module.css';

export function DataInfoPage() {
  const { t } = useI18n();
  return (
    <Page title={t('data.title')} backTo="/more">
      <div className={styles.text}>
        <p>{t('data.where')}</p>
        <p>{t('data.risk')}</p>
        <p>{t('data.privacy')}</p>
      </div>
    </Page>
  );
}
