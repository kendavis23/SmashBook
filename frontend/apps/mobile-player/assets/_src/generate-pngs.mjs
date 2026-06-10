// Dependency-free placeholder PNG generator for the SmashBook (_default) brand.
//
// Phase 0 needs real, correctly-dimensioned PNGs so `app.config.ts` references
// resolve and an EAS build succeeds. These are deliberately simple placeholders
// (solid brand-blue field + a geometric "S" mark) generated with Node's built-in
// `zlib` only — no native image deps, reproducible on any machine. Swap in final
// art later by replacing the PNGs; the master SVGs in this folder are the spec.
//
// Run:  node assets/_src/generate-pngs.mjs   (from apps/mobile-player)

import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SRC_DIR = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(SRC_DIR, "..");

const BRAND_BLUE = [0x25, 0x63, 0xeb]; // #2563EB — cta / hero
const SLATE_900 = [0x0f, 0x17, 0x2a]; // #0F172A — foreground
const WHITE = [0xff, 0xff, 0xff];

// ---- minimal RGBA raster --------------------------------------------------

function createCanvas(w, h, [r, g, b] = [0, 0, 0], a = 0) {
    const px = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
        px[i * 4 + 0] = r;
        px[i * 4 + 1] = g;
        px[i * 4 + 2] = b;
        px[i * 4 + 3] = a;
    }
    return { w, h, px };
}

function fillRect(c, x0, y0, x1, y1, [r, g, b], a = 255) {
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

// A blocky "S": three horizontal bars joined by two short verticals,
// drawn inside a [size x size] box anchored at (ox, oy). `t` is bar thickness.
function drawS(c, ox, oy, size, color) {
    const t = Math.round(size * 0.18);
    const w = size;
    const h = size;
    // top, middle, bottom bars
    fillRect(c, ox, oy, ox + w, oy + t, color);
    fillRect(c, ox, oy + (h - t) / 2, ox + w, oy + (h + t) / 2, color);
    fillRect(c, ox, oy + h - t, ox + w, oy + h, color);
    // upper-left vertical (top → middle)
    fillRect(c, ox, oy, ox + t, oy + (h + t) / 2, color);
    // lower-right vertical (middle → bottom)
    fillRect(c, ox + w - t, oy + (h - t) / 2, ox + w, oy + h, color);
}

// ---- PNG encode (RGBA, 8-bit, no interlace) -------------------------------

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

// `opaque: true` emits an RGB (color type 2) PNG with no alpha channel — required
// for the iOS app icon, which the App Store rejects if it carries transparency.
function encodePng({ w, h, px }, opaque = false) {
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = opaque ? 2 : 6; // color type: 2 = RGB, 6 = RGBA
    // 10,11,12 = compression/filter/interlace = 0
    // filter byte (0) per scanline
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

function save(name, canvas, opaque = false) {
    const out = join(OUT_DIR, name);
    writeFileSync(out, encodePng(canvas, opaque));
    console.log(`wrote ${name} (${canvas.w}x${canvas.h})${opaque ? " [opaque]" : ""}`);
}

// ---- the four assets ------------------------------------------------------

// icon.png — 1024² brand-blue field, white S, no alpha holes (opaque)
{
    const c = createCanvas(1024, 1024, BRAND_BLUE, 255);
    drawS(c, 312, 252, 400, WHITE);
    save("icon.png", c, true); // iOS icon: opaque, no alpha
}

// adaptive-icon.png — 1024² transparent, blue S within the 66% safe zone
{
    const c = createCanvas(1024, 1024, [0, 0, 0], 0);
    drawS(c, 362, 312, 300, BRAND_BLUE);
    save("adaptive-icon.png", c);
}

// splash-icon.png — 1024² transparent, blue S + slate wordmark block
{
    const c = createCanvas(1024, 1024, [0, 0, 0], 0);
    drawS(c, 412, 300, 200, BRAND_BLUE);
    // simple wordmark placeholder bar
    fillRect(c, 312, 600, 712, 648, SLATE_900);
    save("splash-icon.png", c);
}

// notification-icon.png — 96² white-on-transparent silhouette
{
    const c = createCanvas(96, 96, [0, 0, 0], 0);
    drawS(c, 24, 20, 48, WHITE);
    save("notification-icon.png", c);
}

console.log("done");
