/* PM Steps Workbook: Word (.docx) writer.
 *
 *   PMDocx.build(blocks, {title, author}) -> Uint8Array
 *
 * Turns the neutral block list from PM.export.model() (see docs/EXPORT-MODEL.md) into a WordprocessingML
 * package: A4 pages with 2 cm margins, Calibri 10 pt, teal headings with outline levels (so the
 * table of contents works), tables with a repeated shaded header row, inline PNG graphics scaled to the
 * text width, bullet and numbered lists, a real TOC field, portrait/landscape sections, the project
 * title in the header and "Page X of Y" in the footer. Needs js/zip.js (window.PMZip).
 */
(function (root) {
  'use strict';

  const NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const NS_WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing';
  const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
  const NS_PIC = 'http://schemas.openxmlformats.org/drawingml/2006/picture';
  const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

  // Page geometry in twips (dxa). A4, 2 cm margins.
  const PAGE = { portrait: { w: 11906, h: 16838 }, landscape: { w: 16838, h: 11906 } };
  const MAR = { top: 1134, right: 1134, bottom: 1134, left: 1134, header: 567, footer: 567 };
  const EMU_PER_DXA = 635;
  const textWidth = (o) => PAGE[o].w - MAR.left - MAR.right;
  const textHeight = (o) => PAGE[o].h - MAR.top - MAR.bottom;

  const C = {
    teal: '0B6E63',
    ink: '1F2A2E',
    ink2: '33474B',
    muted: '5B6B70',
    line: 'B4C2C0',
    lineStrong: '7F9C98',
    head: 'DCEEEB',
    kv: 'EEF3F2',
    foot: 'EEF2F1',
    note: 'A9D4CE',
  };
  const FONT = 'Calibri';
  const MONO = 'Consolas';
  const SYMBOL = 'Segoe UI Symbol';
  // Symbols Calibri does not carry (check boxes, ticks, crosses, geometric shapes): give them a symbol font.
  const SYM_SPLIT = /([⌀-⏿■-➿⬀-⯿]+)/;

  // ---------- text and XML escaping ----------
  /** Normalise line ends; strip characters XML 1.0 or Word cannot hold (C0/C1 controls, lone surrogates, U+FFFE/F). */
  function clean(s) {
    if (s == null) return '';
    return String(s)
      .replace(/\r\n?/g, '\n')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F￾￿]/g, '')
      .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
      .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');
  }
  function escText(s) {
    return clean(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escAttr(s) {
    return clean(s)
      .replace(/[\t\n]/g, ' ')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  const attrs = (o) =>
    Object.keys(o)
      .filter((k) => o[k] != null)
      .map((k) => ' w:' + k + '="' + o[k] + '"')
      .join('');

  // ---------- runs ----------
  /** Run properties in schema order (rStyle, rFonts, b, bCs, i, iCs, color, sz, szCs). */
  function rPr(o) {
    o = o || {};
    let x = '';
    const font = o.font || (o.mono ? MONO : null);
    if (font) x += '<w:rFonts w:ascii="' + font + '" w:hAnsi="' + font + '" w:eastAsia="' + font + '" w:cs="' + font + '"/>';
    if (o.bold) x += '<w:b/><w:bCs/>';
    if (o.italic) x += '<w:i/><w:iCs/>';
    if (o.color) x += '<w:color w:val="' + o.color + '"/>';
    if (o.size) x += '<w:sz w:val="' + o.size + '"/><w:szCs w:val="' + o.size + '"/>';
    return x ? '<w:rPr>' + x + '</w:rPr>' : '';
  }
  function runBody(s) {
    let x = '';
    for (const seg of s.split(/(\n|\t)/)) {
      if (seg === '\n') x += '<w:br/>';
      else if (seg === '\t') x += '<w:tab/>';
      else if (seg) x += '<w:t xml:space="preserve">' + escText(seg) + '</w:t>';
    }
    return x;
  }
  /** One or more runs for a piece of text; \n becomes a line break, \t a tab. */
  function run(text, o) {
    text = clean(text);
    if (!text) return '';
    let out = '';
    text.split(SYM_SPLIT).forEach((part, i) => {
      if (!part) return;
      const props = i % 2 ? Object.assign({}, o, { font: SYMBOL }) : o;
      out += '<w:r>' + rPr(props) + runBody(part) + '</w:r>';
    });
    return out;
  }
  function field(instr, cached, o) {
    return (
      '<w:r>' + rPr(o) + '<w:fldChar w:fldCharType="begin"/></w:r>' +
      '<w:r>' + rPr(o) + '<w:instrText xml:space="preserve"> ' + escText(instr) + ' </w:instrText></w:r>' +
      '<w:r>' + rPr(o) + '<w:fldChar w:fldCharType="separate"/></w:r>' +
      '<w:r>' + rPr(o) + '<w:t>' + escText(cached) + '</w:t></w:r>' +
      '<w:r>' + rPr(o) + '<w:fldChar w:fldCharType="end"/></w:r>'
    );
  }

  // ---------- paragraphs ----------
  /** Paragraph properties in schema order. */
  function pPr(o) {
    o = o || {};
    let x = '';
    if (o.style) x += '<w:pStyle w:val="' + o.style + '"/>';
    if (o.keepNext) x += '<w:keepNext/>';
    if (o.keepLines) x += '<w:keepLines/>';
    if (o.pageBreakBefore) x += '<w:pageBreakBefore/>';
    if (o.numId) x += '<w:numPr><w:ilvl w:val="' + (o.ilvl || 0) + '"/><w:numId w:val="' + o.numId + '"/></w:numPr>';
    if (o.border) x += '<w:pBdr>' + o.border + '</w:pBdr>';
    if (o.tabs) x += '<w:tabs>' + o.tabs.map((t) => '<w:tab w:val="' + (t.val || 'left') + '" w:pos="' + t.pos + '"/>').join('') + '</w:tabs>';
    if (o.spacing) x += '<w:spacing' + attrs(o.spacing) + '/>';
    if (o.ind) x += '<w:ind' + attrs(o.ind) + '/>';
    if (o.jc) x += '<w:jc w:val="' + o.jc + '"/>';
    if (o.markSize) x += '<w:rPr><w:sz w:val="' + o.markSize + '"/><w:szCs w:val="' + o.markSize + '"/></w:rPr>';
    return x;
  }
  const serP = (p) => '<w:p>' + (p.ppr || p.sect ? '<w:pPr>' + p.ppr + (p.sect || '') + '</w:pPr>' : '') + p.body + '</w:p>';

  // ---------- helpers ----------
  function toBytes(v) {
    if (!v) return null;
    if (v instanceof Uint8Array) return v;
    if (v instanceof ArrayBuffer) return new Uint8Array(v);
    if (ArrayBuffer.isView(v)) return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
    if (Array.isArray(v)) return Uint8Array.from(v);
    if (typeof v === 'object' && typeof v.length === 'number') return Uint8Array.from(Array.from(v));
    return null;
  }
  const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];
  function pngSize(b) {
    if (!b || b.length < 24) return null;
    for (let i = 0; i < 8; i++) if (b[i] !== PNG_SIG[i]) return null;
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return { w: dv.getUint32(16), h: dv.getUint32(20) };
  }
  /** Split `total` twips over relative weights; every column at least `min`; the sum is exact. */
  function distribute(total, weights, min) {
    const n = weights.length;
    min = Math.min(min, Math.floor(total / n));
    const fixed = new Array(n).fill(false);
    let ws = [];
    for (let pass = 0; pass < n; pass++) {
      const freeW = weights.reduce((s, w, i) => s + (fixed[i] ? 0 : w), 0);
      const freeT = total - fixed.reduce((s, f) => s + (f ? min : 0), 0);
      ws = weights.map((w, i) => (fixed[i] ? min : (freeT * w) / (freeW || 1)));
      let changed = false;
      ws.forEach((w, i) => {
        if (!fixed[i] && w < min) {
          fixed[i] = true;
          changed = true;
        }
      });
      if (!changed) break;
    }
    ws = ws.map((w) => Math.floor(w));
    const rest = total - ws.reduce((s, w) => s + w, 0);
    let big = 0;
    ws.forEach((w, i) => {
      if (w > ws[big]) big = i;
    });
    ws[big] += rest;
    return ws;
  }
  const isoNow = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

  // =====================================================================================
  // build
  // =====================================================================================
  function build(blocks, opts) {
    if (!root.PMZip) throw new Error('PMZip is missing (load js/zip.js first)');
    opts = opts || {};
    blocks = Array.isArray(blocks) ? blocks.filter(Boolean) : [];
    const title = clean(opts.title || '').trim() || 'Project management file';
    const author = clean(opts.author || '').trim();

    const body = []; // {t:'p', ppr, body, sect} | {t:'tbl', xml}
    const images = []; // {rid, path, bytes}
    const nums = []; // abstractNum id per numId (numId = index + 1)
    let orient = 'portrait';
    let pendingOrient = null;
    let pendingBreak = false;
    let atPageTop = true;
    let sectionHasContent = false;
    let sections = 0;
    let lastTable = false;
    let drawingId = 0;
    let figureNo = 0;
    let bookmarkId = 0;

    // Bookmarks for h1/h2 so the cached TOC entries link to their headings.
    const tocEntries = [];
    const bmOf = new Map();
    blocks.forEach((b, i) => {
      if ((b.type === 'h1' || b.type === 'h2') && clean(b.text).trim()) {
        const bm = '_TocPM' + String(i).padStart(5, '0');
        bmOf.set(i, bm);
        tocEntries.push({ level: b.type === 'h1' ? 1 : 2, text: clean(b.text).replace(/\s+/g, ' ').trim(), bm });
      }
    });

    function sectPr(o, first) {
      const pg = PAGE[o];
      let x = '<w:sectPr>';
      x += '<w:headerReference w:type="default" r:id="' + (o === 'landscape' ? 'rIdHdrL' : 'rIdHdrP') + '"/>';
      if (first) x += '<w:headerReference w:type="first" r:id="rIdHdrFirst"/>';
      x += '<w:footerReference w:type="default" r:id="rIdFtr"/>';
      if (first) x += '<w:footerReference w:type="first" r:id="rIdFtr"/>';
      x += '<w:pgSz w:w="' + pg.w + '" w:h="' + pg.h + '"' + (o === 'landscape' ? ' w:orient="landscape"' : '') + '/>';
      x += '<w:pgMar w:top="' + MAR.top + '" w:right="' + MAR.right + '" w:bottom="' + MAR.bottom + '" w:left="' + MAR.left + '" w:header="' + MAR.header + '" w:footer="' + MAR.footer + '" w:gutter="0"/>';
      x += '<w:cols w:space="708"/>';
      if (first) x += '<w:titlePg/>';
      x += '<w:docGrid w:linePitch="360"/>';
      return x + '</w:sectPr>';
    }
    const TINY = { spacing: { before: 0, after: 0, line: 20, lineRule: 'exact' }, markSize: 2 };
    function closeSection() {
      const sp = sectPr(orient, sections === 0);
      sections++;
      const last = body[body.length - 1];
      if (last && last.t === 'p' && !last.sect) last.sect = sp;
      else body.push({ t: 'p', ppr: pPr(TINY), body: '', sect: sp });
    }
    /** Apply pending orientation changes and page breaks before the next piece of content. */
    function beforeContent(isPara) {
      if (pendingOrient && pendingOrient !== orient) {
        if (sectionHasContent) {
          closeSection();
          pendingBreak = false;
        }
        orient = pendingOrient;
        sectionHasContent = false;
      }
      pendingOrient = null;
      let pb = false;
      if (pendingBreak) {
        pendingBreak = false;
        if (isPara) pb = true;
        else body.push({ t: 'p', ppr: pPr(Object.assign({ pageBreakBefore: true }, TINY)), body: '' });
      }
      atPageTop = false;
      sectionHasContent = true;
      return pb;
    }
    function P(o, inner) {
      body.push({ t: 'p', ppr: pPr(o), body: inner || '' });
      lastTable = false;
    }
    function newNum(abs) {
      nums.push(abs);
      return nums.length;
    }

    // ---------- block writers ----------
    function heading(b, i) {
      const level = b.type === 'h1' ? 1 : b.type === 'h2' ? 2 : 3;
      const pb = beforeContent(true);
      const bm = bmOf.get(i);
      let inner = run(b.text);
      if (bm) {
        const id = bookmarkId++;
        inner = '<w:bookmarkStart w:id="' + id + '" w:name="' + bm + '"/>' + inner + '<w:bookmarkEnd w:id="' + id + '"/>';
      }
      P({ style: 'Heading' + level, pageBreakBefore: pb }, inner);
    }
    function paragraph(b) {
      const style = { note: 'Note', caption: 'Caption', small: 'Small' }[b.style] || null;
      const pb = beforeContent(true);
      const inner = Array.isArray(b.runs)
        ? b.runs.map((r) => (r ? run(r.text, { bold: !!r.bold, italic: !!r.italic, mono: !!r.mono }) : '')).join('')
        : run(b.text);
      P({ style, pageBreakBefore: pb, spacing: lastTable ? { before: 160 } : null }, inner);
    }
    const GLYPH = /^([✓✔✗✘☐☑☒•○●–-])\s+/;
    function list(b) {
      const items = (b.items || []).map((t) => clean(t)).filter((t) => t.trim());
      if (!items.length) return;
      const style = { note: 'Note', small: 'Small', caption: 'Caption' }[b.style] || null;
      // Items that already start with a mark (☑ ☐ ✓ ✗ •) are written without a second bullet.
      const plain = !!b.plain || items.every((t) => GLYPH.test(t));
      const numId = plain ? 0 : newNum(b.ordered ? 1 : 0);
      const afterTable = lastTable;
      items.forEach((t, i) => {
        const pb = beforeContent(true);
        const last = i === items.length - 1;
        const spacing = { before: i === 0 && afterTable ? 120 : 0, after: last ? 140 : 40 };
        if (plain) {
          const txt = GLYPH.test(t) ? t.replace(GLYPH, '$1\t') : t;
          P({ style, pageBreakBefore: pb, keepLines: true, tabs: [{ pos: 284 }], spacing, ind: { left: 284, hanging: 284 } }, run(txt));
        } else {
          P({ style, pageBreakBefore: pb, keepLines: true, numId, spacing }, run(t));
        }
      });
    }
    function tocBlock() {
      const pb = beforeContent(true);
      P({ style: 'TOCHeading', pageBreakBefore: pb }, run('Contents'));
      P({ style: 'Note' }, run('To add page numbers in Word, right-click the list and choose Update Field.'));
      const begin =
        '<w:r><w:fldChar w:fldCharType="begin"/></w:r>' +
        '<w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u </w:instrText></w:r>' +
        '<w:r><w:fldChar w:fldCharType="separate"/></w:r>';
      const end = '<w:r><w:fldChar w:fldCharType="end"/></w:r>';
      if (!tocEntries.length) {
        P({ style: 'TOC1' }, begin + run('No headings yet.') + end);
        return;
      }
      tocEntries.forEach((e, i) => {
        let x = i === 0 ? begin : '';
        x += '<w:hyperlink w:anchor="' + e.bm + '" w:history="1">' + run(e.text) + '</w:hyperlink>';
        if (i === tocEntries.length - 1) x += end;
        P({ style: 'TOC' + e.level }, x);
      });
    }
    function pageBreak() {
      if (!atPageTop) pendingBreak = true;
      atPageTop = true;
    }

    function tcell(text, w, o) {
      let tcPr = '<w:tcW w:w="' + w + '" w:type="dxa"/>';
      if (o.topBorder) tcPr += '<w:tcBorders><w:top w:val="single" w:sz="8" w:space="0" w:color="' + C.lineStrong + '"/></w:tcBorders>';
      if (o.fill) tcPr += '<w:shd w:val="clear" w:color="auto" w:fill="' + o.fill + '"/>';
      tcPr += '<w:vAlign w:val="' + (o.vAlign || 'top') + '"/>';
      const jc = o.align === 'right' ? 'right' : o.align === 'center' ? 'center' : null;
      const para = pPr({ style: 'TableText', keepNext: o.keepNext, jc, markSize: o.size });
      return '<w:tc><w:tcPr>' + tcPr + '</w:tcPr><w:p><w:pPr>' + para + '</w:pPr>' + run(text, { bold: o.bold, color: o.color, size: o.size }) + '</w:p></w:tc>';
    }
    function trow(cells, o) {
      let tr = '<w:trPr><w:cantSplit/>';
      if (o.height) tr += '<w:trHeight w:val="' + o.height + '" w:hRule="atLeast"/>';
      if (o.header) tr += '<w:tblHeader/>';
      tr += '</w:trPr>';
      return '<w:tr>' + tr + cells.join('') + '</w:tr>';
    }
    function table(b) {
      const cols = (b.columns || []).filter(Boolean);
      if (!cols.length) return;
      const wasTable = lastTable;
      beforeContent(false);
      if (wasTable) body.push({ t: 'p', ppr: pPr({ spacing: { before: 0, after: 0, line: 160, lineRule: 'exact' }, markSize: 8 }), body: '' });
      const kv = !!b.kv;
      const tw = textWidth(orient);
      const widths = distribute(tw, cols.map((c) => (+c.width > 0 ? +c.width : 1)), 480);
      const size = Math.max(12, Math.min(28, Math.round((+b.fontSize > 0 ? +b.fontSize : 9) * 2)));
      const align = cols.map((c) => c.align || 'left');
      const n = cols.length;
      const fit = (r) => {
        const a = Array.isArray(r) ? r.slice(0, n) : [r];
        while (a.length < n) a.push('');
        return a.map((v) => (v == null ? '' : String(v)));
      };
      const rows = (b.rows || []).map(fit);
      const footer = Array.isArray(b.footer) ? fit(b.footer) : null;
      let emptyRows = Math.max(0, Math.min(200, Math.floor(+b.emptyRows || 0)));
      if (!kv && !rows.length && !emptyRows) emptyRows = 1;
      const total = rows.length + emptyRows + (footer ? 1 : 0);
      const keepAll = total <= 12; // small tables move to the next page as a whole, with their heading
      const border = (side) => '<w:' + side + ' w:val="single" w:sz="4" w:space="0" w:color="' + C.line + '"/>';

      let x = '<w:tbl><w:tblPr>';
      x += '<w:tblW w:w="' + tw + '" w:type="dxa"/>';
      x += '<w:tblInd w:w="0" w:type="dxa"/>';
      x += '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(border).join('') + '</w:tblBorders>';
      x += '<w:tblLayout w:type="fixed"/>';
      x += '<w:tblCellMar><w:top w:w="34" w:type="dxa"/><w:left w:w="85" w:type="dxa"/><w:bottom w:w="34" w:type="dxa"/><w:right w:w="85" w:type="dxa"/></w:tblCellMar>';
      x += '<w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="1" w:noVBand="1"/>';
      x += '</w:tblPr><w:tblGrid>' + widths.map((w) => '<w:gridCol w:w="' + w + '"/>').join('') + '</w:tblGrid>';

      let k = 0;
      const keep = () => keepAll && ++k < total;
      if (!kv) {
        x += trow(
          cols.map((c, j) => tcell(c.label || '', widths[j], { fill: C.head, bold: true, color: C.ink, size, align: align[j], vAlign: 'bottom', keepNext: true })),
          { header: true }
        );
      }
      rows.forEach((cells) => {
        const kn = keep();
        x += trow(
          cells.map((v, j) => (kv && j === 0 ? tcell(v, widths[j], { fill: C.kv, color: C.ink2, size, keepNext: kn }) : tcell(v, widths[j], { size, align: align[j], keepNext: kn }))),
          {}
        );
      });
      for (let e = 0; e < emptyRows; e++) {
        const kn = keep();
        x += trow(cols.map((c, j) => tcell('', widths[j], { size, fill: kv && j === 0 ? C.kv : null, keepNext: kn })), { height: 397 });
      }
      if (footer) {
        x += trow(footer.map((v, j) => tcell(v, widths[j], { fill: C.foot, bold: true, size, align: align[j], topBorder: true })), {});
      }
      x += '</w:tbl>';
      body.push({ t: 'tbl', xml: x });
      lastTable = true;
    }

    function image(b) {
      const png = toBytes(b.png);
      const dim = pngSize(png);
      if (!dim || !dim.w || !dim.h) {
        const pb = beforeContent(true);
        P({ style: 'Note', pageBreakBefore: pb }, run('[Graphic not included' + (b.alt ? ': ' + b.alt : '') + ']'));
        return;
      }
      const pb = beforeContent(true);
      const w = +b.width > 0 ? +b.width : dim.w / 2;
      const h = +b.height > 0 ? +b.height : dim.h / 2;
      const maxW = textWidth(orient) * EMU_PER_DXA;
      const maxH = textHeight(orient) * EMU_PER_DXA * 0.78;
      let cx = maxW;
      let cy = (maxW * h) / w;
      if (cy > maxH) {
        cx = (cx * maxH) / cy;
        cy = maxH;
      }
      cx = Math.round(cx);
      cy = Math.round(cy);
      const n = images.length + 1;
      const rid = 'rIdImg' + n;
      images.push({ rid, path: 'media/image' + n + '.png', bytes: png });
      const id = ++drawingId;
      const descr = escAttr(b.alt || b.caption || '');
      const drawing =
        '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">' +
        '<wp:extent cx="' + cx + '" cy="' + cy + '"/>' +
        '<wp:effectExtent l="0" t="0" r="0" b="0"/>' +
        '<wp:docPr id="' + id + '" name="Graphic ' + id + '" descr="' + descr + '"/>' +
        '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="' + NS_A + '" noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
        '<a:graphic xmlns:a="' + NS_A + '"><a:graphicData uri="' + NS_PIC + '">' +
        '<pic:pic xmlns:pic="' + NS_PIC + '">' +
        '<pic:nvPicPr><pic:cNvPr id="' + id + '" name="image' + n + '.png" descr="' + descr + '"/><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr>' +
        '<pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
        '<pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
        '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
      P({ keepNext: true, pageBreakBefore: pb, spacing: { before: lastTable ? 160 : 60, after: 60, line: 240, lineRule: 'auto' }, jc: 'center' }, drawing);
      figureNo++;
      const text = clean(b.caption || b.alt || '').trim();
      P({ style: 'Caption' }, run('Figure ') + field('SEQ Figure \\* ARABIC', String(figureNo)) + (text ? run(': ' + text) : ''));
    }

    // ---------- walk the blocks ----------
    blocks.forEach((b, i) => {
      switch (b.type) {
        case 'title':
          P({ style: 'Title', pageBreakBefore: beforeContent(true) }, run(b.text));
          break;
        case 'subtitle':
          P({ style: 'Subtitle', pageBreakBefore: beforeContent(true) }, run(b.text));
          break;
        case 'h1':
        case 'h2':
        case 'h3':
          heading(b, i);
          break;
        case 'p':
          paragraph(b);
          break;
        case 'bullets':
          list(b);
          break;
        case 'table':
          table(b);
          break;
        case 'image':
          image(b);
          break;
        case 'pagebreak':
          pageBreak();
          break;
        case 'toc':
          tocBlock();
          break;
        case 'orientation':
          if (b.value === 'landscape' || b.value === 'portrait') pendingOrient = b.value;
          break;
        default:
          if (b.text != null && String(b.text).trim()) paragraph({ type: 'p', text: b.text });
      }
    });
    const lastItem = body[body.length - 1];
    if (!lastItem || lastItem.t !== 'p') body.push({ t: 'p', ppr: pPr(TINY), body: '' });

    const documentXml =
      HEAD +
      '<w:document xmlns:w="' + NS_W + '" xmlns:r="' + NS_R + '" xmlns:wp="' + NS_WP + '"><w:body>' +
      body.map((it) => (it.t === 'p' ? serP(it) : it.xml)).join('') +
      sectPr(orient, sections === 0) +
      '</w:body></w:document>';

    // ---------- parts ----------
    const files = [];
    const imgRels = images.map((im) => '<Relationship Id="' + im.rid + '" Type="' + REL + '/image" Target="' + im.path + '"/>').join('');
    const hdrFtrOverrides = ['header1', 'header2', 'header3'].map((p) => '<Override PartName="/word/' + p + '.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>').join('');
    files.push([
      '[Content_Types].xml',
      HEAD +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Default Extension="png" ContentType="image/png"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
        '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' +
        '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>' +
        hdrFtrOverrides +
        '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' +
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
        '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
        '</Types>',
    ]);
    files.push([
      '_rels/.rels',
      HEAD +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="' + REL + '/officeDocument" Target="word/document.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
        '<Relationship Id="rId3" Type="' + REL + '/extended-properties" Target="docProps/app.xml"/>' +
        '</Relationships>',
    ]);
    const now = isoNow();
    files.push([
      'docProps/core.xml',
      HEAD +
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        '<dc:title>' + escText(title) + '</dc:title>' +
        '<dc:subject>Project management file</dc:subject>' +
        '<dc:creator>' + escText(author) + '</dc:creator>' +
        '<cp:lastModifiedBy>' + escText(author) + '</cp:lastModifiedBy>' +
        '<dcterms:created xsi:type="dcterms:W3CDTF">' + now + '</dcterms:created>' +
        '<dcterms:modified xsi:type="dcterms:W3CDTF">' + now + '</dcterms:modified>' +
        '</cp:coreProperties>',
    ]);
    files.push([
      'docProps/app.xml',
      HEAD +
        '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
        '<Application>PM Steps Workbook</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop>' +
        '<LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>1.0000</AppVersion>' +
        '</Properties>',
    ]);
    files.push(['word/document.xml', documentXml]);
    files.push([
      'word/_rels/document.xml.rels',
      HEAD +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rIdStyles" Type="' + REL + '/styles" Target="styles.xml"/>' +
        '<Relationship Id="rIdNumbering" Type="' + REL + '/numbering" Target="numbering.xml"/>' +
        '<Relationship Id="rIdSettings" Type="' + REL + '/settings" Target="settings.xml"/>' +
        '<Relationship Id="rIdHdrP" Type="' + REL + '/header" Target="header1.xml"/>' +
        '<Relationship Id="rIdHdrL" Type="' + REL + '/header" Target="header2.xml"/>' +
        '<Relationship Id="rIdHdrFirst" Type="' + REL + '/header" Target="header3.xml"/>' +
        '<Relationship Id="rIdFtr" Type="' + REL + '/footer" Target="footer1.xml"/>' +
        imgRels +
        '</Relationships>',
    ]);
    files.push(['word/styles.xml', stylesXml()]);
    files.push(['word/numbering.xml', numberingXml(nums)]);
    files.push(['word/settings.xml', settingsXml()]);
    const hdrTitle = truncate(title.replace(/\s+/g, ' '), 80);
    files.push(['word/header1.xml', headerXml(hdrTitle, textWidth('portrait'))]);
    files.push(['word/header2.xml', headerXml(hdrTitle, textWidth('landscape'))]);
    files.push(['word/header3.xml', hdrFtr('hdr', '<w:p><w:pPr><w:pStyle w:val="Header"/></w:pPr></w:p>')]);
    files.push(['word/footer1.xml', footerXml()]);
    images.forEach((im) => files.push(['word/' + im.path, im.bytes]));
    return root.PMZip.zip(files);
  }

  // ---------- fixed parts ----------
  function hdrFtr(tag, inner) {
    return HEAD + '<w:' + tag + ' xmlns:w="' + NS_W + '" xmlns:r="' + NS_R + '">' + inner + '</w:' + tag + '>';
  }
  function headerXml(title, width) {
    return hdrFtr(
      'hdr',
      '<w:p><w:pPr>' +
        pPr({ style: 'Header', border: '<w:bottom w:val="single" w:sz="4" w:space="4" w:color="' + C.line + '"/>', tabs: [{ val: 'right', pos: width }] }) +
        '</w:pPr>' + run(title, { bold: true, color: C.teal }) + run('\tProject management file') + '</w:p>'
    );
  }
  function footerXml() {
    return hdrFtr(
      'ftr',
      '<w:p><w:pPr>' + pPr({ style: 'Footer', jc: 'center' }) + '</w:pPr>' + run('Page ') + field('PAGE', '1') + run(' of ') + field('NUMPAGES', '1') + '</w:p>'
    );
  }
  function settingsXml() {
    return (
      HEAD +
      '<w:settings xmlns:w="' + NS_W + '" xmlns:r="' + NS_R + '">' +
      '<w:zoom w:percent="100"/>' +
      '<w:defaultTabStop w:val="709"/>' +
      '<w:characterSpacingControl w:val="doNotCompress"/>' +
      '<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat>' +
      '</w:settings>'
    );
  }
  function numberingXml(nums) {
    const lvl = (ilvl, fmt, text, left, hanging, color) =>
      '<w:lvl w:ilvl="' + ilvl + '"><w:start w:val="1"/><w:numFmt w:val="' + fmt + '"/><w:lvlText w:val="' + text + '"/><w:lvlJc w:val="left"/>' +
      '<w:pPr><w:ind w:left="' + left + '" w:hanging="' + hanging + '"/></w:pPr>' +
      (color ? '<w:rPr><w:color w:val="' + color + '"/></w:rPr>' : '') +
      '</w:lvl>';
    const bullet =
      '<w:abstractNum w:abstractNumId="0"><w:nsid w:val="2F6B1A01"/><w:multiLevelType w:val="hybridMultilevel"/>' +
      lvl(0, 'bullet', '•', 284, 227, C.teal) + lvl(1, 'bullet', '–', 568, 227, C.teal) + lvl(2, 'bullet', '•', 852, 227, C.teal) +
      '</w:abstractNum>';
    const decimal =
      '<w:abstractNum w:abstractNumId="1"><w:nsid w:val="2F6B1A02"/><w:multiLevelType w:val="hybridMultilevel"/>' +
      lvl(0, 'decimal', '%1.', 357, 357) + lvl(1, 'lowerLetter', '%2)', 714, 357) + lvl(2, 'lowerRoman', '%3.', 1071, 357) +
      '</w:abstractNum>';
    const list = nums.length ? nums : [0];
    const numXml = list
      .map((abs, i) => '<w:num w:numId="' + (i + 1) + '"><w:abstractNumId w:val="' + abs + '"/>' + (abs === 1 ? '<w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride>' : '') + '</w:num>')
      .join('');
    return HEAD + '<w:numbering xmlns:w="' + NS_W + '">' + bullet + decimal + numXml + '</w:numbering>';
  }
  function stylesXml() {
    const pstyle = (id, name, o) => {
      let x = '<w:style w:type="paragraph"' + (o.isDefault ? ' w:default="1"' : '') + (o.custom ? ' w:customStyle="1"' : '') + ' w:styleId="' + id + '">';
      x += '<w:name w:val="' + name + '"/>';
      if (o.basedOn) x += '<w:basedOn w:val="' + o.basedOn + '"/>';
      if (o.next) x += '<w:next w:val="' + o.next + '"/>';
      if (o.ui != null) x += '<w:uiPriority w:val="' + o.ui + '"/>';
      if (o.hidden) x += '<w:semiHidden/><w:unhideWhenUsed/>';
      if (o.q) x += '<w:qFormat/>';
      let pp = '';
      if (o.keepNext) pp += '<w:keepNext/>';
      if (o.keepLines) pp += '<w:keepLines/>';
      if (o.border) pp += '<w:pBdr>' + o.border + '</w:pBdr>';
      if (o.spacing) pp += '<w:spacing' + attrs(o.spacing) + '/>';
      if (o.ind) pp += '<w:ind' + attrs(o.ind) + '/>';
      if (o.contextual) pp += '<w:contextualSpacing/>';
      if (o.outline != null) pp += '<w:outlineLvl w:val="' + o.outline + '"/>';
      if (pp) x += '<w:pPr>' + pp + '</w:pPr>';
      const rp = rPr({ bold: o.bold, italic: o.italic, color: o.color, size: o.size, font: o.font });
      return x + rp + '</w:style>';
    };
    return (
      HEAD +
      '<w:styles xmlns:w="' + NS_W + '" xmlns:r="' + NS_R + '">' +
      '<w:docDefaults><w:rPrDefault><w:rPr>' +
      '<w:rFonts w:ascii="' + FONT + '" w:hAnsi="' + FONT + '" w:eastAsia="' + FONT + '" w:cs="' + FONT + '"/>' +
      '<w:color w:val="' + C.ink + '"/><w:sz w:val="20"/><w:szCs w:val="20"/>' +
      '</w:rPr></w:rPrDefault>' +
      '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
      pstyle('Normal', 'Normal', { isDefault: true, q: true }) +
      '<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/><w:unhideWhenUsed/></w:style>' +
      '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/>' +
      '<w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>' +
      '<w:style w:type="numbering" w:default="1" w:styleId="NoList"><w:name w:val="No List"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/></w:style>' +
      pstyle('Title', 'Title', { basedOn: 'Normal', next: 'Subtitle', ui: 10, q: true, spacing: { before: 720, after: 80, line: 240, lineRule: 'auto' }, bold: true, color: C.teal, size: 52 }) +
      pstyle('Subtitle', 'Subtitle', { basedOn: 'Normal', next: 'Normal', ui: 11, q: true, spacing: { after: 360 }, color: C.muted, size: 26 }) +
      pstyle('Heading1', 'heading 1', {
        basedOn: 'Normal', next: 'Normal', ui: 9, q: true, keepNext: true, keepLines: true,
        border: '<w:bottom w:val="single" w:sz="8" w:space="4" w:color="' + C.teal + '"/>',
        spacing: { before: 240, after: 200, line: 240, lineRule: 'auto' }, outline: 0, bold: true, color: C.teal, size: 32,
      }) +
      pstyle('Heading2', 'heading 2', { basedOn: 'Normal', next: 'Normal', ui: 9, q: true, hidden: true, keepNext: true, keepLines: true, spacing: { before: 320, after: 100, line: 240, lineRule: 'auto' }, outline: 1, bold: true, color: C.teal, size: 26 }) +
      pstyle('Heading3', 'heading 3', { basedOn: 'Normal', next: 'Normal', ui: 9, q: true, hidden: true, keepNext: true, keepLines: true, spacing: { before: 240, after: 80, line: 240, lineRule: 'auto' }, outline: 2, bold: true, color: C.ink, size: 21 }) +
      pstyle('Caption', 'caption', { basedOn: 'Normal', next: 'Normal', ui: 35, q: true, hidden: true, spacing: { before: 40, after: 240 }, italic: true, color: C.muted, size: 17 }) +
      pstyle('Note', 'Note', {
        custom: true, basedOn: 'Normal', next: 'Normal', q: true,
        border: '<w:left w:val="single" w:sz="12" w:space="6" w:color="' + C.note + '"/>',
        spacing: { after: 100 }, ind: { left: 170 }, color: C.muted, size: 18,
      }) +
      pstyle('Small', 'Small', { custom: true, basedOn: 'Normal', next: 'Normal', q: true, color: C.muted, size: 16 }) +
      pstyle('TableText', 'Table Text', { custom: true, basedOn: 'Normal', q: true, spacing: { before: 0, after: 0, line: 240, lineRule: 'auto' }, size: 18 }) +
      pstyle('TOCHeading', 'TOC Heading', { basedOn: 'Normal', next: 'Normal', ui: 39, q: true, hidden: true, keepNext: true, spacing: { before: 360, after: 120 }, bold: true, color: C.teal, size: 28 }) +
      pstyle('TOC1', 'toc 1', { basedOn: 'Normal', next: 'Normal', ui: 39, hidden: true, spacing: { before: 80, after: 20 }, bold: true }) +
      pstyle('TOC2', 'toc 2', { basedOn: 'Normal', next: 'Normal', ui: 39, hidden: true, spacing: { after: 20 }, ind: { left: 284 } }) +
      pstyle('TOC3', 'toc 3', { basedOn: 'Normal', next: 'Normal', ui: 39, hidden: true, spacing: { after: 20 }, ind: { left: 568 }, color: C.ink2 }) +
      pstyle('Header', 'header', { basedOn: 'Normal', ui: 99, hidden: true, spacing: { after: 0, line: 240, lineRule: 'auto' }, color: C.muted, size: 16 }) +
      pstyle('Footer', 'footer', { basedOn: 'Normal', ui: 99, hidden: true, spacing: { after: 0, line: 240, lineRule: 'auto' }, color: C.muted, size: 16 }) +
      '</w:styles>'
    );
  }

  root.PMDocx = { build, clean, escText, escAttr, distribute };
})(typeof window !== 'undefined' ? window : globalThis);
