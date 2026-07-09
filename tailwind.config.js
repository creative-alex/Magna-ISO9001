/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#C8932F',
          hover:   '#b8832a',
          light:   '#FAF3E6',
          mid:     '#E8D0A0',
          active:  '#EDD9A3',
        },
        nav: {
          text:        '#5C3D0E',
          hover:       '#F0E2C4',
          'active-bg': '#EDD9A3',
          'active-text':'#7A5010',
        },
        logo: {
          text: '#4A2E08',
        },
        section: {
          label: '#B8892A',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      },
      width: {
        sidebar: '230px',
      },
      height: {
        topbar: '54px',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        dropdownSlideIn: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        loginSpin: {
          to: { transform: 'rotate(360deg)' },
        },
        npSpin: {
          to: { transform: 'rotate(360deg)' },
        },
        bubbleAppear: {
          '0%':   { opacity: '0', transform: 'translateY(10px) scale(0.9)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        tutorialPulse: {
          '0%, 100%': { opacity: '0.7', transform: 'scale(1)' },
          '50%':      { opacity: '0.9', transform: 'scale(1.02)' },
        },
        contextMenuFadeIn: {
          from: { opacity: '0', transform: 'translateY(-8px) scale(0.95)' },
          to:   { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        fadeInUp:         'fadeInUp 0.18s ease-out',
        dropdownSlideIn:  'dropdownSlideIn 0.18s ease-out',
        loginSpin:        'loginSpin 0.7s linear infinite',
        npSpin:           'npSpin 0.7s linear infinite',
        bubbleAppear:     'bubbleAppear 0.3s ease-out',
        tutorialPulse:    'tutorialPulse 2s infinite',
        contextMenuFadeIn:'contextMenuFadeIn 0.15s ease-out',
      },
    },
  },
  plugins: [],
};
