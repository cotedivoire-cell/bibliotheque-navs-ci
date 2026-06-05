import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],

      // ── Manifest de l'application ──────────────────────────
      manifest: {
        name:             'Bibliothèque-navs CI',
        short_name:       'Navs Biblio',
        description:      'La bibliothèque des Navigateurs en Côte d\'Ivoire',
        theme_color:      '#15803d',
        background_color: '#f9fafb',
        display:          'standalone',
        orientation:      'portrait',
        start_url:        '/',
        scope:            '/',
        lang:             'fr',
        icons: [
          {
            src:   '/icons/icon-192.png',
            sizes: '192x192',
            type:  'image/png',
          },
          {
            src:   '/icons/icon-512.png',
            sizes: '512x512',
            type:  'image/png',
          },
          {
            src:     '/icons/icon-512-maskable.png',
            sizes:   '512x512',
            type:    'image/png',
            purpose: 'maskable',
          },
        ],
      },

      // ── Stratégie de mise en cache (Workbox) ───────────────
      workbox: {
        // Mise en cache des fichiers statiques de l'app
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

        runtimeCaching: [
          {
            // Cache des données Supabase (NetworkFirst)
            // → Toujours essayer le réseau, utiliser le cache si hors ligne
            urlPattern: /^https:\/\/ynqnwdinmhluiazqmeqh\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries:    50,
                maxAgeSeconds: 60 * 60 * 24, // 24 heures
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            // Cache des images de couverture (CacheFirst)
            // → Charger depuis le cache si disponible (plus rapide)
            urlPattern: /^https:\/\/ynqnwdinmhluiazqmeqh\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'covers-cache',
              expiration: {
                maxEntries:    100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 jours
              },
            },
          },
        ],
      },
    }),
  ],
})
