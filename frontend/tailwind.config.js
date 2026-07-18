/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Augmented Reality Hologram Palette */
        holo: {
          bg: 'rgba(11, 13, 18, 0.65)',
          glass: 'rgba(19, 22, 30, 0.45)',
          'glass-highlight': 'rgba(255, 255, 255, 0.06)',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-glow': 'rgba(197, 241, 53, 0.35)',
          text: '#ffffff',
          'text-sub': '#b0b7c9',
          'text-muted': '#626a7e',
          
          /* Accent Colors */
          green: '#c5f135', // Glowing lime green (CryptoNest style)
          orange: '#f5a623', // Glowing orange (BTC/Gold style)
          pink: '#e8547a', // Active pink for critical warnings
          blue: '#38b6f5', // Active blue
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'holo-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
        'active-green-grad': 'linear-gradient(135deg, rgba(197, 241, 53, 0.2) 0%, rgba(197, 241, 53, 0.02) 100%)',
      },
      boxShadow: {
        'glass-bevel': 'inset 0 1px 1px rgba(255,255,255,0.15), 0 8px 32px rgba(0,0,0,0.5)',
        'glow-green': '0 0 20px rgba(197, 241, 53, 0.25)',
        'glow-orange': '0 0 20px rgba(245, 166, 35, 0.25)',
        'glow-pink': '0 0 20px rgba(232, 84, 122, 0.25)',
      }
    },
  },
  plugins: [],
}
