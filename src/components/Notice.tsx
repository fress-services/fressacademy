import styles from './Notice.module.css';

interface Props {
  tone: 'success' | 'error' | 'info';
  children: string;
}

/**
 * Message de confirmation ou d'erreur annoncé aux lecteurs d'écran
 * (confirmation après sauvegarde, erreur visible si elle échoue : §4.3).
 */
export function Notice({ tone, children }: Props) {
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`${styles.notice} ${styles[tone]}`}>
      {children}
    </p>
  );
}
