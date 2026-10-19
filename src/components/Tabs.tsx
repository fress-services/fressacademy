import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import styles from './Tabs.module.css';

export interface TabItem<K extends string> {
  key: K;
  label: string;
  content: ReactNode;
}

interface Props<K extends string> {
  label: string;
  items: readonly TabItem<K>[];
  selected: K;
  onSelect: (key: K) => void;
}

/** Onglets accessibles (motif WAI-ARIA) : flèches gauche/droite, Début et Fin. */
export function Tabs<K extends string>({ label, items, selected, onSelect }: Props<K>) {
  const baseId = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const current = items.find((item) => item.key === selected) ?? items[0];

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = items.length - 1;
    const target =
      event.key === 'ArrowRight'
        ? (index + 1) % items.length
        : event.key === 'ArrowLeft'
          ? (index - 1 + items.length) % items.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (target === null) return;
    event.preventDefault();
    const item = items[target];
    if (!item) return;
    onSelect(item.key);
    buttons.current[target]?.focus();
  }

  return (
    <div className={styles.tabs}>
      <div role="tablist" aria-label={label} className={styles.list}>
        {items.map((item, index) => {
          const active = item.key === current?.key;
          return (
            <button
              key={item.key}
              ref={(el) => {
                buttons.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.key}`}
              aria-selected={active}
              aria-controls={`${baseId}-panel-${item.key}`}
              tabIndex={active ? 0 : -1}
              className={styles.tab}
              onClick={() => onSelect(item.key)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {current && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${current.key}`}
          aria-labelledby={`${baseId}-tab-${current.key}`}
          tabIndex={0}
          className={styles.panel}
        >
          {current.content}
        </div>
      )}
    </div>
  );
}
