import type { Config } from "tailwindcss";

// Shared Tailwind preset — all apps extend this via @repo/tailwind-config.
// Design tokens are exposed as CSS variables and consumed via hsl(var(--token)).
// Never redefine these tokens per-app.
const config: Omit<Config, "content"> = {
    darkMode: ["class"],
    theme: {
        extend: {
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
                success: {
                    DEFAULT: "hsl(var(--success))",
                    foreground: "hsl(var(--success-foreground))",
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
                cta: {
                    DEFAULT: "hsl(var(--cta))",
                    foreground: "hsl(var(--cta-foreground))",
                    hover: "hsl(var(--cta-hover))",
                    ring: "hsl(var(--cta-ring))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            boxShadow: {
                xs: "var(--shadow-xs)",
                sm: "var(--shadow-sm)",
                DEFAULT: "var(--shadow-md)",
                md: "var(--shadow-md)",
                lg: "var(--shadow-lg)",
                xl: "var(--shadow-xl)",
            },
            fontSize: {
                xs: ["var(--text-xs)", { lineHeight: "var(--text-xs-leading)" }],
                sm: ["var(--text-sm)", { lineHeight: "var(--text-sm-leading)" }],
                base: ["var(--text-base)", { lineHeight: "var(--text-base-leading)" }],
                lg: ["var(--text-lg)", { lineHeight: "var(--text-lg-leading)" }],
                xl: ["var(--text-xl)", { lineHeight: "var(--text-xl-leading)" }],
                "2xl": ["var(--text-2xl)", { lineHeight: "var(--text-2xl-leading)" }],
                "3xl": ["var(--text-3xl)", { lineHeight: "var(--text-3xl-leading)" }],
            },
        },
    },
};

export default config;
