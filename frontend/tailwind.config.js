/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // Keep using class-based dark mode
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      // Updated colors to use CSS variables
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Add chart and priority colors
        'chart-accent': 'hsl(var(--chart-accent))',
        'priority-high': 'hsl(var(--priority-high))',
        'priority-medium': 'hsl(var(--priority-medium))',
        'priority-low': 'hsl(var(--priority-low))',
      },
      // --- REMOVED: Gradient Definitions ---
      borderRadius: {
        lg: "0.5rem", // Slightly larger default rounding
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
      boxShadow: { // Add a subtle shadow for cards if needed
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        /* The new "glow" effect */
        'primary-glow': '0 0 15px 0 hsl(var(--primary) / 0.5)',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
      },
      opacity: { // Add specific opacity for the "invisible" card background effect
        '90': '0.9',
        '95': '0.95',
      }
    },
  },
  plugins: [
    require("@tailwindcss/forms")({
      // Strategy 'class' needed for dark mode compatibility with form elements
      strategy: 'class',
    }),
    require("tailwindcss-animate"),
  ],
};