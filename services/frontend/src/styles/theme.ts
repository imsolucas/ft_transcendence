// Design System - Colors, Typography, and Spacing

export const colors = {
  // Brand gradient colors
  brand: {
    purple: {
      dark: '#4B1B67',
      medium: '#872481',
      light: '#DC25A3',
    },
    pink: {
      medium: '#F34C94',
      light: '#F3796A',
    },
    accent: {
      orange: '#F49752',
      pink: '#F031A5',
    },
  },

  // UI colors
  ui: {
    white: '#FFFFFF',
    black: '#000000',
    gray: {
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
    },
  },

  // Semantic colors with opacity
  background: {
    blur: 'bg-black/50',
    overlay: 'bg-black/30',
    overlayHover: 'bg-black/20',
  },

  // Animated blobs
  blob: {
    blue: 'bg-blue-500/10',
    purple: 'bg-purple-500/10',
    pink: 'bg-pink-500/10',
  },
};

export const gradients = {
  // Main background gradient
  pageBackground: 'bg-gradient-to-b from-[#4B1B67] via-[#872481] via-[#DC25A3] via-[#F34C94] to-[#F3796A]',

  // Text gradients
  titleLeft: 'bg-gradient-to-r from-[#F49752] to-[#F031A5] bg-clip-text text-transparent',
  titleRight: 'bg-gradient-to-l from-[#F49752] to-[#F031A5] bg-clip-text text-transparent',

  // Button gradients
  buttonPrimary: 'bg-gradient-to-r from-blue-600 to-purple-600',
  buttonPrimaryHover: 'hover:from-blue-700 hover:to-purple-700',

  buttons: {
    // Game mode buttons - secondary palette (deep blue/indigo)
    localGame: 'bg-gradient-to-r from-indigo-700 to-blue-700',
    multiplayerGame: 'bg-gradient-to-r from-blue-700 to-indigo-700',
    oneVsOne: 'bg-gradient-to-r from-slate-700 to-indigo-700',
    tournament: 'bg-gradient-to-r from-indigo-700 to-violet-700',
    // Lobby options
    randomPlay: 'bg-gradient-to-r from-blue-800 to-indigo-800',
    createLobby: 'bg-gradient-to-r from-indigo-800 to-purple-800',
    joinLobby: 'bg-gradient-to-r from-slate-800 to-blue-800',
  },

  // Fallback gradients
  videoFallback: 'bg-gradient-to-br from-blue-900 to-purple-900',
};

export const typography = {
  fonts: {
    primary: 'font-poppins',
  },

  // Composite styles for specific elements
  title: "font-['Press_Start_2P'] text-4xl md:text-6xl",
  subtitle: "font-['Orbitron'] text-lg md:text-xl",
  button: "font-['Press_Start_2P'] text-lg md:text-xl",
  body: "font-['Orbitron']",

  sizes: {
    // Hero title
    heroTitle: 'text-6xl md:text-8xl',
    // Subtitle
    heroSubtitle: 'text-xl md:text-2xl',
    // Section title
    sectionTitle: 'text-2xl',
    // Button text
    buttonSize: 'text-lg',
    // Feature text
    featureTitle: 'text-xl',
  },

  weights: {
    normal: 'font-normal',
    semibold: 'font-semibold',
    bold: 'font-bold',
  },
};

export const spacing = {
  section: 'mb-16',
  container: 'max-w-6xl mx-auto px-4',
  containerNarrow: 'max-w-4xl mx-auto',
  containerExtraNarrow: 'max-w-3xl mx-auto',
};

export const effects = {
  blur: {
    sm: 'backdrop-blur-sm',
    xl: 'blur-3xl',
  },

  shadow: {
    xl: 'shadow-xl',
    '2xl': 'shadow-2xl',
    button: 'shadow-lg',
  },

  textShadow: {
    light: 'drop-shadow-sm',
    medium: 'drop-shadow-md',
    heavy: 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]',
  },

  rounded: {
    full: 'rounded-full',
    '2xl': 'rounded-2xl',
  },

  transition: {
    all: 'transition-all duration-300',
    colors: 'transition-colors',
  },

  transitions: {
    default: 'transition-colors',
    button: 'transition-all duration-300 transform hover:scale-105',
  },

  animations: {
    pulse: 'animate-pulse',
    pulseDelay500: 'animate-pulse delay-500',
    pulseDelay1000: 'animate-pulse delay-1000',
  },
};

// Helper to combine theme classes
export function cx(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
