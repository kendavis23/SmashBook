// Raw color palette — the fixed hue/shade values the semantic themes are built from.
// These are mode-agnostic constants (a "blue-600" is the same hex in light and dark);
// what changes between themes is which palette entry each *semantic* token points at.
//
// Components should prefer semantic tokens from `useTheme().colors`. Reach into
// `palette` directly only for a one-off shade a semantic token does not express.

export const palette = {
    white: "#FFFFFF",
    black: "#000000",

    // Slate (neutral surfaces / text)
    slate50: "#F8FAFC",
    slate100: "#F1F5F9",
    slate200: "#E2E8F0",
    slate300: "#CBD5E1",
    slate400: "#94A3B8",
    slate500: "#64748B",
    slate600: "#475569",
    slate700: "#334155",
    slate800: "#1E293B",
    slate900: "#0F172A",

    // Cool grey (alt neutral used by some cards/inputs)
    grey50: "#F9FAFB",
    grey100: "#F3F4F6",
    grey200: "#E5E7EB",
    grey300: "#D1D5DB",
    grey400: "#9CA3AF",
    grey500: "#6B7280",
    grey600: "#4B5563",
    grey700: "#374151",
    grey800: "#1F2937",
    grey900: "#111827",

    // Blue (brand / CTA / hero)
    blue50: "#EFF6FF",
    blue100: "#DBEAFE",
    blue200: "#BFDBFE",
    blue300: "#93C5FD",
    blue400: "#60A5FA",
    blue500: "#3B82F6",
    blue600: "#2563EB",
    blue700: "#1D4ED8",
    blue800: "#1E40AF",
    blue900: "#1E3A8A",

    // Green (success)
    green50: "#F0FDF4",
    green100: "#DCFCE7",
    green200: "#BBF7D0",
    green300: "#86EFAC",
    green500: "#22C55E",
    green600: "#16A34A",
    green700: "#15803D",
    emerald500: "#10B981",
    emerald600: "#059669",

    // Amber / yellow (warning)
    amber50: "#FFFBEB",
    amber100: "#FEF3C7",
    amber200: "#FDE68A",
    amber300: "#FCD34D",
    amber500: "#F59E0B",
    amber600: "#D97706",
    amber700: "#A16207",
    amber800: "#92400E",

    // Red (destructive)
    red50: "#FEF2F2",
    red100: "#FEE2E2",
    red200: "#FECACA",
    red300: "#FCA5A5",
    red400: "#F87171",
    red500: "#EF4444",
    red600: "#DC2626",
    red700: "#B91C1C",
    red800: "#991B1B",
} as const;

export type Palette = typeof palette;
