# Export model

`js/core.js` turns the workbook into a neutral list of blocks (`PM.export.model(opts)`) and a list of
sheets (`PM.export.sheets()`). Three dependency-free writers turn them into files:

- `js/zip.js` defines `window.PMZip.zip(files)` → `Uint8Array`, where `files` is
  `[[name, Uint8Array | string], ...]` (strings are UTF-8). Stored or deflated entries are both fine
  as long as Word, Excel, LibreOffice and Google Docs open the result.
- `js/docx.js` defines `window.PMDocx.build(blocks, opts)` → `Uint8Array` (a .docx file).
- `js/xlsx.js` defines `window.PMXlsx.build(sheets, opts)` → `Uint8Array` (a .xlsx file).

All three run in the browser (no Node APIs, no external libraries) and are loaded as classic scripts.

## Word blocks

| Block | Fields |
|---|---|
| `{type: 'title', text}` | Cover title |
| `{type: 'subtitle', text}` | Line under the title |
| `{type: 'h1' \| 'h2' \| 'h3', text}` | Headings (Word heading styles, so the TOC picks them up) |
| `{type: 'p', text}` or `{type: 'p', runs: [{text, bold, italic, mono}]}` | Paragraph; `style: 'note'` (smaller, grey: method notes), `'caption'`, `'small'` |
| `{type: 'bullets', items: [string], ordered, style, plain}` | List; `plain: true` = no bullet glyph (items already start with ☑/☐) |
| `{type: 'table', columns: [{label, width, align, kind}], rows: [[string]], footer: [string] \| null, kv, fontSize, emptyRows}` | Table. `width` values are relative weights. `kv: true` = two-column label/value table with a shaded label column and no header row. `footer` = totals row. `emptyRows` = blank rows appended for writing by hand. Header row repeats on each page. |
| `{type: 'image', png: Uint8Array, width, height, caption, alt}` | PNG (2× resolution); width/height in CSS px at 1×. Scale to the text width, keep the aspect ratio, never wider than the page. |
| `{type: 'pagebreak'}` | Page break |
| `{type: 'toc'}` | Table of contents field (Word fills it on open or after "Update field"); also write a short instruction line in case it shows empty |
| `{type: 'orientation', value: 'landscape' \| 'portrait'}` | Section break; following content in that orientation |

`opts`: `{title, author}` for the document properties. Page: A4, margins about 2 cm. Body font
Calibri/Arial 10 pt; tables 8–9 pt (`fontSize`); headings bold in a dark teal (#0B6E63) or ink.
Page numbers in the footer, project title in the header.

## Excel sheets

`[{name, title, columns: [{label, width, kind: 'text'|'number'|'money'|'percent'|'date'}], rows: [[value]], totals: [value] | null}]`

- `name` may be longer than 31 characters or contain `[]:*?/\`; the writer shortens, cleans and makes
  names unique.
- Values: numbers for number/money (number format `#,##0.00`), fractions for percent (`0%`), ISO date
  strings for date (convert to real Excel dates, format `dd.mm.yyyy`), strings otherwise.
- First row: the sheet `title` in bold; header row below it, bold with a fill, frozen; column widths
  from `width` (characters); a totals row in bold when `totals` is given.
