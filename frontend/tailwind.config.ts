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
        // New minimal color palette (Claude-inspired)
        'primary': '#DE7356',        // Coral/terracotta - main accent
        'primary-hover': '#c85f45',  // Darker coral for hover states
        'dark': 'hsl(60, 2.7%, 14.5%)',  // Charcoal - main background
        'dark-lighter': 'hsl(60, 2.7%, 18%)',   // Lighter charcoal - cards
        'dark-hover': 'hsl(60, 2.7%, 22%)',     // Hover state
        'accent': '#FBBC05',         // Golden yellow - highlights
        'accent-hover': '#e5ab04',   // Darker yellow for hover
        'text-primary': '#faf9f5',   // Warm white - primary text

        // Keep some legacy colors for backward compatibility (will remove gradually)
        'dark-bg': 'hsl(60, 2.7%, 14.5%)',
        'dark-card': 'hsl(60, 2.7%, 18%)',
        'dark-text': '#faf9f5',
        'dark-text-secondary': '#D1D5DB',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      textColor: {
        'text-primary': '#faf9f5',
      },
    },
  },
  plugins: [],
}
export default config
