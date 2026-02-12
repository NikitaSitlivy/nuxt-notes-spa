export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  css: ['~/assets/scss/main.scss'],
  modules: ['@pinia/nuxt'],
  devtools: { enabled: false },
  components: [{ path: '~/components', pathPrefix: false }]
})
