import { useState, type FormEvent } from 'react';
import { useData } from '../../app/data';
import { describeError } from '../../app/describeError';
import { Button } from '../../components/Button';
import { cardClassName } from '../../components/Card';
import { Segmented, SelectField } from '../../components/fields';
import { Notice } from '../../components/Notice';
import { Page } from '../../components/Page';
import { isCurrencyCode, type CurrencyCode } from '../../domain/currencies';
import { suggestCurrency } from '../../domain/regions';
import { useI18n } from '../../i18n/context';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, type Language } from '../../i18n/languages';
import type { AccountInput } from '../../services/accounts';
import { completeOnboarding } from '../../services/onboarding';
import { AccountForm } from '../accounts/AccountForm';
import { useCurrencyOptions } from '../shared/useCurrencyOptions';
import styles from './OnboardingPage.module.css';

const TOTAL_STEPS = 3;

function browserSuggestion(): CurrencyCode | null {
  return suggestCurrency(typeof navigator === 'undefined' ? [] : navigator.languages);
}

/**
 * Premier lancement (§4.1) : langue, devise principale, puis premier compte facultatif.
 * Rien n'est considéré comme terminé avant la dernière étape.
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
  const [suggested] = useState(browserSuggestion);
  const [currency, setCurrency] = useState<string>(preferences.defaultCurrency ?? suggested ?? '');
  const [currencyError, setCurrencyError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  async function finish(account: AccountInput | null) {
    if (!isCurrencyCode(currency)) return;
    await completeOnboarding(repositories, { defaultCurrency: currency, account });
  }

  function skip() {
    setError(null);
    finish(null).catch((failure: unknown) =>
      setError(t('errors.saveFailed', { reason: describeError(failure, t) })),
    );
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

  return (
    <Page title={t('onboarding.accountTitle')}>
      {stepLabel}
      <p>{t('onboarding.accountIntro')}</p>
      {error && <Notice tone="error">{error}</Notice>}
      <AccountForm
        defaultCurrency={isCurrencyCode(currency) ? currency : null}
        submitLabel={t('onboarding.finish')}
        onSubmit={finish}
        secondaryAction={
          <>
            <Button variant="secondary" onClick={skip}>
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
