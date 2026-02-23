const zlib = require("zlib");
const fs = require("fs");

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(buf) {
  let c = 0xffffffff;
  const table = [];
  for (let i = 0; i < 256; i++) {
    let n = i;
    for (let j = 0; j < 8; j++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
    table[i] = n;
  }
  for (let i = 0; i < buf.length; i++)
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const tc = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tc, data])));
  return Buffer.concat([len, tc, data, crc]);
}

const W = 128,
  H = 128;
const rawData = Buffer.alloc((W * 3 + 1) * H);

for (let y = 0; y < H; y++) {
  rawData[y * (W * 3 + 1)] = 0;
  for (let x = 0; x < W; x++) {
    const px = y * (W * 3 + 1) + 1 + x * 3;
    const dx = x - 64,
      dy = y - 64;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 40) {
      rawData[px] = 255;
      rawData[px + 1] = 255;
      rawData[px + 2] = 255;
    } else if (dist < 42) {
      rawData[px] = 78;
      rawData[px + 1] = 205;
      rawData[px + 2] = 196;
    } else {
      rawData[px] = 26;
      rawData[px + 1] = 26;
      rawData[px + 2] = 46;
    }
  }
}

const compressed = zlib.deflateSync(rawData);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(128, 0);
ihdr.writeUInt32BE(128, 4);
ihdr[8] = 8;
ihdr[9] = 2;

const png = Buffer.concat([
  PNG_SIG,
  pngChunk("IHDR", ihdr),
  pngChunk("IDAT", compressed),
  pngChunk("IEND", Buffer.alloc(0)),
]);

const outPath = __dirname + "/icon.png";
fs.writeFileSync(outPath, png);
console.log("Created icon.png:", png.length, "bytes");
