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
        danger: {
          DEFAULT: '#E86F51',
          light:   '#fce5df',
        },
        success: {
          DEFAULT: '#A3D977',
          light:   '#ecfbe4',
        },
        warning: {
          DEFAULT: '#F1B74E',
          light:   '#fff4e0',
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
        // Cena de praia animada do loading do Mapa de Férias (ver VacationTimeline).
        vacationSunPulse: {
          '0%, 100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
          '50%':      { transform: 'scale(1.1) rotate(20deg)', opacity: '0.85' },
        },
        vacationPalmSway: {
          '0%, 100%': { transform: 'rotate(-6deg)' },
          '50%':      { transform: 'rotate(6deg)' },
        },
        vacationUmbrellaBob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-7px)' },
        },
        // Bola a saltar (não a deslizar): três saltos IGUAIS em duração (cada fase
        // ocupa a mesma fatia de tempo), com energia decrescente, para nenhum deles
        // parecer ficar "pendurado" no ar mais do que os outros.
        vacationBallRoll: {
          '0%':     { transform: 'translate(-16px, 0) rotate(0deg)', opacity: '0' },
          '8%':     { opacity: '1' },
          '16.5%':  { transform: 'translate(16px, -22px) rotate(90deg)' },
          '33%':    { transform: 'translate(47px, 0) rotate(180deg) scale(1.15, 0.85)' },
          '49.5%':  { transform: 'translate(79px, -16px) rotate(270deg)' },
          '66%':    { transform: 'translate(111px, 0) rotate(360deg) scale(1.12, 0.88)' },
          '82.5%':  { transform: 'translate(142px, -10px) rotate(450deg)' },
          '92%':    { opacity: '1' },
          '100%':   { transform: 'translate(176px, 0) rotate(540deg)', opacity: '0' },
        },
        vacationWaveSlide: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        // Barra fina indeterminada para recargas (dados já visíveis, só um sinal
        // discreto de que estão a ser atualizados  -  ver VacationTimeline).
        vacationReloadBar: {
          '0%':   { left: '-40%' },
          '100%': { left: '100%' },
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
        vacationSunPulse:    'vacationSunPulse 3s ease-in-out infinite',
        vacationPalmSway:    'vacationPalmSway 3.5s ease-in-out infinite',
        vacationUmbrellaBob: 'vacationUmbrellaBob 2.2s ease-in-out infinite',
        vacationBallRoll:    'vacationBallRoll 1.8s ease-in-out infinite',
        vacationWaveSlide:   'vacationWaveSlide 3s linear infinite',
        vacationReloadBar:   'vacationReloadBar 1.1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
