/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string };

/**
 * Politique de sécurité du contenu (CSP), ajoutée seulement à la version publiée (le serveur de
 * développement injecte des styles en ligne). Kolo ne charge rien d'extérieur : tout vient du
 * même site, et aucun script en ligne n'est autorisé (défense contre l'injection de code).
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'kolo-content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
        injectTo: 'head-prepend',
      },
    ],
  };
}

// Chemin de publication : « / » en local, « /nom-du-depot/ » sur GitHub Pages (voir README).
const base = process.env.KOLO_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    contentSecurityPolicy(),
    // Service worker (Workbox) : met en cache les fichiers de l'application, jamais les données
    // (elles restent dans IndexedDB). « prompt » : une nouvelle version attend que
    // l'utilisateur recharge, pour ne pas interrompre une saisie (§8.4).
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: base,
        name: 'Kolo',
        short_name: 'Kolo',
        description: 'Suivez votre argent, simplement, sur votre appareil.',
        lang: 'fr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#06120e',
        theme_color: '#06120e',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        // Bibliothèques à part : elles changent rarement et restent en cache entre deux versions.
        codeSplitting: {
          groups: [{ name: 'vendor', test: /node_modules/ }],
        },
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
