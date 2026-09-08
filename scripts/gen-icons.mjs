import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BG = [107, 124, 153]; // #6B7C99
const KEYCAP = [245, 241, 232]; // #F5F1E8
const BAR = [201, 154, 74]; // #C99A4A

// Art geometry in a 512x512 design space.
const KEYCAP_RECT = { x0: 116, y0: 154, x1: 396, y1: 322, r: 64 };
const BAR_RECT = { x0: 196, y0: 334, x1: 316, y1: 358, r: 12 };

function inRoundedRect(px, py, x0, y0, x1, y1, r) {
  if (px < x0 || px > x1 || py < y0 || py > y1) return false;
  const cx = Math.max(x0 + r, Math.min(px, x1 - r));
  const cy = Math.max(y0 + r, Math.min(py, y1 - r));
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

function inKeycap(px, py, { x0, y0, x1, y1, r }) {
  if (px < x0 || px > x1 || py < y0 || py > y1) return false;
  if (py >= y0 + r) return true;
  const cx = Math.max(x0 + r, Math.min(px, x1 - r));
  const dx = px - cx;
  const dy = py - (y0 + r);
  return dx * dx + dy * dy <= r * r;
}

function sample(x, y, opts) {
  if (opts.squareBg || inRoundedRect(x, y, 0, 0, 512, 512, opts.bgRadius)) {
    if (inKeycap(x, y, KEYCAP_RECT)) return KEYCAP;
    if (inRoundedRect(x, y, BAR_RECT.x0, BAR_RECT.y0, BAR_RECT.x1, BAR_RECT.y1, BAR_RECT.r)) return BAR;
    return BG;
  }
  return null;
}

function render(size, opts) {
  const scale = size / 512;
  const px = Buffer.alloc(size * size * 4);
  const S = 3;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          let dx = (x + (sx + 0.5) / S) * scale;
          let dy = (y + (sy + 0.5) / S) * scale;
          if (opts.maskable) {
            dx = (dx - 256) / 0.8 + 256;
            dy = (dy - 256) / 0.8 + 256;
          }
          const c = sample(dx, dy, opts);
          if (c) {
            r += c[0];
            g += c[1];
            b += c[2];
            a += 1;
          }
        }
      }
      const i = (y * size + x) * 4;
      const n = S * S;
      if (a > 0) {
        px[i] = Math.round(r / a);
        px[i + 1] = Math.round(g / a);
        px[i + 2] = Math.round(b / a);
        px[i + 3] = Math.round((a / n) * 255);
      }
    }
  }
  return px;
}

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  typeBuf.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 8 + data.length);
  return out;
}

function encodePNG(size, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = size * 4;
  const raw = Buffer.alloc(size * (stride + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const targets = [
  { file: "icon-192.png", size: 192, opts: { squareBg: false, bgRadius: 90, maskable: false } },
  { file: "icon-512.png", size: 512, opts: { squareBg: false, bgRadius: 90, maskable: false } },
  { file: "maskable-512.png", size: 512, opts: { squareBg: true, bgRadius: 0, maskable: true } }
];

for (const t of targets) {
  const png = encodePNG(t.size, render(t.size, t.opts));
  writeFileSync(join(outDir, t.file), png);
  console.log(`${t.file}: ${png.length} bytes`);
}
