import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../app/data';
import { describeError } from '../../app/describeError';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { CheckboxField, Field } from '../../components/fields';
import { Notice } from '../../components/Notice';
import { Page } from '../../components/Page';
import { MAX_BACKUP_BYTES, type BackupCounts, type BackupErrorCode } from '../../data/backup/json';
import type { DataSnapshot } from '../../data/repositories/types';
import { toLocalDate } from '../../domain/dates';
import type { Account, Category, Transaction } from '../../domain/types';
import { useI18n } from '../../i18n/context';
import { useFormat } from '../../i18n/format';
import type { MessageKey } from '../../i18n/translate';
import {
  clearAllData,
  exportBackup,
  markBackupDone,
  readBackup,
  restoreBackup,
} from '../../services/backup';
import { downloadFile } from '../shared/download';
import { Loaded } from '../shared/Loaded';
import { useLedger } from '../shared/useLedger';
import styles from './BackupPage.module.css';
import { transactionsCsv } from './transactionsCsv';

type Message = { tone: 'success' | 'error'; text: string } | null;

const ERROR_KEYS: Record<BackupErrorCode, MessageKey> = {
  tooLarge: 'backup.errorTooLarge',
  malformed: 'backup.errorMalformed',
  notKolo: 'backup.errorNotKolo',
  newerVersion: 'backup.errorNewerVersion',
  invalid: 'backup.errorInvalid',
};

const COUNT_KEYS: Record<keyof BackupCounts, MessageKey> = {
  accounts: 'backup.countAccounts',
  transactions: 'backup.countTransactions',
  categories: 'backup.countCategories',
  budgets: 'backup.countBudgets',
  debts: 'backup.countDebts',
  debtRepayments: 'backup.countRepayments',
  plannedExpenses: 'backup.countPlanned',
  goals: 'backup.countGoals',
};

/** Export CSV, sauvegarde et restauration JSON, effacement des données locales (§5.11, §9). */
export function BackupPage() {
  const { t } = useI18n();
  const ledger = useLedger();
  return (
    <Page title={t('backup.title')} backTo="/more">
      <Loaded state={ledger}>
        {({ transactions, accounts, categories }) => (
          <CsvExport transactions={transactions} accounts={accounts} categories={categories} />
        )}
      </Loaded>
      <JsonBackup />
      <Restore />
      <Erase />
    </Page>
  );
}

function CsvExport({
  transactions,
  accounts,
  categories,
}: {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
}) {
  const { t } = useI18n();
  const [message, setMessage] = useState<Message>(null);

  function download() {
    const content = transactionsCsv(transactions, accounts, categories, t);
    const date = toLocalDate(new Date());
    downloadFile(t('csv.fileName', { date }), content, 'text/csv;charset=utf-8');
    setMessage({ tone: 'success', text: t('backup.csvDone') });
  }

  return (
    <Card title={t('backup.csvTitle')}>
      <p>{t('backup.csvBody')}</p>
      {transactions.length === 0 ? (
        <p className={styles.muted}>{t('backup.csvEmpty')}</p>
      ) : (
        <Button variant="secondary" onClick={download}>
          {t('backup.csvAction')}
        </Button>
      )}
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
    </Card>
  );
}

/** Télécharge une sauvegarde complète ; renvoie un message à afficher. */
function useBackupDownload() {
  const { t } = useI18n();
  const { repositories } = useData();
  const [busy, setBusy] = useState(false);

  async function download(): Promise<Message> {
    setBusy(true);
    try {
      const { fileName, content } = await exportBackup(repositories);
      downloadFile(fileName, content, 'application/json');
      await markBackupDone(repositories);
      return { tone: 'success', text: t('backup.backupDone') };
    } catch (error) {
      return { tone: 'error', text: t('errors.saveFailed', { reason: describeError(error, t) }) };
    } finally {
      setBusy(false);
    }
  }

  return { busy, download };
}

function JsonBackup() {
  const { t } = useI18n();
  const format = useFormat();
  const { preferences } = useData();
  const { busy, download } = useBackupDownload();
  const [message, setMessage] = useState<Message>(null);
  const last = preferences.lastBackupAt;

  return (
    <Card title={t('backup.backupTitle')}>
      <p>{t('backup.backupBody')}</p>
      <p className={styles.warning}>{t('backup.privateWarning')}</p>
      <p className={styles.muted}>
        {last
          ? t('backup.lastBackup', { date: format.date(toLocalDate(new Date(last)), 'medium') })
          : t('backup.neverBackedUp')}
      </p>
      <Button disabled={busy} onClick={async () => setMessage(await download())}>
        {t('backup.backupAction')}
      </Button>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
    </Card>
  );
}

