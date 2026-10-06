/* PM Steps Workbook: minimal ZIP writer for the Word and Excel export.
 *
 *   PMZip.zip([[name, Uint8Array | string], ...], {store}) -> Uint8Array
 *
 * Strings are written as UTF-8. Names are UTF-8 (general purpose flag bit 11). Each entry is
 * compressed with raw DEFLATE (fixed Huffman codes, LZ77 with a 32 KB window) when that makes it
 * smaller, otherwise stored. Already compressed data (PNG, JPEG, ZIP) is always stored.
 * `{store: true}` stores every entry. No ZIP64: the export stays far below 4 GB.
 * Runs in the browser and in Node (no DOM or Node APIs used).
 */
(function (root) {
  'use strict';

  // ---------- CRC-32 (IEEE 802.3, reflected, polynomial 0xEDB88320) ----------
  const CRC_TABLE = (function () {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  // ---------- UTF-8 ----------
  function utf8(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    // Fallback (TextEncoder exists in every current browser and in Node).
    const out = [];
    for (let i = 0; i < str.length; i++) {
      let cp = str.codePointAt(i);
      if (cp > 0xffff) i++;
      if (cp >= 0xd800 && cp <= 0xdfff) cp = 0xfffd;
      if (cp < 0x80) out.push(cp);
      else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
      else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
      else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    }
    return new Uint8Array(out);
  }
  function toBytes(data) {
    if (data == null) return new Uint8Array(0);
    if (typeof data === 'string') return utf8(data);
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    if (Array.isArray(data)) return Uint8Array.from(data);
    return utf8(String(data));
  }

  // ---------- raw DEFLATE, fixed Huffman block (RFC 1951, BTYPE=01) ----------
  const LEN_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
  const LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
  const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];

  function reverseBits(v, n) {
    let r = 0;
    for (let i = 0; i < n; i++) {
      r = (r << 1) | (v & 1);
      v >>>= 1;
    }
    return r;
  }
  // Fixed literal/length codes, stored bit-reversed so they can be written LSB first.
  const LIT_CODE = new Uint16Array(288);
  const LIT_LEN = new Uint8Array(288);
  (function () {
    for (let s = 0; s < 288; s++) {
      let code, len;
      if (s < 144) (code = 0x30 + s), (len = 8);
      else if (s < 256) (code = 0x190 + (s - 144)), (len = 9);
      else if (s < 280) (code = s - 256), (len = 7);
      else (code = 0xc0 + (s - 280)), (len = 8);
      LIT_CODE[s] = reverseBits(code, len);
      LIT_LEN[s] = len;
    }
  })();
  const DIST_CODE = new Uint8Array(30);
  for (let d = 0; d < 30; d++) DIST_CODE[d] = reverseBits(d, 5);
  // Length 3..258 -> length code index (0..28)
  const LEN_INDEX = new Uint8Array(259);
  for (let i = 0; i < 29; i++) {
    const hi = i === 28 ? 258 : LEN_BASE[i] + (1 << LEN_EXTRA[i]) - 1;
    for (let l = LEN_BASE[i]; l <= hi && l <= 258; l++) LEN_INDEX[l] = i;
  }
  LEN_INDEX[258] = 28;
  function distIndex(d) {
    let lo = 0;
    let hi = 29;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (DIST_BASE[mid] <= d) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  function deflateRaw(src) {
    const n = src.length;
    let out = new Uint8Array(Math.max(64, (n >> 1) + 64));
    let pos = 0;
    let bitBuf = 0;
    let bitCnt = 0;
    function ensure(extra) {
      if (pos + extra <= out.length) return;
      const grown = new Uint8Array(Math.max(out.length * 2, pos + extra + 1024));
      grown.set(out.subarray(0, pos));
      out = grown;
    }
    function bits(v, len) {
      bitBuf |= v << bitCnt;
      bitCnt += len;
      while (bitCnt >= 8) {
        out[pos++] = bitBuf & 0xff;
        bitBuf >>>= 8;
        bitCnt -= 8;
      }
    }
    function lit(s) {
      bits(LIT_CODE[s], LIT_LEN[s]);
    }

    ensure(16);
    bits(1, 1); // BFINAL
    bits(1, 2); // BTYPE = 01 (fixed Huffman)

    const WSIZE = 32768;
    const HBITS = 15;
    const HSIZE = 1 << HBITS;
    const head = new Int32Array(HSIZE).fill(-1);
    const prev = new Int32Array(WSIZE);
    const MAX_CHAIN = 48;
    const NICE = 128;
    const hash = (i) => (((src[i] << 10) ^ (src[i + 1] << 5) ^ src[i + 2]) & (HSIZE - 1));
    const insert = (i) => {
      const h = hash(i);
      prev[i & (WSIZE - 1)] = head[h];
      head[h] = i;
    };

    let i = 0;
    while (i < n) {
      ensure(8);
      let bestLen = 0;
      let bestDist = 0;
      if (i + 2 < n) {
        let cand = head[hash(i)];
        let chain = MAX_CHAIN;
        const maxLen = Math.min(258, n - i);
        while (cand >= 0 && i - cand <= WSIZE && chain-- > 0) {
          if (src[cand + bestLen] === src[i + bestLen] && src[cand] === src[i]) {
            let l = 0;
            while (l < maxLen && src[cand + l] === src[i + l]) l++;
            if (l > bestLen) {
              bestLen = l;
              bestDist = i - cand;
              if (l >= NICE || l === maxLen) break;
            }
          }
          const p = prev[cand & (WSIZE - 1)];
          if (p >= cand) break;
          cand = p;
        }
      }
      if (bestLen >= 3) {
        const li = LEN_INDEX[bestLen];
        lit(257 + li);
        if (LEN_EXTRA[li]) bits(bestLen - LEN_BASE[li], LEN_EXTRA[li]);
        const di = distIndex(bestDist);
        bits(DIST_CODE[di], 5);
        if (DIST_EXTRA[di]) bits(bestDist - DIST_BASE[di], DIST_EXTRA[di]);
        const end = i + bestLen;
        for (; i < end; i++) if (i + 2 < n) insert(i);
      } else {
        lit(src[i]);
        if (i + 2 < n) insert(i);
        i++;
      }
    }
    ensure(8);
    lit(256); // end of block
    if (bitCnt > 0) out[pos++] = bitBuf & 0xff;
    return out.subarray(0, pos);
  }

  // ---------- ZIP container ----------
  function dosDateTime(d) {
    const y = Math.max(1980, d.getFullYear());
    return {
      time: ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff,
      date: (((y - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff,
    };
  }
  const COMPRESSED_EXT = /\.(png|jpe?g|gif|zip|gz|docx|xlsx|pptx|webp|mp4|mp3)$/i;

  /**
   * @param {Array<[string, Uint8Array|string]>} files
   * @param {{store?: boolean, date?: Date}} [opts]
   * @returns {Uint8Array}
   */
  function zip(files, opts) {
    opts = opts || {};
    const when = dosDateTime(opts.date instanceof Date ? opts.date : new Date());
    const seen = new Set();
    const entries = [];
    let total = 0;
    for (const f of files || []) {
      if (!f) continue;
      let name = String(f[0] == null ? '' : f[0]).replace(/\\/g, '/').replace(/^\/+/, '');
      if (!name) continue;
      if (seen.has(name)) throw new Error('Duplicate file in ZIP: ' + name);
      seen.add(name);
      const raw = toBytes(f[1]);
      const crc = crc32(raw);
      let method = 0;
      let data = raw;
      if (!opts.store && raw.length > 64 && !COMPRESSED_EXT.test(name)) {
        const def = deflateRaw(raw);
        if (def.length < raw.length) {
          method = 8;
          data = def;
        }
      }
      const nameBytes = utf8(name);
      entries.push({ nameBytes, crc, method, data, size: raw.length, offset: 0 });
      total += 30 + nameBytes.length + data.length + 46 + nameBytes.length;
    }
    total += 22;
    if (entries.length > 0xffff || total > 0xfffffff0) throw new Error('ZIP too large');

    const buf = new Uint8Array(total);
    const dv = new DataView(buf.buffer);
    let p = 0;
    const u16 = (v) => {
      dv.setUint16(p, v, true);
      p += 2;
    };
    const u32 = (v) => {
      dv.setUint32(p, v >>> 0, true);
      p += 4;
    };
    const FLAGS = 0x0800; // UTF-8 names
    for (const e of entries) {
      e.offset = p;
      u32(0x04034b50);
      u16(20); // version needed: 2.0
      u16(FLAGS);
      u16(e.method);
      u16(when.time);
      u16(when.date);
      u32(e.crc);
      u32(e.data.length);
      u32(e.size);
      u16(e.nameBytes.length);
      u16(0); // extra length
      buf.set(e.nameBytes, p);
      p += e.nameBytes.length;
      buf.set(e.data, p);
      p += e.data.length;
    }
    const cdStart = p;
    for (const e of entries) {
      u32(0x02014b50);
      u16(20); // version made by (MS-DOS, 2.0)
      u16(20); // version needed
      u16(FLAGS);
      u16(e.method);
      u16(when.time);
      u16(when.date);
      u32(e.crc);
      u32(e.data.length);
      u32(e.size);
      u16(e.nameBytes.length);
      u16(0); // extra
      u16(0); // comment
      u16(0); // disk number start
      u16(0); // internal attributes
      u32(0); // external attributes
      u32(e.offset);
      buf.set(e.nameBytes, p);
      p += e.nameBytes.length;
    }
    const cdSize = p - cdStart;
    u32(0x06054b50);
    u16(0); // this disk
    u16(0); // disk with central directory
    u16(entries.length);
    u16(entries.length);
    u32(cdSize);
    u32(cdStart);
    u16(0); // comment length
    return p === buf.length ? buf : buf.subarray(0, p);
  }

  root.PMZip = { zip, crc32, utf8, deflateRaw };
})(typeof window !== 'undefined' ? window : globalThis);
