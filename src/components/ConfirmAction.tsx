import { useState } from 'react';
import { useI18n } from '../i18n/context';
import { Button } from './Button';
import styles from './ConfirmAction.module.css';

interface Props {
  label: string;
  question: string;
  onConfirm: () => void | Promise<void>;
}

/** Action destructrice en deux temps : un premier appui affiche la question de confirmation. */
export function ConfirmAction({ label, question, onConfirm }: Props) {
  const { t } = useI18n();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!asking) {
    return (
      <Button variant="danger" onClick={() => setAsking(true)}>
        {label}
      </Button>
    );
  }

  return (
    <div className={styles.confirm} role="group" aria-label={label}>
      <p className={styles.question}>{question}</p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => setAsking(false)} disabled={busy}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
              setAsking(false);
            }
          }}
        >
          {t('common.confirmDelete')}
        </Button>
      </div>
    </div>
  );
}
