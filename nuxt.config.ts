export default defineNuxtConfig({
  compatibilityDate: '2026-09-17',
  devtools: { enabled: true },

  modules: ['vuetify-nuxt-module', 'nuxt-auth-utils', '@nuxt/fonts'],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    databaseUrl: '',
  },

  fonts: {
    families: [
      { name: 'Barlow Condensed', provider: 'google', weights: [600, 700, 800] },
      { name: 'Barlow', provider: 'google', weights: [400, 500, 600, 700] },
    ],
  },

  app: {
    head: {
      htmlAttrs: { lang: 'es-CL' },
      titleTemplate: '%s · Pléyades',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#0A0B0A' },
      ],
    },
  },

  features: { inlineStyles: false },

  vuetify: {
    moduleOptions: {
      ssrClientHints: { prefersReducedMotion: true },
      // Vuetify ships its own useLayout, which shadows Nuxt's built-in one.
      prefixComposables: ['useLayout'],
    },
    vuetifyOptions: {
      // SVG paths from @mdi/js instead of the CDN icon font: nothing is fetched
      // at runtime, and only the icons actually rendered get bundled.
      icons: { defaultSet: 'mdi-svg' },
      theme: {
        defaultTheme: 'pleyades',
        themes: {
          pleyades: {
            dark: true,
            colors: {
              'background': '#0A0B0A',
              'surface': '#121412',
              'surface-bright': '#1A1D19',
              'surface-variant': '#232722',
              'on-surface-variant': '#E8EDE6',
              'primary': '#CCFF00',
              'on-primary': '#0A0B0A',
              'secondary': '#2FA84F',
              'on-secondary': '#061006',
              'error': '#FF453A',
              'warning': '#FFB020',
              'success': '#2FA84F',
              'info': '#4DA3FF',
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
