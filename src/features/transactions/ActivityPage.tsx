import { EmptyState } from '../../components/EmptyState';
import { Page } from '../../components/Page';
import { useI18n } from '../../i18n/context';

export function ActivityPage() {
  const { t } = useI18n();
  return (
    <Page title={t('activity.title')}>
      <EmptyState title={t('activity.emptyTitle')}>{t('activity.emptyBody')}</EmptyState>
    </Page>
  );
}
