import { useState, type FormEvent } from 'react';
import { useData } from '../../app/data';
import { describeError } from '../../app/describeError';
import { Button } from '../../components/Button';
import { cardClassName } from '../../components/Card';
import { AmountField, Segmented, SelectField } from '../../components/fields';
import { Notice } from '../../components/Notice';
import { Page } from '../../components/Page';
import { isCurrencyCode, minorUnits, type CurrencyCode } from '../../domain/currencies';
import { parseAmount } from '../../domain/money';
import { hasErrors, validateAccount } from '../../domain/validation';
import { suggestCurrency } from '../../domain/regions';
import { useI18n } from '../../i18n/context';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, type Language } from '../../i18n/languages';
import type { AccountInput } from '../../services/accounts';
import { ValidationError } from '../../services/errors';
import { completeOnboarding } from '../../services/onboarding';
import { AccountForm } from '../accounts/AccountForm';
import { Restore } from '../backup/BackupPage';
import { useCurrencyOptions } from '../shared/useCurrencyOptions';
import styles from './OnboardingPage.module.css';

const TOTAL_STEPS = 4;

function browserSuggestion(): CurrencyCode | null {
  return suggestCurrency(typeof navigator === 'undefined' ? [] : navigator.languages);
}

/**
 * Premier lancement (§4.1) : langue, devise principale, premier compte et limite mensuelle
 * facultatifs. Rien n'est enregistré comme terminé avant la dernière étape.
 */
export function Onboarding() {
  return (
    <main id="main" tabIndex={-1} className={styles.screen}>
      <OnboardingPage />
    </main>
  );
}

function OnboardingPage() {
  const { t, language, setLanguage } = useI18n();
  const { repositories, preferences } = useData();
  const currencyOptions = useCurrencyOptions();
  const [step, setStep] = useState(1);
  const [restoring, setRestoring] = useState(false);
  const [suggested] = useState(browserSuggestion);
  const [currency, setCurrency] = useState<string>(preferences.defaultCurrency ?? suggested ?? '');
  const [currencyError, setCurrencyError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountInput | null>(null);
  const [limit, setLimit] = useState('');
  const [limitError, setLimitError] = useState<string | undefined>();

  async function finish(budgetLimitMinor: number | null) {
    if (!isCurrencyCode(currency)) return;
    setError(null);
    try {
      await completeOnboarding(repositories, {
        defaultCurrency: currency,
        account,
        budgetLimitMinor,
      });
    } catch (failure) {
      setError(t('errors.saveFailed', { reason: describeError(failure, t) }));
    }
  }

  function submitBudget(event: FormEvent) {
    event.preventDefault();
    if (!isCurrencyCode(currency)) return;
    const parsed = parseAmount(limit, currency);
    if (!parsed.ok) {
      setLimitError(t(`amountErrors.${parsed.error}`, { digits: minorUnits(currency) }));
      return;
    }
    setLimitError(undefined);
    void finish(parsed.amountMinor);
  }

  function confirmCurrency(event: FormEvent) {
    event.preventDefault();
    if (!isCurrencyCode(currency)) {
      setCurrencyError(t('validation.required'));
      return;
    }
    setCurrencyError(undefined);
    setStep(3);
  }

  const stepLabel = (
    <p className={styles.step}>{t('onboarding.step', { current: step, total: TOTAL_STEPS })}</p>
  );

  if (restoring) {
    // Nouvel appareil : récupérer une sauvegarde au lieu de tout ressaisir (§5.11).
    return (
      <Page title={t('onboarding.restoreTitle')}>
        <Restore fresh />
        <Button variant="ghost" onClick={() => setRestoring(false)}>
          {t('common.back')}
        </Button>
      </Page>
    );
  }

  if (step === 1) {
    return (
      <Page title={t('onboarding.title')}>
        {stepLabel}
        <section className={styles.hero}>
          <p>{t('onboarding.intro')}</p>
        </section>
        <Segmented<Language>
          legend={t('settings.language')}
          name="language"
          value={language}
          options={SUPPORTED_LANGUAGES.map((code) => ({
            value: code,
            label: LANGUAGE_NAMES[code],
          }))}
          onChange={(code) => {
            setLanguage(code).catch(() => {});
          }}
        />
        <Button block onClick={() => setStep(2)}>
          {t('onboarding.next')}
        </Button>
        <Button block variant="ghost" onClick={() => setRestoring(true)}>
          {t('onboarding.restore')}
        </Button>
      </Page>
    );
  }

  if (step === 2) {
    return (
      <Page title={t('onboarding.currencyTitle')}>
        {stepLabel}
        <form className={cardClassName} onSubmit={confirmCurrency} noValidate>
          <p>{t('onboarding.currencyIntro')}</p>
          {suggested && (
            <Notice tone="info">
              {t('onboarding.currencySuggested', { currency: suggested })}
            </Notice>
          )}
          <SelectField
            label={t('accounts.currency')}
            value={currency}
            onChange={setCurrency}
            options={currencyOptions}
            placeholder={t('accounts.currencyPlaceholder')}
            error={currencyError}
          />
          <div className={styles.actions}>
            <Button type="submit">{t('onboarding.next')}</Button>
            <Button variant="ghost" onClick={() => setStep(1)}>
              {t('common.back')}
            </Button>
          </div>
        </form>
      </Page>
    );
  }

  if (step === 3) {
    return (
      <Page title={t('onboarding.accountTitle')}>
        {stepLabel}
        <p>{t('onboarding.accountIntro')}</p>
        <AccountForm
          defaultCurrency={isCurrencyCode(currency) ? currency : null}
          submitLabel={t('onboarding.next')}
          onSubmit={async (input) => {
            const errors = validateAccount(input);
            if (hasErrors(errors)) throw new ValidationError(errors);
            setAccount(input);
            setStep(4);
          }}
          secondaryAction={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setAccount(null);
                  setStep(4);
                }}
              >
                {t('onboarding.skip')}
              </Button>
              <Button variant="ghost" onClick={() => setStep(2)}>
                {t('common.back')}
              </Button>
            </>
          }
        />
      </Page>
    );
  }

  return (
    <Page title={t('onboarding.budgetTitle')}>
      {stepLabel}
      {error && <Notice tone="error">{error}</Notice>}
      <form className={cardClassName} onSubmit={submitBudget} noValidate>
        <p>{t('onboarding.budgetIntro')}</p>
        <AmountField
          label={t('budget.limitLabel')}
          value={limit}
          onChange={setLimit}
          error={limitError}
          hint={t('transaction.amountHint', { currency })}
        />
        <div className={styles.actions}>
          <Button type="submit">{t('onboarding.finish')}</Button>
          <Button variant="secondary" onClick={() => void finish(null)}>
            {t('onboarding.skipBudget')}
          </Button>
          <Button variant="ghost" onClick={() => setStep(3)}>
            {t('common.back')}
          </Button>
        </div>
      </form>
    </Page>
  );
}
