// Types for asset-spec.mjs — the dependency-free spec + PNG-header reader are authored in
// JS (shared with the `.mjs` generator), so this declaration gives the TS dimension test
// (asset-dimensions.test.ts) real types without enabling allowJs across the package.

export type AssetKey = "icon" | "adaptiveIcon" | "splash" | "notificationIcon";

export type AssetDraw =
    | { type: "iconField"; markSize: number }
    | { type: "markOnTransparent"; markSize: number; color: "accent" | "white" }
    | { type: "splash"; markSize: number };

export type AssetSpecEntry = {
    key: AssetKey;
    width: number;
    height: number;
    opaque: boolean;
    draw: AssetDraw;
};

export const ASSET_SPEC: readonly AssetSpecEntry[];

export type PngHeader = {
    width: number;
    height: number;
    bitDepth: number;
    colorType: number;
    hasAlpha: boolean;
};

export function readPngHeader(buf: Uint8Array): PngHeader;
