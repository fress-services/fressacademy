import { useState } from 'react';
import { EmptyState } from '../../components/EmptyState';
import { Page } from '../../components/Page';
import { Tabs } from '../../components/Tabs';
import { useI18n } from '../../i18n/context';

type Direction = 'receivable' | 'payable';

export function DebtsPage() {
  const { t } = useI18n();
  const [direction, setDirection] = useState<Direction>('receivable');

  return (
    <Page title={t('debts.title')}>
      <Tabs<Direction>
        label={t('debts.tabsLabel')}
        selected={direction}
        onSelect={setDirection}
        items={[
          {
            key: 'receivable',
            label: t('debts.receivable'),
            content: (
              <EmptyState title={t('debts.emptyReceivableTitle')}>
                {t('debts.emptyReceivableBody')}
              </EmptyState>
            ),
          },
          {
            key: 'payable',
            label: t('debts.payable'),
            content: (
              <EmptyState title={t('debts.emptyPayableTitle')}>
                {t('debts.emptyPayableBody')}
              </EmptyState>
            ),
          },
        ]}
      />
    </Page>
  );
}
