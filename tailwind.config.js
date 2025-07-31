import { defineConfig } from "@tailwindcss/vite";

export default defineConfig({
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontSize: {
        'xs': ['0.84rem', { lineHeight: '1.2rem' }],    // 0.75rem * 1.12
        'sm': ['0.98rem', { lineHeight: '1.4rem' }],    // 0.875rem * 1.12
        'base': ['1.12rem', { lineHeight: '1.68rem' }], // 1rem * 1.12
        'lg': ['1.26rem', { lineHeight: '1.96rem' }],   // 1.125rem * 1.12
        'xl': ['1.4rem', { lineHeight: '1.96rem' }],    // 1.25rem * 1.12
        '2xl': ['1.68rem', { lineHeight: '2.24rem' }],  // 1.5rem * 1.12
        '3xl': ['2.1rem', { lineHeight: '2.52rem' }],   // 1.875rem * 1.12
        '4xl': ['2.52rem', { lineHeight: '2.8rem' }],   // 2.25rem * 1.12
        '5xl': ['3.36rem', { lineHeight: '1' }],        // 3rem * 1.12
        '6xl': ['4.2rem', { lineHeight: '1' }],         // 3.75rem * 1.12
        '7xl': ['5.32rem', { lineHeight: '1' }],        // 4.75rem * 1.12
        '8xl': ['6.72rem', { lineHeight: '1' }],        // 6rem * 1.12
        '9xl': ['8.96rem', { lineHeight: '1' }],        // 8rem * 1.12
      }
    },
  },
});
