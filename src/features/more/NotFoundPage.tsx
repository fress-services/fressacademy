import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { Page } from '../../components/Page';
import { useI18n } from '../../i18n/context';

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <Page title={t('notFound.title')}>
      <EmptyState title={t('notFound.title')} action={<Link to="/">{t('notFound.back')}</Link>}>
        {t('notFound.body')}
      </EmptyState>
    </Page>
  );
}
