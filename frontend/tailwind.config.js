/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        dark: {
          100: '#1E293B',
          200: '#0F172A',
          300: '#020617',
        },
        // Enhanced light mode colors with better contrast
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // Custom color palette for light mode with better visibility
        light: {
          bg: '#ffffff',
          bgSecondary: '#f8fafc',
          bgTertiary: '#f1f5f9',
          text: '#0f172a',
          textSecondary: '#334155',
          textMuted: '#475569',
          border: '#cbd5e1',
          borderHover: '#94a3b8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // Enhanced shadows for light mode with better visibility
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.12)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.15)',
        'strong': '0 8px 32px rgba(0, 0, 0, 0.18)',
        'glow': '0 0 20px rgba(37, 99, 235, 0.15)',
      },
      // Enhanced gradients with better contrast
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)',
        'gradient-success': 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
        'gradient-warning': 'linear-gradient(135deg, #d97706 0%, #dc2626 100%)',
        'gradient-error': 'linear-gradient(135deg, #dc2626 0%, #7c2d12 100%)',
      },
      // Enhanced animations
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'slide-in-right': 'slideInRight 0.6s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
      // Enhanced spacing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      // Enhanced border radius
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
} 