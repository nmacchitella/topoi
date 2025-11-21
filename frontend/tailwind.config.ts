import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark mode color palette
        'dark-bg': '#111827',
        'dark-card': '#1F2937',
        'dark-hover': '#374151',
        'dark-text': '#F9FAFB',
        'dark-text-secondary': '#D1D5DB',
        // Category colors
        'category-restaurant': '#EF4444',
        'category-cafe': '#F59E0B',
        'category-bar': '#8B5CF6',
        'category-park': '#10B981',
        'category-shop': '#3B82F6',
        'category-culture': '#EC4899',
        'category-other': '#6B7280',
      },
    },
  },
  plugins: [],
}
export default config
