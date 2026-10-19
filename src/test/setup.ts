import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom n'implémente pas le défilement ; l'application l'appelle à chaque changement de page.
window.scrollTo = () => {};

afterEach(() => {
  cleanup();
});
