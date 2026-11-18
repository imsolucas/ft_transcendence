#!/usr/bin/env node
// Generates the PWA icons in public/icons/ (committed). Dependency-free: draws the pong glyph
// into an RGBA buffer and encodes it as PNG with node:zlib, so the output is reproducible.
//   node scripts/generate-icons.mjs
// Colours are the design tokens (src/styles/tokens.css): --bg, --surface-2, --border-strong,
// --neon-magenta, --neon-cyan, --fg. Change them there first, then here.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const C = {
  bg: hex("#0b0614"),
  surface: hex("#1b1130"),
  line: hex("#7c66ad"),
  magenta: hex("#ff2e97"),
  cyan: hex("#2de2e6"),
  fg: hex("#f3eeff"),
};

// Glyph in unit coordinates [x0, y0, x1, y1]: two paddles, the ball and a dashed net
const PADDLE_L = [0.24, 0.3, 0.31, 0.58];
const PADDLE_R = [0.69, 0.44, 0.76, 0.72];
const BALL = [0.53, 0.38, 0.6, 0.45];
const NET = Array.from({ length: 6 }, (_, i) => [0.49, 0.22 + i * 0.1, 0.51, 0.27 + i * 0.1]);
// Favicon: the same idea, bolder and without the net, so it still reads at 16 px
const FAV = { left: [0.16, 0.2, 0.32, 0.64], right: [0.68, 0.36, 0.84, 0.8], ball: [0.43, 0.42, 0.57, 0.56] };

/** Distance from (x, y) to a rectangle (0 inside) */
function rectDist(x, y, [x0, y0, x1, y1]) {
  const dx = Math.max(x0 - x, 0, x - x1);
  const dy = Math.max(y0 - y, 0, y - y1);
  return Math.hypot(dx, dy);
}

const over = (dst, src, a) => dst.map((v, i) => v + (src[i] - v) * a);

/**
 * @param size   output size in px
 * @param scale  glyph scale around the centre (maskable icons keep it inside the safe zone)
 * @param round  corner radius as a fraction of the size, 0 = full-bleed opaque square
 */
function draw(size, { scale = 1, round = 0, favicon = false } = {}) {
  const px = Buffer.alloc(size * size * 4);
  const glow = 0.035;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      // pixel centre in unit space, then undo the glyph scale
      const ux = (i + 0.5) / size;
      const uy = (j + 0.5) / size;
      const x = 0.5 + (ux - 0.5) / scale;
      const y = 0.5 + (uy - 0.5) / scale;

      // background: night-purple with a faint inner plate
      let col = C.bg;
      if (favicon) {
        // flat and bold: anti-aliased shapes, no plate, net, glow or scanlines
        const aa = 0.5 / size;
        for (const [r, c] of [
          [FAV.left, C.magenta],
          [FAV.right, C.cyan],
          [FAV.ball, C.fg],
        ]) {
          const d = rectDist(x, y, r);
          col = over(col, c, Math.min(Math.max(1 - d / aa, 0), 1));
        }
      } else {
        const plate = rectDist(x, y, [0.12, 0.12, 0.88, 0.88]);
        if (plate === 0) col = over(col, C.surface, 0.35);

        for (const n of NET) if (rectDist(x, y, n) === 0) col = C.line;

        for (const [r, c] of [
          [PADDLE_L, C.magenta],
          [PADDLE_R, C.cyan],
          [BALL, C.fg],
        ]) {
          const d = rectDist(x, y, r);
          col = d === 0 ? c : over(col, c, 0.5 * Math.exp(-d / glow));
        }

        // CRT scanlines: every 4th row (in a 128-row grid) slightly darker
        if (Math.floor(uy * 128) % 4 === 3) col = over(col, [0, 0, 0], 0.18);
      }

      // corner rounding with 1px anti-aliasing
      let alpha = 1;
      if (round > 0) {
        const r = round * size;
        const cx = Math.min(Math.max(i + 0.5, r), size - r);
        const cy = Math.min(Math.max(j + 0.5, r), size - r);
        const d = Math.hypot(i + 0.5 - cx, j + 0.5 - cy);
        alpha = Math.min(Math.max(r - d + 0.5, 0), 1);
      }

      const o = (j * size + i) * 4;
      px[o] = Math.round(col[0]);
      px[o + 1] = Math.round(col[1]);
      px[o + 2] = Math.round(col[2]);
      px[o + 3] = Math.round(alpha * 255);
    }
  }
  return png(size, px);
}

// --- minimal PNG encoder (RGBA, 8-bit, no interlace) ---
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const ICONS = {
  "icon-192.png": draw(192, { round: 0.18 }),
  "icon-512.png": draw(512, { round: 0.18 }),
  // maskable: full-bleed, glyph scaled into the central safe zone (radius 40%)
  "maskable-192.png": draw(192, { scale: 0.8 }),
  "maskable-512.png": draw(512, { scale: 0.8 }),
  // iOS rounds the corners itself and wants an opaque image
  "apple-touch-icon.png": draw(180),
};

mkdirSync(OUT, { recursive: true });
for (const [name, buf] of Object.entries(ICONS)) {
  writeFileSync(join(OUT, name), buf);
  process.stdout.write(`wrote public/icons/${name} (${buf.length} bytes)\n`);
}

// --- favicon.ico: 16, 32 and 48 px PNGs in one ICO container (all current browsers read it) ---
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e[0] = size % 256; // 0 means 256
    e[1] = size % 256;
    e[2] = 0; // no palette
    e[3] = 0;
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}
const APP = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "app");
const favicon = ico([16, 32, 48].map((size) => ({ size, data: draw(size, { favicon: true, round: 0.22 }) })));
writeFileSync(join(APP, "favicon.ico"), favicon);
process.stdout.write(`wrote src/app/favicon.ico (${favicon.length} bytes)\n`);
