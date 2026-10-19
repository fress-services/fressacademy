import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';
import { useI18n } from '../i18n/context';
import type { MessageKey } from '../i18n/translate';
import styles from './AppShell.module.css';

interface NavItem {
  to: string;
  label: MessageKey;
  icon: IconName;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'nav.home', icon: 'home' },
  { to: '/activity', label: 'nav.activity', icon: 'activity' },
  { to: '/budget', label: 'nav.budget', icon: 'budget' },
  { to: '/debts', label: 'nav.debts', icon: 'debts' },
  { to: '/more', label: 'nav.more', icon: 'more' },
];

/** Mise en page : barre d'onglets en bas sur téléphone, barre latérale sur grand écran. */
export function AppShell() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  // Après un changement de page, place le focus sur le contenu pour les lecteurs d'écran.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    main.current?.focus();
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip}>
        {t('a11y.skipToContent')}
      </a>
      <header className={styles.brand}>
        <span className={styles.logo} aria-hidden="true">
          K
        </span>
        <span>
          <span className={styles.name}>{t('app.name')}</span>
          <span className={styles.tagline}>{t('app.tagline')}</span>
        </span>
      </header>
      <nav aria-label={t('nav.label')} className={styles.nav}>
        <ul className={styles.navList}>
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.to === '/'} className={styles.navLink}>
                <Icon name={item.icon} />
                <span>{t(item.label)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main id="main" ref={main} tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
