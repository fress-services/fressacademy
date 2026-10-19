import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n/I18nProvider';
import { UpdateBanner, type PwaStatus } from './UpdateBanner';

function renderBanner(status: PwaStatus) {
  const onReload = vi.fn();
  const onDismiss = vi.fn();
  render(
    <I18nProvider language="fr" onLanguageChange={async () => {}}>
      <UpdateBanner status={status} onReload={onReload} onDismiss={onDismiss} />
    </I18nProvider>,
  );
  return { onReload, onDismiss };
}

describe('bandeau de mise à jour (§8.4)', () => {
  it('ne recharge qu’à la demande quand une nouvelle version est prête', async () => {
    const user = userEvent.setup();
    const { onReload, onDismiss } = renderBanner('needRefresh');
    expect(screen.getByRole('status')).toHaveTextContent('Une nouvelle version de Kolo est prête');
    expect(onReload).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Recharger' }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('signale un échec d’activation comme une alerte', () => {
    renderBanner('registerError');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Le mode hors ligne n’a pas pu être activé',
    );
  });

  it('ne montre rien sans événement', () => {
    const { container } = render(
      <I18nProvider language="fr" onLanguageChange={async () => {}}>
        <UpdateBanner status={null} onReload={() => {}} onDismiss={() => {}} />
      </I18nProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
