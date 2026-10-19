import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

interface Props {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

/** État vide : explique ce qui apparaîtra ici, avec une action utile quand elle existe. */
export function EmptyState({ title, children, action }: Props) {
  return (
    <section className={styles.empty}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.body}>{children}</p>
      {action && <div className={styles.action}>{action}</div>}
    </section>
  );
}
