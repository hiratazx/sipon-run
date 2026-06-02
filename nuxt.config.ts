// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-06-02',
  devtools: { enabled: true },

  // Enable Tailwind CSS module
  modules: [
    '@nuxtjs/tailwindcss'
  ],

  // Enable Nuxt 4 layout structure compatibility
  future: {
    compatibilityVersion: 4
  },

  app: {
    head: {
      title: 'SYPON RUN: System Points and Onward Navigation',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
        { name: 'description', content: 'Survive the semester! A high-performance 2D Phaser retro platformer game where you collect grades, stomp bug assignments, dodge exam bosses, and run towards graduation.' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Press+Start+2P&display=swap' }
      ]
    }
  }
})
