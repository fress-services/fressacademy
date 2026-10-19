import { useLocation } from 'react-router-dom';
import type { MessageKey } from '../../i18n/translate';

/** Message de confirmation transmis lors d'une navigation (« Compte enregistré. »). */
export function useFlash(): MessageKey | null {
  const state = useLocation().state as { notice?: MessageKey } | null;
  return state?.notice ?? null;
}

export function flash(notice: MessageKey) {
  return { state: { notice } };
}
