import type { ReactNode } from 'react';
import styles from './Card.module.css';

/** Classe de carte, pour un formulaire qui doit avoir l'apparence d'une carte. */
export const cardClassName = styles.card;
export const cardTitleClassName = styles.title;

/** Carte arrondie du style Kolo, avec un titre facultatif. */
export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className={styles.card}>
      {title && <h2 className={styles.title}>{title}</h2>}
      {children}
    </section>
  );
}
