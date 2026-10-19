import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { I18nProvider } from './i18n/I18nProvider';
import { detectLanguage } from './i18n/languages';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Élément #root introuvable');

createRoot(root).render(
  <StrictMode>
    <I18nProvider initialLanguage={detectLanguage(navigator.languages)}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </I18nProvider>
  </StrictMode>,
);
