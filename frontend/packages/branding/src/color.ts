// Color conversion for NativeWind `className` token theming (plan §5.3).
//
// The mobile `ThemeColors` tokens are stored as hex/rgba strings (what RN inline styles
// and `<Ionicons color>` need). NativeWind `className` tokens (`bg-card`, `text-foreground`)
// instead resolve through the tailwind config's `hsl(var(--token))`, which expects the CSS
// variable to hold an HSL *channel triplet* (e.g. "221 83% 53%"), exactly as authored in
// `packages/design-system/tokens/tokens.css`.
//
// To brand the className tokens at runtime we inject the active brand's CSS variables via
// NativeWind's `vars()`. This module converts a brand's hex token into that triplet form so
// the manifest stays a single source of truth (authored once as hex) and the className
// tokens derive from it — no second, hand-maintained HSL copy per brand.
//
// Pure, no React/Expo imports — usable from BrandProvider, the theme generator, and tests.

// Parse a hex string (#rgb, #rrggbb, #rrggbbaa) into [r, g, b] 0–255. Returns null for
// values that are not plain hex (e.g. "rgba(...)", named colors) — those are left to the
// caller to skip, since only the className-mapped tokens are ever converted and those are
// all solid hex in practice.
function parseHex(input: string): [number, number, number] | null {
    const hex = input.trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]+$/.test(hex)) return null;

    if (hex.length === 3) {
        const r = parseInt(hex.slice(0, 1).repeat(2), 16);
        const g = parseInt(hex.slice(1, 2).repeat(2), 16);
        const b = parseInt(hex.slice(2, 3).repeat(2), 16);
        return [r, g, b];
    }
    if (hex.length === 6 || hex.length === 8) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return [r, g, b];
    }
    return null;
}

// Round to at most one decimal place, dropping a trailing ".0" — matches the style of the
// triplets authored in tokens.css ("220 18% 95.5%", "0 0% 100%").
function tidy(n: number): string {
    return Number(n.toFixed(1)).toString();
}

// Convert a hex color to an HSL channel triplet string ("H S% L%") suitable for a CSS
// variable consumed by `hsl(var(--token))`. Returns null if the input is not plain hex
// (rgba / named values are not className-mapped and need no conversion).
export function hexToHslTriplet(input: string): string | null {
    const rgb = parseHex(input);
    if (!rgb) return null;

    const r = rgb[0] / 255;
    const g = rgb[1] / 255;
    const b = rgb[2] / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    const l = (max + min) / 2;

    let h = 0;
    let s = 0;

    if (delta !== 0) {
        s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

        switch (max) {
            case r:
                h = (g - b) / delta + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / delta + 2;
                break;
            default:
                h = (r - g) / delta + 4;
                break;
        }
        h *= 60;
    }

    return `${tidy(h)} ${tidy(s * 100)}% ${tidy(l * 100)}%`;
}

// ── Derivation helpers ──────────────────────────────────────────────────────
// The theme generator (theme-generator.ts) derives the full ThemeColors token set from a
// brand's handful of base colors. These pure helpers do the per-token math: darken/lighten
// for hover/active states, low-alpha tints for soft surfaces, and translucent overlays.
// All operate in hex/rgba so the output drops straight into ThemeColors.

function clamp255(n: number): number {
    return Math.max(0, Math.min(255, Math.round(n)));
}

function toHex2(n: number): string {
    return clamp255(n).toString(16).padStart(2, "0");
}

function rgbToHex(r: number, g: number, b: number): string {
    return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`.toUpperCase();
}

// Mix `color` toward `target` (both hex) by `amount` (0..1). amount=0 → color, 1 → target.
function mix(color: string, target: string, amount: number): string {
    const a = parseHex(color);
    const b = parseHex(target);
    if (!a || !b) return color;
    const t = Math.max(0, Math.min(1, amount));
    const [ar, ag, ab] = a;
    const [br, bg, bb] = b;
    return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

// Darken a hex color toward black by `amount` (0..1) — used for hover/pressed states.
export function darken(color: string, amount: number): string {
    return mix(color, "#000000", amount);
}

// Lighten a hex color toward white by `amount` (0..1).
export function lighten(color: string, amount: number): string {
    return mix(color, "#FFFFFF", amount);
}

// Build an `rgba(r,g,b,a)` string from a hex color and an alpha (0..1) — used for soft
// surfaces, borders, ripple, and glass overlays on dark brands. `alpha` is rounded to two
// decimals to match the rgba() literals authored by hand in the existing theme.
export function rgba(color: string, alpha: number): string {
    const c = parseHex(color);
    if (!c) return color;
    // Two-decimal alpha, matching the rgba() literals authored by hand in the existing theme
    // ("rgba(37,99,235,0.10)") so generated tokens read identically.
    const a = Math.max(0, Math.min(1, alpha)).toFixed(2);
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

// A very light tint of `color` on a white background — the "soft surface" pattern used by
// ctaSurface / successSurface / warningSurface / destructiveSurface in light themes. Returns
// an opaque hex (not rgba) so it reads identically over any background, matching the existing
// blue50 / green50 / amber50 / red50 surface tokens.
export function tint(color: string, amount = 0.92): string {
    return lighten(color, amount);
}
