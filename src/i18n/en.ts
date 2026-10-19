import type { Messages } from './fr';

export const en: Messages = {
  app: {
    name: 'Kolo',
    tagline: 'See your money clearly.',
    pageTitle: '{page} · Kolo',
  },
  a11y: {
    skipToContent: 'Skip to content',
  },
  nav: {
    label: 'Main navigation',
    home: 'Home',
    activity: 'Activity',
    budget: 'Budget',
    debts: 'Debts',
    more: 'More',
  },
  home: {
    title: 'Home',
    emptyTitle: 'Welcome to Kolo',
    emptyBody:
      'Your balances by currency, this month’s spending and income, your budget margin and upcoming due dates will appear here.',
    notice:
      'Kolo does not connect to any bank. You enter your own transactions and they stay on this device.',
  },
  activity: {
    title: 'Activity',
    emptyTitle: 'No transactions yet',
    emptyBody: 'Your income, expenses and transfers will appear here, newest first.',
  },
  budget: {
    title: 'Budget',
    emptyTitle: 'No spending limit',
    emptyBody:
      'A monthly limit will show how much you have left to spend this month and what that means per day.',
  },
  debts: {
    title: 'Debts',
    tabsLabel: 'Debt type',
    receivable: 'Owed to me',
    payable: 'I owe',
    emptyReceivableTitle: 'Nothing owed to you',
    emptyReceivableBody: 'Money other people owe you will appear here.',
    emptyPayableTitle: 'Nothing to repay',
    emptyPayableBody: 'Money you owe other people will appear here.',
  },
  more: {
    title: 'More',
    settings: 'Settings',
    settingsHint: 'Language and theme',
    data: 'Your data',
    dataHint: 'Where it is stored and how to protect it',
  },
  settings: {
    title: 'Settings',
    language: 'Interface language',
    theme: 'Theme',
    themeDark: 'Dark',
    themeLight: 'Light',
    themeSystem: 'Same as device',
    saved: 'Preference saved.',
  },
  data: {
    title: 'Your data',
    where:
      'Your data stays in this browser, on this device. Kolo does not send your amounts to a server.',
    risk: 'If you clear this browser’s data or lose this device, your data will be lost unless you have exported a backup.',
    privacy:
      'Anyone with access to this unlocked device can view this data. Kolo is neither a bank nor an encrypted service.',
    protectionTitle: 'Protection against automatic deletion',
    protectionGranted: 'On: the browser will not delete this data on its own to free up space.',
    protectionDenied:
      'Off: the browser could delete this data if it runs out of space or if Kolo is not used for a long time.',
    protectionUnsupported: 'This browser cannot protect data against deletion.',
    protectionChecking: 'Checking…',
    protectionAction: 'Request protection',
    protectionRefused:
      'The browser declined for now. Installing Kolo on your home screen may help.',
  },
  notFound: {
    title: 'Page not found',
    body: 'This page does not exist or has moved.',
    back: 'Back to home',
  },
  common: {
    back: 'Back',
    loading: 'Loading…',
    reload: 'Reload page',
  },
  errors: {
    startTitle: 'Kolo cannot open your data',
    unavailable:
      'This browser’s storage is not available (private browsing or storage blocked). Open Kolo in a normal window or another browser.',
    quotaExceeded: 'This browser’s storage is full. Free up some space, then reload the page.',
    newerVersion:
      'Your data was saved by a newer version of Kolo. Reload the page to get the latest version. Your data has not been changed.',
    notFound: 'The requested item no longer exists.',
    unknown: 'An unexpected error occurred. Reload the page. Your data has not been changed.',
    saveFailed: 'Saving failed: {reason}',
  },
};
