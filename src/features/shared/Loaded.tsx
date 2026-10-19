import type { ReactNode } from 'react';
import type { QueryState } from '../../app/useRepositoryQuery';
import { Notice } from '../../components/Notice';
import { useI18n } from '../../i18n/context';

/** Affiche le contenu une fois les données lues, ou un message de chargement ou d'erreur. */
export function Loaded<T>({
  state,
  children,
}: {
  state: QueryState<T>;
  children: (data: T) => ReactNode;
}) {
  const { t } = useI18n();
  if (state.status === 'loading') return <p aria-busy="true">{t('common.loading')}</p>;
  if (state.status === 'error') return <Notice tone="error">{t(`errors.${state.code}`)}</Notice>;
  return <>{children(state.data)}</>;
}
