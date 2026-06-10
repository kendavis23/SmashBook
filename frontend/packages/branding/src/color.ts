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
// Pure, no React/Expo imports — usable from BrandProvider and tests alike.

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
