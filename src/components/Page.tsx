import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/context';
import styles from './Page.module.css';

interface Props {
  title: string;
  /** Lien de retour pour les sous-pages (par exemple Plus > Paramètres). */
  backTo?: string;
  children: ReactNode;
}

/** Gabarit commun : titre de page, titre de l'onglet du navigateur et contenu. */
export function Page({ title, backTo, children }: Props) {
  const { t } = useI18n();

  useEffect(() => {
    document.title = t('app.pageTitle', { page: title });
  }, [t, title]);

  return (
    <div className={styles.page}>
      {backTo && (
        <Link to={backTo} className={styles.back}>
          <span aria-hidden="true">‹ </span>
          {t('common.back')}
        </Link>
      )}
      <h1 className={styles.title}>{title}</h1>
      {children}
    </div>
  );
}
