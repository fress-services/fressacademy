import { useMemo } from 'react';
import { CURRENCY_CODES } from '../../domain/currencies';
import { useFormat } from '../../i18n/format';
import type { SelectOption } from '../../components/fields';

/** Toutes les devises ISO, libellées « EUR · euro » dans la langue de l'interface. */
export function useCurrencyOptions(): SelectOption[] {
  const { currencyLabel } = useFormat();
  return useMemo(
    () => CURRENCY_CODES.map((code) => ({ value: code, label: currencyLabel(code) })),
    [currencyLabel],
  );
}
