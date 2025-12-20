/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Primary colors (coral/terracotta)
        primary: {
          DEFAULT: '#DE7356',
          50: '#FDF4F2',
          100: '#FCE9E4',
          200: '#F8D3CA',
          300: '#F4BDAF',
          400: '#E99580',
          500: '#DE7356',
          600: '#C85C3F',
          700: '#A64832',
          800: '#843926',
          900: '#6C2F20',
        },
        // Accent color (golden yellow)
        accent: {
          DEFAULT: '#FBBC05',
          500: '#FBBC05',
        },
        // Dark theme colors
        dark: {
          bg: 'hsl(60, 2.7%, 14.5%)',
          card: 'hsl(60, 2.7%, 18%)',
          lighter: 'hsl(60, 2.7%, 22%)',
          hover: 'hsl(60, 2.7%, 26%)',
          border: 'hsl(60, 2.7%, 30%)',
          text: {
            primary: '#faf9f5',
            secondary: '#a3a3a3',
            muted: '#737373',
          },
        },
      },
      fontFamily: {
        sans: ['System', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
