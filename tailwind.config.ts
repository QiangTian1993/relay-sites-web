import type { Config } from "tailwindcss";

// Swiss International Typographic Style 设计 token
// 严格色板：白/黑/灰/Swiss Red；圆角=0；强对比；几何网格

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        swiss: {
          bg: "#FFFFFF",
          fg: "#000000",
          muted: "#F2F2F2",
          accent: "#FF3000",
          border: "#000000",
          // 语义别名仍限制在 Swiss 黑/灰/红三色中。
          success: "#000000",
          successBg: "#F2F2F2",
          warning: "#FF3000",
          warningBg: "#F2F2F2",
          info: "#000000",
          infoBg: "#F2F2F2",
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: "0.375rem",
        sm: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        full: "9999px",
      },
      borderWidth: {
        DEFAULT: "1px",
        "0": "0",
        "1": "1px",
        "2": "2px",
        "3": "3px",
        "4": "4px",
        "6": "6px",
        "8": "8px",
      },
      letterSpacing: {
        "tightest": "-0.05em",
        "wider": "0.05em",
        "widest": "0.15em",
        "ultra": "0.3em",
      },
    },
  },
  plugins: [],
};
export default config;
