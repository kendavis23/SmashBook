// Dependency-free RGBA raster + PNG encoder shared by the brand asset pipeline
// (plan §6, Phase 6). Extracted from the original per-app placeholder generator so a
// single, tested encoder serves every brand — no native image deps, reproducible on any
// machine (Node `zlib` only). The brand-aware generator (`generate-assets.mjs`) drives
// this with each brand's accent colour pulled from its resolved manifest.

import { deflateSync } from "node:zlib";

export const WHITE = [0xff, 0xff, 0xff];

// Parse "#RRGGBB" → [r, g, b]. Accent colours come straight from a brand's resolved
// theme (`theme.light.cta`), so the generator never hard-codes a brand colour.
export function hexToRgb(hex) {
    const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
    if (!m) throw new Error(`expected #RRGGBB hex, got: ${hex}`);
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

// ---- minimal RGBA raster --------------------------------------------------

export function createCanvas(w, h, [r, g, b] = [0, 0, 0], a = 0) {
    const px = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
        px[i * 4 + 0] = r;
        px[i * 4 + 1] = g;
        px[i * 4 + 2] = b;
        px[i * 4 + 3] = a;
    }
    return { w, h, px };
}

export function fillRect(c, x0, y0, x1, y1, [r, g, b], a = 255) {
    for (let y = Math.max(0, y0); y < Math.min(c.h, y1); y++) {
        for (let x = Math.max(0, x0); x < Math.min(c.w, x1); x++) {
            const i = (y * c.w + x) * 4;
            c.px[i] = r;
            c.px[i + 1] = g;
            c.px[i + 2] = b;
            c.px[i + 3] = a;
        }
    }
}

// A blocky "S" mark (the master placeholder geometry) inside a [size x size] box at
// (ox, oy). Real brand art replaces these PNGs; the geometry only needs to be a valid,
// correctly-dimensioned stand-in so builds resolve and CI dimension checks pass.
export function drawS(c, ox, oy, size, color) {
    const t = Math.round(size * 0.18);
    const w = size;
    const h = size;
    fillRect(c, ox, oy, ox + w, oy + t, color);
    fillRect(c, ox, oy + (h - t) / 2, ox + w, oy + (h + t) / 2, color);
    fillRect(c, ox, oy + h - t, ox + w, oy + h, color);
    fillRect(c, ox, oy, ox + t, oy + (h + t) / 2, color);
    fillRect(c, ox + w - t, oy + (h - t) / 2, ox + w, oy + h, color);
}

// ---- PNG encode (RGBA / RGB, 8-bit, no interlace) -------------------------

function crc32(buf) {
    let crc = ~0;
    for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (~crc) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const body = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
}

// `opaque: true` emits an RGB (color type 2) PNG with no alpha channel — required for the
// iOS app icon, which the App Store rejects if it carries transparency.
export function encodePng({ w, h, px }, opaque = false) {
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = opaque ? 2 : 6; // color type: 2 = RGB, 6 = RGBA
    const channels = opaque ? 3 : 4;
    const stride = w * channels + 1;
    const raw = Buffer.alloc(h * stride);
    for (let y = 0; y < h; y++) {
        raw[y * stride] = 0; // filter: none
        for (let x = 0; x < w; x++) {
            const src = (y * w + x) * 4;
            const dst = y * stride + 1 + x * channels;
            raw[dst] = px[src];
            raw[dst + 1] = px[src + 1];
            raw[dst + 2] = px[src + 2];
            if (!opaque) raw[dst + 3] = px[src + 3];
        }
    }
    const idat = deflateSync(raw, { level: 9 });
    return Buffer.concat([
        sig,
        chunk("IHDR", ihdr),
        chunk("IDAT", idat),
        chunk("IEND", Buffer.alloc(0)),
    ]);
}
