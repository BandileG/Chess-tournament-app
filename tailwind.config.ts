import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: '#080c10',
        surface: '#0d1117',
        elevated: '#161b22',
        card: '#1a2030',
        hover: '#1f2937',
        border: { DEFAULT: '#1e2d3d', bright: '#2d4060' },
        accent: { DEFAULT: '#00d4ff', dim: 'rgba(0,212,255,0.12)', glow: 'rgba(0,212,255,0.25)' },
        gold: { DEFAULT: '#f5a623', dim: 'rgba(245,166,35,0.15)' },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '8px', md: '12px', lg: '16px', xl: '20px', '2xl': '24px',
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
        fadeIn: 'fadeIn 0.3s ease forwards',
        slideIn: 'slideIn 0.3s ease forwards',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { from: { opacity: '0', transform: 'translateX(20px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}

export default config

