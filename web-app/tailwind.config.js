/** @type {import('tailwindcss').Config} */
export default {
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
        'sage-light': 'var(--color-sage-light)',
        'sage-text': 'var(--sage-text)',
        sand: 'var(--sand)',
        'sand-light': 'var(--color-paper)',
        'sep-line': 'var(--sep-line)',
        danger: 'var(--danger)',
        success: 'var(--success)',
        'on-accent': 'var(--on-accent)',
        'surface-raised': 'var(--surface-raised)',
        'surface-hover': 'var(--surface-hover)',
        'surface-hover-strong': 'var(--surface-hover-strong)',
        'danger-tint': 'var(--danger-tint)',
        knockout: 'var(--color-knockout)',
      },
      backgroundImage: {
        'gradient-rust': 'var(--gradient-rust)',
        'gradient-rust-hover': 'var(--gradient-rust-hover)',
        'gradient-sage': 'var(--gradient-sage)',
        'gradient-sage-hover': 'var(--gradient-sage-hover)',
        'gradient-fold': 'var(--gradient-fold)',
      },
      boxShadow: {
        theme: 'var(--shadow-ink)',
        ink: '0 16px 18px rgba(43, 38, 32, 0.17)',
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
