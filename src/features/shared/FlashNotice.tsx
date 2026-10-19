import { Notice } from '../../components/Notice';
import { useI18n } from '../../i18n/context';
import { useFlash } from './useFlash';

/** Confirmation transmise par la page précédente (« Opération enregistrée. »). */
export function FlashNotice() {
  const { t } = useI18n();
  const notice = useFlash();
  return notice ? <Notice tone="success">{t(notice)}</Notice> : null;
}
