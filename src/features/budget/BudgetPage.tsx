import { useState } from 'react';
import { useData } from '../../app/data';
import { describeError } from '../../app/describeError';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ConfirmAction } from '../../components/ConfirmAction';
import { EmptyState } from '../../components/EmptyState';
import { Notice } from '../../components/Notice';
import { Page } from '../../components/Page';
import { budgetForMonth, budgetStatus } from '../../domain/budget';
import { monthOf, toLocalDate } from '../../domain/dates';
import { useI18n } from '../../i18n/context';
import { useFormat } from '../../i18n/format';
import { removeBudget } from '../../services/budget';
import { Loaded } from '../shared/Loaded';
import { useLedger } from '../shared/useLedger';
import { BudgetForm } from './BudgetForm';
import { BudgetSummary } from './BudgetSummary';
import styles from './BudgetPage.module.css';

type Status = { tone: 'success' | 'error'; text: string } | null;

export function BudgetPage() {
  const { t } = useI18n();
  const format = useFormat();
  const { repositories } = useData();
  const ledger = useLedger();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const today = toLocalDate(new Date());
  const month = monthOf(today);

  return (
    <Page title={t('budget.title')}>
      {status && <Notice tone={status.tone}>{status.text}</Notice>}
      <Loaded state={ledger}>
        {({ budgets, transactions }) => {
          const budget = budgetForMonth(budgets, month);
          if (editing) {
            return (
              <BudgetForm
                current={budget}
                month={month}
                onDone={(saved) => {
                  setEditing(false);
                  setStatus(saved ? { tone: 'success', text: t('budget.saved') } : null);
                }}
              />
            );
          }
          if (!budget) {
            return (
              <EmptyState
                title={t('budget.emptyTitle')}
                action={
                  <Button
                    onClick={() => {
                      setStatus(null);
                      setEditing(true);
                    }}
                  >
                    {t('budget.setLimit')}
                  </Button>
                }
              >
                {t('budget.emptyBody')}
              </EmptyState>
            );
          }
          return (
            <>
              <Card title={t('budget.monthTitle', { month: format.month(month) })}>
                <BudgetSummary status={budgetStatus(budget, transactions, today)} />
              </Card>
              <div className={styles.actions}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setStatus(null);
                    setEditing(true);
                  }}
                >
                  {t('budget.editLimit')}
                </Button>
              </div>
              <ConfirmAction
                label={t('budget.remove')}
                question={t('budget.removeConfirm')}
                onConfirm={async () => {
                  try {
                    await removeBudget(repositories);
                    setStatus({ tone: 'success', text: t('budget.removed') });
                  } catch (error) {
                    setStatus({
                      tone: 'error',
                      text: t('errors.saveFailed', { reason: describeError(error, t) }),
                    });
                  }
                }}
              />
            </>
          );
        }}
      </Loaded>
    </Page>
  );
}
