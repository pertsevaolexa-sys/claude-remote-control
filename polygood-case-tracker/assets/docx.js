/* Minimal .docx writer for case study exports. No dependencies; runs in the browser and
 * in Node (scripts/test.mjs).
 *
 *   PCTDocx.build(blocks, { title }) -> Uint8Array holding a .docx file
 *
 * A block is { type, text } or { type, runs: [{ text, bold, italic, link }] }, where type
 * is "title", "subtitle", "h1", "h2", "meta" or "p". Set pageBreak: true to start the
 * block on a new page. "\n" inside text becomes a line break.
 */
(function () {
  "use strict";
  const enc = new TextEncoder();

  // ---------- zip (stored entries; Word and Google Docs read these fine) ----------
  const CRC_TABLE = (() => {
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
  function zip(files, when) {
    const time = (when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1);
    const date = ((Math.max(1980, when.getFullYear()) - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate();
    const parts = [], central = [];
    let offset = 0;
    for (const [name, text] of files) {
      const nameBytes = enc.encode(name), data = enc.encode(text), crc = crc32(data);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, 0x0800, true); // UTF-8 file names
      local.setUint16(8, 0, true); // stored
      local.setUint16(10, time, true);
      local.setUint16(12, date, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, data.length, true);
      local.setUint32(22, data.length, true);
      local.setUint16(26, nameBytes.length, true);
      parts.push(new Uint8Array(local.buffer), nameBytes, data);
      const head = new DataView(new ArrayBuffer(46));
      head.setUint32(0, 0x02014b50, true);
      head.setUint16(4, 20, true);
      head.setUint16(6, 20, true);
      head.setUint16(8, 0x0800, true);
      head.setUint16(10, 0, true);
      head.setUint16(12, time, true);
      head.setUint16(14, date, true);
      head.setUint32(16, crc, true);
      head.setUint32(20, data.length, true);
      head.setUint32(24, data.length, true);
      head.setUint16(28, nameBytes.length, true);
      head.setUint32(42, offset, true);
      central.push(new Uint8Array(head.buffer), nameBytes);
      offset += 30 + nameBytes.length + data.length;
    }
    const size = central.reduce((n, c) => n + c.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, size, true);
    end.setUint32(16, offset, true);
    const all = [...parts, ...central, new Uint8Array(end.buffer)];
    const out = new Uint8Array(all.reduce((n, c) => n + c.length, 0));
    let p = 0;
    for (const c of all) { out.set(c, p); p += c.length; }
    return out;
  }

  // ---------- WordprocessingML ----------
  // Drop characters XML 1.0 can't hold, then escape.
  const x = (s) => String(s == null ? "" : s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const STYLE_OF = { title: "Title", subtitle: "Subtitle", h1: "Heading1", h2: "Heading2", meta: "Meta" };

  function textXml(text) {
    return String(text == null ? "" : text).split("\n").map((line, i) =>
      (i ? "<w:br/>" : "") + line.split("\t").map((seg, j) =>
        (j ? "<w:tab/>" : "") + (seg ? `<w:t xml:space="preserve">${x(seg)}</w:t>` : "")).join("")).join("");
  }
  function runXml(run, links) {
    const props = [];
    if (run.bold) props.push("<w:b/>");
    if (run.italic) props.push("<w:i/>");
    const link = typeof run.link === "string" && /^https?:\/\//i.test(run.link) ? run.link : "";
    if (link) props.push('<w:color w:val="2E4B8C"/>', '<w:u w:val="single"/>');
    const r = `<w:r>${props.length ? `<w:rPr>${props.join("")}</w:rPr>` : ""}${textXml(run.text)}</w:r>`;
    if (!link) return r;
    links.push(link);
    return `<w:hyperlink r:id="rIdL${links.length}">${r}</w:hyperlink>`;
  }
  function paraXml(block, links) {
    const pPr = [];
    if (STYLE_OF[block.type]) pPr.push(`<w:pStyle w:val="${STYLE_OF[block.type]}"/>`);
    if (block.pageBreak) pPr.push("<w:pageBreakBefore/>");
    const runs = Array.isArray(block.runs) ? block.runs : [{ text: block.text }];
    return `<w:p>${pPr.length ? `<w:pPr>${pPr.join("")}</w:pPr>` : ""}${runs.map((r) => runXml(r, links)).join("")}</w:p>`;
  }

  const STYLES = HEAD + `<w:styles ${W}>
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-GB"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="80"/></w:pPr><w:rPr><w:b/><w:sz w:val="48"/><w:szCs w:val="48"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="200"/></w:pPr><w:rPr><w:color w:val="5B6560"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:caps/><w:color w:val="5B6560"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>
<w:style w:type="paragraph" w:customStyle="1" w:styleId="Meta"><w:name w:val="Meta"/><w:basedOn w:val="Normal"/><w:qFormat/><w:rPr><w:color w:val="5B6560"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:style>
</w:styles>`;

  function build(blocks, opts = {}) {
    const when = opts.date instanceof Date ? opts.date : new Date();
    const links = [];
    const body = (blocks || []).map((b) => paraXml(b, links)).join("\n");
    const doc = HEAD + `<w:document ${W} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>
${body}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>
</w:body></w:document>`;
    const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    const docRels = HEAD + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rIdStyles" Type="${REL}/styles" Target="styles.xml"/>
${links.map((l, i) => `<Relationship Id="rIdL${i + 1}" Type="${REL}/hyperlink" Target="${x(l)}" TargetMode="External"/>`).join("\n")}
</Relationships>`;
    return zip([
      ["[Content_Types].xml", HEAD + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`],
      ["_rels/.rels", HEAD + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="${REL}/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`],
      ["docProps/core.xml", HEAD + `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${x(opts.title || "Polygood case study")}</dc:title><dc:creator>Polygood Case Tracker</dc:creator>
<dcterms:created xsi:type="dcterms:W3CDTF">${when.toISOString().replace(/\.\d+Z$/, "Z")}</dcterms:created>
</cp:coreProperties>`],
      ["word/document.xml", doc],
      ["word/styles.xml", STYLES],
      ["word/_rels/document.xml.rels", docRels],
    ], when);
  }

  globalThis.PCTDocx = { build, crc32 };
})();
