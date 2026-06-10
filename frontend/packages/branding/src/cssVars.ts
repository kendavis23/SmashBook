// Maps a brand `ThemeColors` object → the CSS-variable record consumed by NativeWind's
// `vars()` at the root, so `className` tokens (`bg-card`, `text-foreground`, `bg-cta`, …)
// re-skin per brand at runtime (plan §5.3, §7).
//
// Only the tokens that have a `className` counterpart in `@repo/tailwind-config`
// (`hsl(var(--token))`) are mapped — the JS-only tokens (hero, tabBar, overlay, shadow, …)
// are consumed via `useThemeColors()` and need no CSS variable. The CSS-var names and HSL
// triplet format mirror `packages/design-system/tokens/tokens.css` exactly.

import { hexToHslTriplet } from "./color";
import type { BrandTheme, ThemeColors } from "./types";

// ThemeColors token → CSS custom-property name. Keep in lockstep with the `colors` map in
// `packages/tailwind-config/tailwind.config.ts` (every `hsl(var(--x))` there needs an entry
// here) and the variable names in `tokens.css`.
const TOKEN_TO_CSS_VAR: Partial<Record<keyof ThemeColors, string>> = {
    background: "--background",
    foreground: "--foreground",
    card: "--card",
    cardForeground: "--card-foreground",
    primary: "--primary",
    primaryForeground: "--primary-foreground",
    secondary: "--secondary",
    secondaryForeground: "--secondary-foreground",
    muted: "--muted",
    mutedForeground: "--muted-foreground",
    accent: "--accent",
    accentForeground: "--accent-foreground",
    border: "--border",
    input: "--input",
    ring: "--ring",
    cta: "--cta",
    ctaForeground: "--cta-foreground",
    ctaHover: "--cta-hover",
};

// Build the `vars()` input for one resolved scheme (light or dark) of a brand theme.
// Converts each className-mapped token to an HSL triplet; tokens that aren't plain hex
// (none of the mapped ones use rgba today) are skipped so the base token value stays.
// `tailwindOverrides` on the brand theme win last, letting a brand set a className token
// (or a non-color CSS var like `--radius`) verbatim without going through the converter.
export function buildBrandCssVars(
    colors: ThemeColors,
    tailwindOverrides?: BrandTheme["tailwindOverrides"]
): Record<string, string> {
    const out: Record<string, string> = {};

    for (const [token, cssVar] of Object.entries(TOKEN_TO_CSS_VAR)) {
        if (!cssVar) continue;
        const triplet = hexToHslTriplet(colors[token as keyof ThemeColors]);
        if (triplet) out[cssVar] = triplet;
    }

    if (tailwindOverrides) {
        for (const [cssVar, value] of Object.entries(tailwindOverrides)) {
            out[cssVar] = value;
        }
    }

    return out;
}
