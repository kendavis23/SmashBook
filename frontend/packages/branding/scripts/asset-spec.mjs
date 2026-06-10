// The required native-asset set every brand must produce, with exact dimensions and
// alpha rules (plan §6 "Required assets per brand"). This is the single spec the
// generator emits to AND the CI dimension validator checks against — one source of
// truth so "generated" and "validated" can never drift.
//
// `key` maps to the brand manifest's `native.<key>` output path. `draw` describes the
// placeholder geometry the dependency-free generator renders from the brand's accent
// colour; real brand art replaces the PNGs at these same dimensions.

export const ASSET_SPEC = [
    {
        key: "icon",
        width: 1024,
        height: 1024,
        opaque: true, // iOS app icon — App Store rejects alpha
        // accent field, white mark, centred large
        draw: { type: "iconField", markSize: 400 },
    },
    {
        key: "adaptiveIcon",
        width: 1024,
        height: 1024,
        opaque: false,
        // transparent, accent mark within Android's 66% safe zone
        draw: { type: "markOnTransparent", markSize: 300, color: "accent" },
    },
    {
        key: "splash",
        width: 1024,
        height: 1024,
        opaque: false,
        // transparent, accent mark + neutral wordmark bar
        draw: { type: "splash", markSize: 200 },
    },
    {
        key: "notificationIcon",
        width: 96,
        height: 96,
        opaque: false,
        // white-on-transparent silhouette (Android tints it)
        draw: { type: "markOnTransparent", markSize: 48, color: "white" },
    },
];

// PNG magic + IHDR live at fixed offsets — read width/height/colorType without decoding
// the image, so the validator stays dependency-free (matches the generator's encoder).
export function readPngHeader(buf) {
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    for (let i = 0; i < sig.length; i++) {
        if (buf[i] !== sig[i]) throw new Error("not a PNG (bad signature)");
    }
    // IHDR data begins at byte 16 (8 sig + 4 len + 4 "IHDR")
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    const bitDepth = buf[24];
    const colorType = buf[25]; // 2 = RGB (opaque), 6 = RGBA
    return { width, height, bitDepth, colorType, hasAlpha: colorType === 6 };
}
