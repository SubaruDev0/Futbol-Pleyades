const NIGHT = '#0B0A12'

export default defineNuxtConfig({
  compatibilityDate: '2026-09-17',
  devtools: { enabled: true },

  modules: ['vuetify-nuxt-module', 'nuxt-auth-utils', '@nuxt/fonts'],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    databaseUrl: '',
    // Celular de la cuenta dueña: la única que ve /admin. Vacío = nadie.
    adminPhone: '',
  },

  fonts: {
    families: [
      { name: 'Barlow Condensed', provider: 'google', weights: [600, 700, 800] },
      { name: 'Barlow', provider: 'google', weights: [400, 500, 600, 700] },
    ],
  },

  app: {
    pageTransition: { name: 'pl-page', mode: 'out-in' },
    head: {
      htmlAttrs: { lang: 'es-CL' },
      titleTemplate: '%s · Pleyades',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: NIGHT },
      ],
      link: [
        // El mismo cúmulo del header/footer, para navegadores que soportan favicon SVG.
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        // Respaldo para navegadores sin soporte SVG.
        { rel: 'shortcut icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
      script: [
        // Verificación de sitio y Auto ads de AdSense (sin bloques manuales: Google elige dónde mostrarlos).
        {
          src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6889417433081561',
          async: true,
          crossorigin: 'anonymous',
        },
      ],
    },
  },

  features: { inlineStyles: false },

  nitro: {
    // Respaldo de image-store.ts cuando no hay CLOUDINARY_URL: los bytes van al disco.
    storage: {
      avatars: { driver: 'fs', base: './.data/avatars' },
      // Privado: solo se lee a través de /api/matches/:id/receipts/:receiptId/image.
      receipts: { driver: 'fs', base: './.data/receipts' },
    },
  },

  vuetify: {
    moduleOptions: {
      ssrClientHints: { prefersReducedMotion: true },
      // Vuetify trae su propio useLayout, que tapa al integrado de Nuxt.
      prefixComposables: ['useLayout'],
    },
    vuetifyOptions: {
      // Rutas SVG desde @mdi/js en vez de la fuente de íconos del CDN: no se
      // busca nada en runtime, y solo se empaquetan los íconos que realmente se renderizan.
      icons: { defaultSet: 'mdi-svg' },
      theme: {
        defaultTheme: 'pleyades',
        themes: {
          pleyades: {
            dark: true,
            // La única fuente de cada color de la app: main.css mapea sus
            // tokens --pl-* a las variables --v-theme-* que Vuetify emite desde aquí.
            colors: {
              'background': NIGHT,
              'on-background': '#ECE9F5',
              'surface': '#13121C',
              'on-surface': '#ECE9F5',
              'surface-bright': '#1B1927',
              'surface-variant': '#252233',
              'on-surface-variant': '#ECE9F5',
              // Amatista: las Pléyades de noche, y los ojos de Emilia.
              'primary': '#B394FF',
              'on-primary': NIGHT,
              'secondary': '#2FA84F',
              'on-secondary': '#061006',
              'error': '#FF453A',
              'warning': '#FFB020',
              // El verde se mantiene: significa "voy", no es decoración.
              'success': '#2FA84F',
              'info': '#6FA8FF',
              'ink-dim': '#928DA6',
              'ink-faint': '#5E5A70',
            },
          },
        },
      },
      defaults: {
        global: { rounded: 0 },
        VBtn: {
          rounded: 0,
          flat: true,
          height: 46,
          class: 'pl-btn',
        },
        VCard: { rounded: 0, flat: true, color: 'surface' },
        VSheet: { rounded: 0 },
        VChip: { rounded: 0, size: 'small', label: true },
        VTextField: {
          variant: 'outlined',
          rounded: 0,
          density: 'comfortable',
          hideDetails: 'auto',
        },
        VSelect: {
          variant: 'outlined',
          rounded: 0,
          density: 'comfortable',
          hideDetails: 'auto',
        },
        VTextarea: {
          variant: 'outlined',
          rounded: 0,
          density: 'comfortable',
          hideDetails: 'auto',
        },
        VList: { bgColor: 'transparent' },
        VDivider: { color: 'rgba(255,255,255,0.10)' },
      },
    },
  },
})
