/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class", // <- important, we’ll toggle class on <html> or <body>
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'poppins': ['Poppins', 'sans-serif'],
		'sans': ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Brand gradient colors
        'brand-purple-dark': '#4B1B67',
        'brand-purple-mid': '#872481',
        'brand-pink-dark': '#DC25A3',
        'brand-pink-mid': '#F34C94',
        'brand-orange': '#F3796A',
        // Accent colors
        'accent-cyan': '#00FFFF',
        'accent-pink': '#FF1493',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(to bottom, #4B1B67, #872481, #DC25A3, #F34C94, #F3796A)',
        'gradient-cyan-pink': 'linear-gradient(to right, #22D3EE, #F472B6)',
        'gradient-text': 'linear-gradient(to right, #22D3EE, #FFFFFF, #F472B6)',
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 255, 255, 0.5)',
        'glow-pink': '0 0 20px rgba(255, 20, 147, 0.5)',
        'glow-cyan-lg': '0 0 30px rgba(0, 255, 255, 0.8)',
        'glow-pink-lg': '0 0 30px rgba(255, 20, 147, 0.8)',
      },
    },
  },
  plugins: [],
}

