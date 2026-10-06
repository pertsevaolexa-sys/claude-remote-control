/* PM Steps Workbook: Excel (.xlsx) writer.
 *
 *   PMXlsx.build(sheets, {title}) -> Uint8Array
 *
 * sheets: [{name, title, columns: [{label, width, kind}], rows: [[value]], totals: [value] | null}]
 * (see docs/EXPORT-MODEL.md). One worksheet per sheet: the title in row 1, a bold shaded header in
 * row 2 that stays frozen, typed cells (numbers, money, percent, real dates) and a bold totals row.
 * Strings are inline strings, so there is no shared string table to keep in step. Needs js/zip.js.
 */
(function (root) {
  'use strict';

  const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

  // Cell style ids (indexes into cellXfs below)
  const ST = { title: 1, head: 2, text: 3, number: 4, money: 5, percent: 6, date: 7, totText: 8, totNumber: 9, totMoney: 10, totPercent: 11 };

  function clean(s) {
    // XML 1.0 forbids most control characters; drop them.
    return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '');
  }
  function esc(s) {
    return clean(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function colName(i) {
    let n = i + 1;
    let s = '';
    while (n > 0) {
      const m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }
  /** ISO date (YYYY-MM-DD) to an Excel serial number (1900 date system), or null. */
  function serial(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return null;
    const days = Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000 - Date.UTC(1899, 11, 30) / 86400000;
    return Math.round(days);
  }

  function sheetNames(sheets) {
    const used = new Set();
    return sheets.map((sh, i) => {
      let base = clean(sh.name || 'Sheet ' + (i + 1))
        .replace(/[\[\]:*?/\\]/g, '-')
        .replace(/^'+|'+$/g, '')
        .trim();
      if (!base || base.toLowerCase() === 'history') base = 'Sheet ' + (i + 1);
      let name = base.slice(0, 31).trim();
      let n = 2;
      while (used.has(name.toLowerCase())) {
        const suffix = ' (' + n + ')';
        name = base.slice(0, 31 - suffix.length).trim() + suffix;
        n += 1;
      }
      used.add(name.toLowerCase());
      return name;
    });
  }

  function strCell(ref, v, style) {
    const t = clean(v).slice(0, 32767);
    return '<c r="' + ref + '" s="' + style + '" t="inlineStr"><is><t xml:space="preserve">' + esc(t) + '</t></is></c>';
  }
  function numCell(ref, v, style) {
    return '<c r="' + ref + '" s="' + style + '"><v>' + (Math.round(v * 1e9) / 1e9) + '</v></c>';
  }

  function cell(ref, v, kind, total) {
    if (v === null || v === undefined || v === '') return '';
    if (kind === 'date') {
      const d = serial(v);
      if (d !== null) return numCell(ref, d, ST.date);
      return strCell(ref, v, total ? ST.totText : ST.text);
    }
    if (typeof v === 'number' && isFinite(v)) {
      if (kind === 'money') return numCell(ref, v, total ? ST.totMoney : ST.money);
      if (kind === 'percent') return numCell(ref, v, total ? ST.totPercent : ST.percent);
      return numCell(ref, v, total ? ST.totNumber : ST.number);
    }
    if (typeof v === 'boolean') return strCell(ref, v ? 'Yes' : '', total ? ST.totText : ST.text);
    return strCell(ref, v, total ? ST.totText : ST.text);
  }

  function sheetXml(sh) {
    const cols = sh.columns || [];
    const ncol = Math.max(1, cols.length);
    const last = colName(ncol - 1);
    let rows = '';
    let r = 1;
    rows += '<row r="1" ht="20" customHeight="1">' + strCell('A1', sh.title || sh.name || '', ST.title) + '</row>';
    r = 2;
    rows += '<row r="2">' + cols.map((c, i) => strCell(colName(i) + '2', c.label || '', ST.head)).join('') + '</row>';
    for (const row of sh.rows || []) {
      r += 1;
      let cells = '';
      cols.forEach((c, i) => {
        cells += cell(colName(i) + r, row[i], c.kind || 'text', false);
      });
      rows += '<row r="' + r + '">' + cells + '</row>';
    }
    if (sh.totals) {
      r += 1;
      let cells = '';
      cols.forEach((c, i) => {
        cells += cell(colName(i) + r, sh.totals[i], c.kind || 'text', true);
      });
      rows += '<row r="' + r + '">' + cells + '</row>';
    }
    const colXml = cols.length
      ? '<cols>' + cols.map((c, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + Math.max(6, Math.min(80, Math.round(c.width || 14))) + '" customWidth="1"/>').join('') + '</cols>'
      : '';
    return (
      HEAD +
      '<worksheet xmlns="' + NS + '" xmlns:r="' + NS_R + '">' +
      '<dimension ref="A1:' + last + Math.max(2, r) + '"/>' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A3" sqref="A3"/></sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/>' +
      colXml +
      '<sheetData>' + rows + '</sheetData>' +
      '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>' +
      '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>' +
      '</worksheet>'
    );
  }

  function stylesXml() {
    return (
      HEAD +
      '<styleSheet xmlns="' + NS + '">' +
      '<numFmts count="3"><numFmt numFmtId="164" formatCode="#,##0.00"/><numFmt numFmtId="165" formatCode="dd.mm.yyyy"/><numFmt numFmtId="166" formatCode="#,##0.##"/></numFmts>' +
      '<fonts count="3">' +
      '<font><sz val="10"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>' +
      '<font><b/><sz val="10"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>' +
      '<font><b/><sz val="13"/><color rgb="FF0B6E63"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>' +
      '</fonts>' +
      '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFDCEEEB"/><bgColor indexed="64"/></patternFill></fill></fills>' +
      '<borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border>' +
      '<border><left/><right/><top/><bottom style="thin"><color rgb="FF7F9C98"/></bottom><diagonal/></border>' +
      '<border><left/><right/><top style="thin"><color rgb="FF7F9C98"/></top><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="12">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' + // 0 default
      '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' + // 1 title
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' + // 2 header
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' + // 3 text
      '<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top"/></xf>' + // 4 number
      '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top"/></xf>' + // 5 money
      '<xf numFmtId="9" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top"/></xf>' + // 6 percent
      '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="left" vertical="top"/></xf>' + // 7 date
      '<xf numFmtId="0" fontId="1" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"/>' + // 8 total text
      '<xf numFmtId="166" fontId="1" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>' + // 9 total number
      '<xf numFmtId="164" fontId="1" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>' + // 10 total money
      '<xf numFmtId="9" fontId="1" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>' + // 11 total percent
      '</cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '<dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>' +
      '</styleSheet>'
    );
  }

  function build(sheets, opts) {
    opts = opts || {};
    if (!root.PMZip) throw new Error('PMZip is missing (load js/zip.js first)');
    if (!sheets || !sheets.length) sheets = [{ name: 'Sheet 1', title: opts.title || '', columns: [], rows: [] }];
    const names = sheetNames(sheets);
    const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    const files = [];
    files.push([
      '[Content_Types].xml',
      HEAD +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        names.map((n, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
        '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
        '</Types>',
    ]);
    files.push([
      '_rels/.rels',
      HEAD +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="' + REL + '/officeDocument" Target="xl/workbook.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
        '<Relationship Id="rId3" Type="' + REL + '/extended-properties" Target="docProps/app.xml"/>' +
        '</Relationships>',
    ]);
    files.push([
      'docProps/core.xml',
      HEAD +
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        '<dc:title>' + esc(opts.title || 'Project management file') + '</dc:title>' +
        '<dc:creator>' + esc(opts.author || 'PM Steps Workbook') + '</dc:creator>' +
        '<dcterms:created xsi:type="dcterms:W3CDTF">' + now + '</dcterms:created>' +
        '<dcterms:modified xsi:type="dcterms:W3CDTF">' + now + '</dcterms:modified>' +
        '</cp:coreProperties>',
    ]);
    files.push([
      'docProps/app.xml',
      HEAD +
        '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
        '<Application>PM Steps Workbook</Application>' +
        '<HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>' + names.length + '</vt:i4></vt:variant></vt:vector></HeadingPairs>' +
        '<TitlesOfParts><vt:vector size="' + names.length + '" baseType="lpstr">' + names.map((n) => '<vt:lpstr>' + esc(n) + '</vt:lpstr>').join('') + '</vt:vector></TitlesOfParts>' +
        '</Properties>',
    ]);
    files.push([
      'xl/workbook.xml',
      HEAD +
        '<workbook xmlns="' + NS + '" xmlns:r="' + NS_R + '">' +
        '<bookViews><workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="16000" activeTab="0"/></bookViews>' +
        '<sheets>' + names.map((n, i) => '<sheet name="' + esc(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets>' +
        '</workbook>',
    ]);
    files.push([
      'xl/_rels/workbook.xml.rels',
      HEAD +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        names.map((n, i) => '<Relationship Id="rId' + (i + 1) + '" Type="' + REL + '/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('') +
        '<Relationship Id="rId' + (names.length + 1) + '" Type="' + REL + '/styles" Target="styles.xml"/>' +
        '</Relationships>',
    ]);
    files.push(['xl/styles.xml', stylesXml()]);
    sheets.forEach((sh, i) => files.push(['xl/worksheets/sheet' + (i + 1) + '.xml', sheetXml(sh)]));
    return root.PMZip.zip(files);
  }

  root.PMXlsx = { build, serial, sheetNames, colName };
})(typeof window !== 'undefined' ? window : globalThis);
