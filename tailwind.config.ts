import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#8B3A9E",
        "primary-dark": "#5A1F68",
        "primary-light": "#9B4DB0",
        accent: "#8B3A9E",
        secondary: "#A855F7",
        "bg-light": "#F8F7FC",
        "bg-white": "#FFFFFF",
        "bg-dark": "#0D0D0D",
        "bg-footer": "#1A1A1A",
        "text-primary": "#2D1F3D",
        "text-secondary": "#9CA3AF",
        "text-main": "#2D1F3D",
        "text-light": "#9CA3AF",
        "text-muted": "#9CA3AF",
        "text-white": "#FFFFFF",
        cta: "#00C853",
        "cta-dark": "#00A843",
        danger: "#EF4444",
        warning: "#F59E0B",
        success: "#10B981",
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      height: {
        screen: "100dvh",
      },
      minHeight: {
        screen: "100dvh",
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #8B3A9E, #5A1F68)",
        "gradient-hero": "linear-gradient(135deg, #8B3A9E, #5A1F68, #9B4DB0)",
      },
    },
  },
  plugins: [],
};

export default config;
