/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        text: 'var(--text)',
        border: 'var(--border)',
        accent: 'var(--accent)',
        sage: 'var(--sage)',
        'sage-text': 'var(--sage-text)',
        sand: 'var(--sand)',
        'sep-line': 'var(--sep-line)',
        danger: 'var(--danger)',
        success: 'var(--success)',
        'on-accent': 'var(--on-accent)',
        'surface-raised': 'var(--surface-raised)',
        'surface-hover': 'var(--surface-hover)',
        'surface-hover-strong': 'var(--surface-hover-strong)',
        'danger-tint': 'var(--danger-tint)',
      },
      boxShadow: {
        theme: '0 4px 12px var(--shadow-color)',
      },
      borderRadius: {
        ui: 'var(--radius-ui)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      width: {
        sidebar: '280px',
      },
    },
  },
  plugins: [],
};
