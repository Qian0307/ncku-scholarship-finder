// 產生 PWA 需要的 PNG icon（零依賴，純 Node）。
// Android Chrome 需要 PNG 192/512 才會出現「安裝／加到主畫面」；iOS 的 apple-touch-icon 也不吃 SVG。
// 設計：NCKU 暗紅底 + 白色圓形徽記（簡潔、可作 maskable，OS 會自行套用圓角遮罩）。
//
// 執行：npm run gen:icons
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const NCKU = [0x8a, 0x15, 0x38];
const WHITE = [0xff, 0xff, 0xff];

// CRC32（PNG chunk 用）
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** 產生一張正方形 RGBA PNG（size×size），紅底白圓 */
function makeIcon(size) {
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.34; // 白圓半徑（落在 maskable 安全區內）
  const rInner = size * 0.2; // 內部紅圓 → 形成徽章環
  const raw = Buffer.alloc(size * (size * 4 + 1)); // 每列 1 byte filter + RGBA
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter type 0
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      let col;
      if (d <= rInner) col = NCKU;
      else if (d <= rOuter) col = WHITE;
      else col = NCKU;
      raw[p++] = col[0];
      raw[p++] = col[1];
      raw[p++] = col[2];
      raw[p++] = 0xff;
    }
  }
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(process.cwd(), 'public');
const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
];
for (const [name, size] of targets) {
  writeFileSync(path.join(outDir, name), makeIcon(size));
  console.log(`產生 ${name}（${size}×${size}）`);
}
