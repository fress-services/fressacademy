export type IconName = 'home' | 'activity' | 'budget' | 'debts' | 'more';

const PATHS: Record<IconName, string> = {
  home: 'M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5',
  activity: 'M4 6h16M4 12h16M4 18h10',
  budget: 'M12 3a9 9 0 1 0 9 9h-9z M14 3.3A9 9 0 0 1 20.7 10H14z',
  debts: 'M7 7h13l-3-3M17 17H4l3 3',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
};

/** Icône décorative : le texte du lien porte toujours le sens. */
export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === 'more' ? 3 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
