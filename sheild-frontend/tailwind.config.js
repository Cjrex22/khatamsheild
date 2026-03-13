/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: 'var(--c-primary)',
                'primary-hover': 'var(--c-primary-hover)',
                'primary-light': 'var(--c-primary-light)',
                'primary-glow': 'var(--c-primary-glow)',
                'primary-subtle': 'var(--c-primary-subtle)',
                bg: 'var(--c-bg)',
                surface: 'var(--c-surface)',
                'surface-2': 'var(--c-surface-2)',
                'surface-3': 'var(--c-surface-3)',
                'text-1': 'var(--c-text-1)',
                'text-2': 'var(--c-text-2)',
                'text-3': 'var(--c-text-3)',
                'text-disabled': 'var(--c-text-disabled)',
                safe: 'var(--c-safe)',
                'safe-glow': 'var(--c-safe-glow)',
                warning: 'var(--c-warning)',
                'warning-glow': 'var(--c-warning-glow)',
                danger: 'var(--c-danger)',
                'danger-glow': 'var(--c-danger-glow)',
                info: 'var(--c-info)',
                border: 'var(--c-border)',
                'border-strong': 'var(--c-border-strong)',
                'nav-bg': 'var(--c-nav-bg)',
                overlay: 'var(--c-overlay)',
            },
            borderRadius: {
                sm: 'var(--radius-sm)',
                md: 'var(--radius-md)',
                lg: 'var(--radius-lg)',
                xl: 'var(--radius-xl)',
                full: 'var(--radius-full)',
            },
            boxShadow: {
                card: 'var(--shadow-card)',
                sos: 'var(--shadow-sos)',
                safe: 'var(--shadow-safe)',
                nav: 'var(--shadow-nav)',
            },
            fontFamily: {
                display: 'var(--font-display)',
                body: 'var(--font-body)',
                mono: 'var(--font-mono)',
            }
        },
    },
    plugins: [],
}
