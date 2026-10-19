import { EmptyState } from '../../components/EmptyState';
import { Page } from '../../components/Page';
import { useI18n } from '../../i18n/context';

export function BudgetPage() {
  const { t } = useI18n();
  return (
    <Page title={t('budget.title')}>
      <EmptyState title={t('budget.emptyTitle')}>{t('budget.emptyBody')}</EmptyState>
    </Page>
  );
}
