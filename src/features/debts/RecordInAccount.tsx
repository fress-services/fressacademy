import { CheckboxField, SelectField } from '../../components/fields';
import type { CurrencyCode } from '../../domain/currencies';
import type { Account } from '../../domain/types';
import { useI18n } from '../../i18n/context';
import { accountLabel } from '../shared/labels';
import styles from '../shared/list.module.css';

interface Props {
  label: string;
  explanation: string;
  accounts: Account[];
  currency: CurrencyCode | null;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  accountId: string;
  onAccountChange: (id: string) => void;
  error?: string | undefined;
}

/**
 * Choix explicite « enregistrer dans un compte » (§5.6) : seul un compte actif de la même devise
 * est proposé, et le texte dit ce qui arrive au solde pour éviter tout double comptage.
 */
export function RecordInAccount({
  label,
  explanation,
  accounts,
  currency,
  enabled,
  onEnabledChange,
  accountId,
  onAccountChange,
  error,
}: Props) {
  const { t } = useI18n();
  const compatible = accounts.filter(
    (account) => !account.archivedAt && account.currencyCode === currency,
  );
  return (
    <div className={styles.section}>
      <CheckboxField label={label} checked={enabled} onChange={onEnabledChange} />
      {enabled ? (
        compatible.length === 0 ? (
          <p className={styles.muted} role="status">
            {t('debts.noCompatibleAccount')}
          </p>
        ) : (
          <SelectField
            label={t('debts.account')}
            value={accountId}
            onChange={onAccountChange}
            options={compatible.map((account) => ({
              value: account.id,
              label: accountLabel(account),
            }))}
            placeholder={t('transaction.chooseAccount')}
            hint={explanation}
            error={error}
          />
        )
      ) : (
        <p className={styles.muted}>{t('debts.noRecordHint')}</p>
      )}
    </div>
  );
}
