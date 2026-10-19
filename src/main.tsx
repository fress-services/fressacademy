import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { AppProviders } from './app/AppProviders';
import { createLocalRepositories, openLocalDatabase } from './data/local/repositories';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Élément #root introuvable');

const openRepositories = async () => createLocalRepositories(await openLocalDatabase());

createRoot(root).render(
  <StrictMode>
    <AppProviders openRepositories={openRepositories}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppProviders>
  </StrictMode>,
);
