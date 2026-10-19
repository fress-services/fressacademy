import { Link } from 'react-router-dom';
import { Page } from '../../components/Page';
import { useI18n } from '../../i18n/context';
import type { MessageKey } from '../../i18n/translate';
import styles from './MorePage.module.css';

const ENTRIES: readonly { to: string; label: MessageKey; hint: MessageKey }[] = [
  { to: '/more/accounts', label: 'more.accounts', hint: 'more.accountsHint' },
  { to: '/more/categories', label: 'more.categories', hint: 'more.categoriesHint' },
  { to: '/more/planned', label: 'more.planned', hint: 'more.plannedHint' },
  { to: '/more/goals', label: 'more.goals', hint: 'more.goalsHint' },
  { to: '/more/settings', label: 'more.settings', hint: 'more.settingsHint' },
  { to: '/more/data', label: 'more.data', hint: 'more.dataHint' },
];

export function MorePage() {
  const { t } = useI18n();
  return (
    <Page title={t('more.title')}>
      <ul className={styles.list}>
        {ENTRIES.map((entry) => (
          <li key={entry.to}>
            <Link to={entry.to} className={styles.entry}>
              <span className={styles.label}>{t(entry.label)}</span>
              <span className={styles.hint}>{t(entry.hint)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Page>
  );
}