type RestoreState =
  | { step: 'idle' }
  | { step: 'checking' }
  | { step: 'rejected'; error: MessageKey }
  | { step: 'ready'; data: DataSnapshot; counts: BackupCounts; createdAt: string }
  | { step: 'done' };

/**
 * Restauration en trois temps : lecture et vérification du fichier, aperçu, confirmation.
 * `fresh` : premier lancement, rien à remplacer (pas de sauvegarde de secours à proposer).
 */
export function Restore({ fresh = false }: { fresh?: boolean }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const format = useFormat();
  const { repositories } = useData();
  const safety = useBackupDownload();
  const [state, setState] = useState<RestoreState>({ step: 'idle' });
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  // Change la clé du champ fichier pour le vider après une restauration ou une annulation.
  const [inputKey, setInputKey] = useState(0);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setConfirmed(false);
    setMessage(null);
    if (!file) {
      setState({ step: 'idle' });
      return;
    }
    if (file.size > MAX_BACKUP_BYTES) {
      setState({ step: 'rejected', error: ERROR_KEYS.tooLarge });
      return;
    }
    setState({ step: 'checking' });
    let text: string;
    try {
      text = await file.text();
    } catch {
      setState({ step: 'rejected', error: 'backup.errorRead' });
      return;
    }
    const parsed = readBackup(repositories, text);
    setState(
      parsed.ok
        ? { step: 'ready', data: parsed.data, counts: parsed.counts, createdAt: parsed.createdAt }
        : { step: 'rejected', error: ERROR_KEYS[parsed.error] },
    );
  }

  function reset() {
    setState({ step: 'idle' });
    setConfirmed(false);
    setInputKey((key) => key + 1);
  }

  async function restore(data: DataSnapshot) {
    setBusy(true);
    try {
      await restoreBackup(repositories, data);
      reset();
      setMessage({ tone: 'success', text: t('backup.restored') });
      // Au premier lancement, l'application s'ouvre ensuite sur l'accueil.
      if (fresh) navigate('/', { replace: true });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: `${t('errors.saveFailed', { reason: describeError(error, t) })} ${t('backup.unchanged')}`,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={t('backup.restoreTitle')}>
      <p>{t(fresh ? 'onboarding.restoreIntro' : 'backup.restoreBody')}</p>
      <Field label={t('backup.chooseFile')}>
        {(control) => (
          <input
            {...control}
            key={inputKey}
            type="file"
            accept="application/json,.json"
            className={styles.file}
            onChange={choose}
          />
        )}
      </Field>
      {state.step === 'checking' && <p role="status">{t('backup.checking')}</p>}
      {state.step === 'rejected' && (
        <Notice tone="error">{`${t(state.error)} ${t('backup.unchanged')}`}</Notice>
      )}
      {state.step === 'ready' && (
        <div className={styles.preview}>
          <p>
            {t('backup.preview', {
              date: format.date(toLocalDate(new Date(state.createdAt)), 'medium'),
            })}
          </p>
          <ul className={styles.counts}>
            {(Object.keys(COUNT_KEYS) as (keyof BackupCounts)[]).map((key) => (
              <li key={key}>{t(COUNT_KEYS[key], { count: state.counts[key] })}</li>
            ))}
          </ul>
          {!fresh && (
            <>
              <p className={styles.warning}>{t('backup.replaceWarning')}</p>
              <Button
                variant="secondary"
                disabled={safety.busy}
                onClick={async () => setMessage(await safety.download())}
              >
                {t('backup.safetyBackup')}
              </Button>
              <CheckboxField
                label={t('backup.restoreConfirm')}
                checked={confirmed}
                onChange={setConfirmed}
              />
            </>
          )}
          <div className={styles.actions}>
            <Button
              variant={fresh ? 'primary' : 'danger'}
              disabled={(!fresh && !confirmed) || busy}
              onClick={() => restore(state.data)}
            >
              {t('backup.restoreAction')}
            </Button>
            <Button variant="ghost" onClick={reset} disabled={busy}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
    </Card>
  );
}

function Erase() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { repositories } = useData();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function erase() {
    setBusy(true);
    setError(null);
    try {
      // Une fois les préférences effacées, l'application revient au premier lancement.
      await clearAllData(repositories);
      navigate('/', { replace: true });
    } catch (failure) {
      setError(t('errors.saveFailed', { reason: describeError(failure, t) }));
      setBusy(false);
    }
  }

  return (
    <Card title={t('backup.eraseTitle')}>
      <p>{t('backup.eraseBody')}</p>
      <p className={styles.muted}>{t('backup.eraseLimits')}</p>
      <CheckboxField label={t('backup.eraseConfirm')} checked={confirmed} onChange={setConfirmed} />
      <Button variant="danger" disabled={!confirmed || busy} onClick={erase}>
        {t('backup.eraseAction')}
      </Button>
      {error && <Notice tone="error">{error}</Notice>}
    </Card>
  );
}
