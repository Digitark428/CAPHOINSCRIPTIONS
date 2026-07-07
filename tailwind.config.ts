import type { Config } from "tailwindcss";

/**
 * Identité CAP HOMARD BEACH VOLLEY 974 — v2
 * Direction artistique : univers Apple / Notion / Linear.
 * Monochrome — noir profond, blanc, gris anthracite. Épuré, premium, sportif.
 * Les couleurs de statut (paiement) restent fonctionnelles, façon couleurs
 * système Apple, employées avec parcimonie (pastilles / badges uniquement).
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Neutres
        noir: "#000000", // noir profond — CTA, titres forts
        encre: "#1D1D1F", // texte principal (quasi-noir Apple)
        ardoise: "#6E6E73", // texte secondaire
        ligne: "#D2D2D7", // filets / bordures
        brume: "#E8E8ED", // bordures très claires / séparateurs
        nuage: "#F5F5F7", // fond de section clair
        blanc: "#FFFFFF", // surfaces
        // Anthracite (surfaces sombres de signature)
        anthracite: "#1C1C1E",
        anthracite2: "#2C2C2E",
        // Statuts (couleurs système Apple, usage minimal)
        paye: "#34C759",
        partiel: "#FF9F0A",
        nonpaye: "#FF3B30",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "var(--font-inter)",
          "system-ui",
          "Segoe UI",
          "sans-serif",
        ],
        display: [
          "-apple-system",
          "BlinkMacSystemFont",
          "var(--font-inter)",
          "system-ui",
          "sans-serif",
        ],
      },
      letterSpacing: {
        tightest: "-0.03em",
        tighter: "-0.022em",
      },
      boxShadow: {
        // Ombres douces, discrètes — jamais tape-à-l'œil
        carte: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -16px rgba(0,0,0,0.14)",
        flotte: "0 8px 40px -12px rgba(0,0,0,0.22)",
        focus: "0 0 0 4px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      maxWidth: {
        "7xl": "80rem",
      },
    },
  },
  plugins: [],
};
export default config;
