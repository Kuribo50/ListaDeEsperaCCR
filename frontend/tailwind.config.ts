import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        verde: {
          ccr: '#1B5E3B',
          hover: '#256B47',
          active: '#2E7D52',
          light: '#EEF2EE',
          dark: '#14462B',
          pale: '#EEF2EE',
          border: '#D4E4D4',
        },
      },
    },
  },
  plugins: [],
}

export default config
