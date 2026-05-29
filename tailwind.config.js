/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // All values resolve to OKLCH CSS variables defined in index.css.
        // This keeps dark mode a single-file flip later.
        navy: {
          DEFAULT: 'var(--c-navy)',
          fg: 'var(--c-navy-fg)',
          'fg-mute': 'var(--c-navy-fg-mute)',
          700: 'var(--c-navy-700)',
          600: 'var(--c-navy-600)',
        },
        accent: {
          DEFAULT: 'var(--c-accent)',
          strong: 'var(--c-accent-strong)',
          hover: 'var(--c-accent-hover)',
          ink: 'var(--c-accent-ink)',
          soft: 'var(--c-accent-soft)',
          line: 'var(--c-accent-line)',
        },
        success: {
          DEFAULT: 'var(--c-success)',
          soft: 'var(--c-success-soft)',
          ink: 'var(--c-success-ink)',
          strong: 'var(--c-success-strong)',
        },
        warning: {
          DEFAULT: 'var(--c-warning)',
          soft: 'var(--c-warning-soft)',
          ink: 'var(--c-warning-ink)',
          strong: 'var(--c-warning-strong)',
        },
        danger: {
          DEFAULT: 'var(--c-danger)',
          soft: 'var(--c-danger-soft)',
          ink: 'var(--c-danger-ink)',
          strong: 'var(--c-danger-strong)',
        },
        surface: 'var(--c-surface)',
        card: 'var(--c-card)',
        panel: 'var(--c-panel)',
        ink: {
          DEFAULT: 'var(--c-ink)',
          soft: 'var(--c-ink-soft)',
          mute: 'var(--c-ink-mute)',
        },
        line: {
          DEFAULT: 'var(--c-line)',
          soft: 'var(--c-line-soft)',
        },
      },
      fontFamily: {
        // One excellent sans for everything. "mono" points at Inter too so any
        // numeric/font-mono usage stays in-family; tabular figures come from .tabular.
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        chip: '7px',
        btn: '9px',
        card: '13px',
        modal: '18px',
      },
      boxShadow: {
        // Hairline borders carry structure; shadow signals a real z-axis. Tinted with the navy
        // hue so elevation reads warm-cool, not gray. Rest -> raised (signature) -> hover -> overlay.
        card: '0 1px 2px -1px rgb(10 37 64 / 0.06), 0 2px 6px -1px rgb(10 37 64 / 0.07)',
        // Solid buttons: a soft drop + a hairline top gloss so they read as a physical surface.
        btn: '0 1px 2px rgb(10 37 64 / 0.16), inset 0 1px 0 rgb(255 255 255 / 0.13)',
        raised:
          '0 1px 3px -1px rgb(10 37 64 / 0.07), 0 8px 20px -6px rgb(10 37 64 / 0.13)',
        lift: '0 5px 16px -3px rgb(10 37 64 / 0.15), 0 2px 6px -3px rgb(10 37 64 / 0.10)',
        pop: '0 22px 52px -16px rgb(10 37 64 / 0.30), 0 8px 22px -10px rgb(10 37 64 / 0.15)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-up': 'fade-up 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        'scale-in': 'scale-in 180ms cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-in-right': 'slide-in-right 220ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
