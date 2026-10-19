import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../app/App';
import { I18nProvider } from '../i18n/I18nProvider';
import type { Language } from '../i18n/languages';

/** Affiche l'application complète à une adresse donnée, dans une langue donnée. */
export function renderApp(path = '/', language: Language = 'fr') {
  return render(
    <I18nProvider initialLanguage={language}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </I18nProvider>,
  );
}
