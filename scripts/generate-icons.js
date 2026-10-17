import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Simple raw PNG writer in Node.js (no external deps)
function createPNG(width, height, getPixel) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0
  const rowStride = width * 4;
  const rawData = Buffer.alloc(height * (rowStride + 1));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const buf = Buffer.alloc(12 + length);
  buf.writeUInt32BE(length, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = crc32(buf.subarray(4, 8 + length));
  buf.writeInt32BE(crc, 8 + length);
  return buf;
}

// CRC32 implementation for PNG
function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return crc ^ -1;
}

const table = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  table[n] = c;
}

// Game icon generator
function iconPixel(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = (x - cx) / (w * 0.45);
  const dy = (y - cy) / (h * 0.45);
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background rounded squircle
  if (Math.abs(dx) > 0.95 || Math.abs(dy) > 0.95) {
    return [9, 13, 22, 255]; // Dark background
  }

  // Draw infinity loop approximately: (x^2 + y^2)^2 = 2 a^2 (x^2 - y^2)
  const nx = (x - cx) / (w * 0.35);
  const ny = (y - cy) / (h * 0.35);
  const term1 = (nx * nx + ny * ny);
  const lemniscate = term1 * term1 - 1.2 * (nx * nx - ny * ny);

  if (Math.abs(lemniscate) < 0.28) {
    // Gradient along x: Cyan -> Indigo -> Pink
    const t = (x / w);
    const r = Math.round(6 + (236 - 6) * t);
    const g = Math.round(182 + (72 - 182) * t);
    const b = Math.round(212 + (153 - 212) * t);
    return [r, g, b, 255];
  }

  // Inner dark violet background
  return [15, 23, 42, 255];
}

const iconsDir = path.resolve('public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating PWA icons...');
const icon192 = createPNG(192, 192, iconPixel);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), icon192);

const icon512 = createPNG(512, 512, iconPixel);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), icon512);
fs.writeFileSync(path.join(iconsDir, 'icon-512-maskable.png'), icon512);

// Copy 192 to apple-touch-icon in public/
fs.writeFileSync(path.resolve('public/apple-touch-icon.png'), icon192);
fs.writeFileSync(path.resolve('public/favicon.ico'), icon192);

console.log('PWA icons successfully generated in public/icons/');
