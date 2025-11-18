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
          // ألوان الوضع الداكن
          dark: {
            bg: "#0a0b10",
            card: "#141622",
            hover: "#1a1d2e",
            border: "#2a2d3e",
          },
          // ألوان الوضع الفاتح
          light: {
            bg: "#f8f9fc",
            card: "#ffffff",
            hover: "#f0f2f7",
            border: "#e4e7ef",
          },
          // ألوان النيون للوضع الداكن
          neon: {
            green: "#4dff91",
            blue: "#3d7eff",
            pink: "#ff38a4",
            purple: "#b84dff",
            orange: "#ff8c4d",
            cyan: "#4dffff",
          },
          // ألوان حيوية للوضع الفاتح
          vibrant: {
            green: "#10b981",
            blue: "#3b82f6",
            pink: "#ec4899",
            purple: "#8b5cf6",
            orange: "#f97316",
            cyan: "#06b6d4",
          },
          // ألوان النصوص
          text: {
            dark: {
              primary: "#ffffff",
              secondary: "#b4b7c9",
              dim: "#8b8ea8",
              muted: "#5a5d70",
            },
            light: {
              primary: "#1a1d2e",
              secondary: "#4a5568",
              dim: "#6b7280",
              muted: "#9ca3af",
            },
          },
          // ألوان الحالات
          status: {
            success: {
              light: "#d1fae5",
              DEFAULT: "#10b981",
              dark: "#065f46",
            },
            warning: {
              light: "#fef3c7",
              DEFAULT: "#f59e0b",
              dark: "#92400e",
            },
            error: {
              light: "#fee2e2",
              DEFAULT: "#ef4444",
              dark: "#991b1b",
            },
            info: {
              light: "#dbeafe",
              DEFAULT: "#3b82f6",
              dark: "#1e3a8a",
            },
          },
          // تدرجات لونية
          gradient: {
            start: "#667eea",
            middle: "#764ba2",
            end: "#f093fb",
          },
        },
        boxShadow: {
          // ظلال النيون للوضع الداكن
          neon: "0 0 20px rgba(77,255,145,0.4)",
          neonBlue: "0 0 20px rgba(61,126,255,0.4)",
          neonPink: "0 0 20px rgba(255,56,164,0.4)",
          neonPurple: "0 0 20px rgba(184,77,255,0.4)",
          neonOrange: "0 0 20px rgba(255,140,77,0.4)",
          neonCyan: "0 0 20px rgba(77,255,255,0.4)",
          // ظلال ناعمة للوضع الفاتح
          soft: "0 2px 8px rgba(0,0,0,0.04)",
          medium: "0 4px 16px rgba(0,0,0,0.08)",
          large: "0 8px 32px rgba(0,0,0,0.12)",
          xl: "0 12px 48px rgba(0,0,0,0.16)",
          // ظلال ملونة
          coloredGreen: "0 4px 16px rgba(16,185,129,0.2)",
          coloredBlue: "0 4px 16px rgba(59,130,246,0.2)",
          coloredPink: "0 4px 16px rgba(236,72,153,0.2)",
          coloredPurple: "0 4px 16px rgba(139,92,246,0.2)",
          // ظلال داخلية
          inner: "inset 0 2px 4px rgba(0,0,0,0.06)",
          innerLarge: "inset 0 4px 8px rgba(0,0,0,0.1)",
        },
        borderRadius: {
          xl2: "1.25rem",
          xl3: "1.5rem",
          xl4: "2rem",
        },
        spacing: {
          18: "4.5rem",
          22: "5.5rem",
          26: "6.5rem",
          30: "7.5rem",
        },
        fontSize: {
          "2xs": ["0.625rem", { lineHeight: "0.75rem" }],
          "3xl": ["2rem", { lineHeight: "2.5rem" }],
          "4xl": ["2.5rem", { lineHeight: "3rem" }],
          "5xl": ["3rem", { lineHeight: "3.5rem" }],
        },
        animation: {
          "fade-in": "fadeIn 0.5s ease-in-out",
          "fade-out": "fadeOut 0.5s ease-in-out",
          "slide-up": "slideUp 0.5s ease-out",
          "slide-down": "slideDown 0.5s ease-out",
          "slide-left": "slideLeft 0.5s ease-out",
          "slide-right": "slideRight 0.5s ease-out",
          "bounce-slow": "bounce 2s infinite",
          "pulse-slow": "pulse 3s infinite",
          "spin-slow": "spin 3s linear infinite",
          "glow": "glow 2s ease-in-out infinite",
          "shimmer": "shimmer 2s linear infinite",
        },
        keyframes: {
          fadeIn: {
            "0%": { opacity: "0" },
            "100%": { opacity: "1" },
          },
          fadeOut: {
            "0%": { opacity: "1" },
            "100%": { opacity: "0" },
          },
          slideUp: {
            "0%": { transform: "translateY(20px)", opacity: "0" },
            "100%": { transform: "translateY(0)", opacity: "1" },
          },
          slideDown: {
            "0%": { transform: "translateY(-20px)", opacity: "0" },
            "100%": { transform: "translateY(0)", opacity: "1" },
          },
          slideLeft: {
            "0%": { transform: "translateX(20px)", opacity: "0" },
            "100%": { transform: "translateX(0)", opacity: "1" },
          },
          slideRight: {
            "0%": { transform: "translateX(-20px)", opacity: "0" },
            "100%": { transform: "translateX(0)", opacity: "1" },
          },
          glow: {
            "0%, 100%": { boxShadow: "0 0 20px rgba(77,255,145,0.4)" },
            "50%": { boxShadow: "0 0 40px rgba(77,255,145,0.8)" },
          },
          shimmer: {
            "0%": { backgroundPosition: "-200% 0" },
            "100%": { backgroundPosition: "200% 0" },
          },
        },
        backgroundImage: {
          "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
          "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
          "gradient-shine": "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
        },
        backdropBlur: {
          xs: "2px",
        },
        transitionDuration: {
          400: "400ms",
          600: "600ms",
          800: "800ms",
          900: "900ms",
        },
        scale: {
          102: "1.02",
          103: "1.03",
        },
      },
    },
    plugins: [
      require('@tailwindcss/forms'),
      require('@tailwindcss/typography'),
      require('@tailwindcss/aspect-ratio'),
      require('@tailwindcss/container-queries'),
    ],
  }