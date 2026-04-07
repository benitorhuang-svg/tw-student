import purgecss from '@fullhuman/postcss-purgecss'

export default {
  plugins: [
    purgecss({
      content: [
        './index.html',
        './src/**/*.{tsx,ts,jsx,js}',
      ],
      defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
      safelist: [
        /^leaflet-/,
        /^atlas-/, // Keep our prefix just in case dynamic classes are used
        'stagger-item',
        'premium-glass',
        'is-active',
        'active',
        'dark',
      ],
    }),
  ],
}
