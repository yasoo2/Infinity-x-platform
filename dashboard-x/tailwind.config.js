  /** @type {import('tailwindcss').Config} */
  export default {
    darkMode: 'class', // تفعيل الوضع الداكن عبر class
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          // ألوان الخلفية
          bgLight: "#f8fafc",
          bgDark: "#0a0b10",
          
          // ألوان البطاقات
          cardLight: "#ffffff",
          cardDark: "#141622",
          
          // ألوان أساسية - الوضع الفاتح
          primary: {
            50: "#f0f9ff",
            100: "#e0f2fe",
            200: "#bae6fd",
            300: "#7dd3fc",
            400: "#38bdf8",
            500: "#0ea5e9",
            600: "#0284c7",
            700: "#0369a1",
            800: "#075985",
            900: "#0c4a6e",
            950: "#082f49",
          },
          
          // ألوان ثانوية
          secondary: {
            50: "#fdf4ff",
            100: "#fae8ff",
            200: "#f5d0fe",
            300: "#f0abfc",
            400: "#e879f9",
            500: "#d946ef",
            600: "#c026d3",
            700: "#a21caf",
            800: "#86198f",
            900: "#701a75",
            950: "#4a044e",
          },
          
          // ألوان التأكيد
          accent: {
            50: "#f0fdf4",
            100: "#dcfce7",
            200: "#bbf7d0",
            300: "#86efac",
            400: "#4ade80",
            500: "#22c55e",
            600: "#16a34a",
            700: "#15803d",
            800: "#166534",
            900: "#14532d",
            950: "#052e16",
          },
          
          // ألوان النيون (للوضع الداكن)
          neonGreen: "#4dff91",
          neonBlue: "#3d7eff",
          neonPink: "#ff38a4",
          neonPurple: "#b84dff",
          neonYellow: "#ffd93d",
          
          // ألوان النص
          textLight: "#1e293b",
          textDark: "#f1f5f9",
          textDim: "#64748b",
          textDimDark: "#8b8ea8",
          
          // ألوان الحدود
          borderLight: "#e2e8f0",
          borderDark: "#1e293b",
          
          // ألوان حالات
          success: {
            light: "#22c55e",
            dark: "#4dff91",
          },
          warning: {
            light: "#f59e0b",
            dark: "#ffd93d",
          },
          error: {
            light: "#ef4444",
            dark: "#ff38a4",
          },
          info: {
            light: "#3b82f6",
            dark: "#3d7eff",
          },
        },
        
        boxShadow: {
          // ظلال الوضع الفاتح
          soft: "0 2px 15px rgba(0,0,0,0.08)",
          medium: "0 4px 25px rgba(0,0,0,0.12)",
          large: "0 10px 40px rgba(0,0,0,0.15)",
          
          // ظلال النيون للوضع الداكن
          neon: "0 0 20px rgba(77,255,145,0.4)",
          neonBlue: "0 0 20px rgba(61,126,255,0.4)",
          neonPink: "0 0 20px rgba(255,56,164,0.4)",
          neonPurple: "0 0 20px rgba(184,77,255,0.4)",
          neonYellow: "0 0 20px rgba(255,217,61,0.4)",
          
          // ظلال ملونة للوضع الفاتح
          primary: "0 4px 20px rgba(14,165,233,0.25)",
          secondary: "0 4px 20px rgba(217,70,239,0.25)",
          accent: "0 4px 20px rgba(34,197,94,0.25)",
        },
        
        borderRadius: {
          xl2: "1.25rem",
          xl3: "1.5rem",
          xl4: "2rem",
        },
        
        spacing: {
          '18': '4.5rem',
          '88': '22rem',
          '128': '32rem',
        },
        
        fontSize: {
          'xs': ['0.75rem', { lineHeight: '1rem' }],
          'sm': ['0.875rem', { lineHeight: '1.25rem' }],
          'base': ['1rem', { lineHeight: '1.5rem' }],
          'lg': ['1.125rem', { lineHeight: '1.75rem' }],
          'xl': ['1.25rem', { lineHeight: '1.75rem' }],
          '2xl': ['1.5rem', { lineHeight: '2rem' }],
          '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
          '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
          '5xl': ['3rem', { lineHeight: '1' }],
          '6xl': ['3.75rem', { lineHeight: '1' }],
          '7xl': ['4.5rem', { lineHeight: '1' }],
          '8xl': ['6rem', { lineHeight: '1' }],
          '9xl': ['8rem', { lineHeight: '1' }],
        },
        
        animation: {
          'fade-in': 'fadeIn 0.5s ease-in-out',
          'fade-out': 'fadeOut 0.5s ease-in-out',
          'slide-up': 'slideUp 0.5s ease-out',
          'slide-down': 'slideDown 0.5s ease-out',
          'slide-left': 'slideLeft 0.5s ease-out',
          'slide-right': 'slideRight 0.5s ease-out',
          'bounce-slow': 'bounce 2s infinite',
          'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          'glow': 'glow 2s ease-in-out infinite',
        },
        
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          },
          fadeOut: {
            '0%': { opacity: '1' },
            '100%': { opacity: '0' },
          },
          slideUp: {
            '0%': { transform: 'translateY(20px)', opacity: '0' },
            '100%': { transform: 'translateY(0)', opacity: '1' },
          },
          slideDown: {
            '0%': { transform: 'translateY(-20px)', opacity: '0' },
            '100%': { transform: 'translateY(0)', opacity: '1' },
          },
          slideLeft: {
            '0%': { transform: 'translateX(20px)', opacity: '0' },
            '100%': { transform: 'translateX(0)', opacity: '1' },
          },
          slideRight: {
            '0%': { transform: 'translateX(-20px)', opacity: '0' },
            '100%': { transform: 'translateX(0)', opacity: '1' },
          },
          glow: {
            '0%, 100%': { boxShadow: '0 0 20px rgba(14,165,233,0.4)' },
            '50%': { boxShadow: '0 0 30px rgba(14,165,233,0.8)' },
          },
        },
        
        backdropBlur: {
          xs: '2px',
        },
        
        backgroundImage: {
          'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
          'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        },
      },
    },
    plugins: [
      require('@tailwindcss/forms'),
      require('@tailwindcss/typography'),
      require('@tailwindcss/aspect-ratio'),
    ],
  }