import { Button } from '../components/Button';
import { useI18n } from '../i18n/context';
import styles from './UpdateBanner.module.css';

export type PwaStatus = 'needRefresh' | 'registerError' | null;

interface Props {
  status: PwaStatus;
  onReload: () => void;
  onDismiss: () => void;
}

/**
 * Bandeau du service worker (§8.4) : nouvelle version prête (rechargement seulement à la demande,
 * pour ne pas perdre une saisie) ou échec de l'activation du mode hors ligne.
 */
export function UpdateBanner({ status, onReload, onDismiss }: Props) {
  const { t } = useI18n();
  if (!status) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.banner} role={status === 'registerError' ? 'alert' : 'status'}>
        <p className={styles.text}>
          {status === 'needRefresh' && t('pwa.updateAvailable')}
          {status === 'registerError' && t('pwa.registerError')}
        </p>
        <div className={styles.actions}>
          {status === 'needRefresh' && <Button onClick={onReload}>{t('pwa.reload')}</Button>}
          <Button variant="ghost" onClick={onDismiss}>
            {status === 'needRefresh' ? t('pwa.later') : t('pwa.close')}
          </Button>
        </div>
      </div>
    </div>
  );
}
