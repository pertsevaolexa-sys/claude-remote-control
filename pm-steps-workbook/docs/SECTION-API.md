# PM Steps Workbook: how a section is built

The workbook is plain HTML, CSS and JavaScript with no build step. `index.html` loads
`js/svg.js`, `js/core.js`, `js/shared.js`, then one file per group of sections in
`js/sections/`, then the export writers. A section file only *declares* sections. The core
renders them, saves every edit, keeps graphics live and exports everything to Word and Excel.

Read `js/core.js` and `js/shared.js` when something here is unclear. They are the source of truth.

## File shape

```js
/* One line saying which framework sections this file covers. */
(function () {
  'use strict';
  const S = PM.svg;          // drawing helpers
  const U = PM.util;         // dates, numbers, WBS codes

  PM.section({ ... });       // one call per section
  PM.metric('key', { ... }); // optional headline numbers for the overview
  PM.example({ ... });       // example data for this file's own tables and fields
})();
```

Never edit `core.js`, `shared.js`, `svg.js`, `css/app.css` or another module's file. If you need a
core change, describe it in your final report.

## PM.section(spec)

| Key | Meaning |
|---|---|
| `id` | Bare token used in the URL hash (letters, digits, `-`). Unique. |
| `part` | `overview`, `initiation`, `start`, `risk`, `formats`, `external` or `tailoring` |
| `order` | Number that sorts all sections (given in your brief) |
| `num` | Framework number shown in the nav, e.g. `'3.4'` |
| `title`, `navTitle` | Page title; optional shorter nav label |
| `step` | Optional process step (`'I1'`…`'S5'`): shows a chip linking to that step |
| `slides` | Deck slide numbers, e.g. `'38–44'` |
| `intro` | One or two plain sentences under the title |
| `landscape` | `true` puts the section on landscape pages in Word (wide tables) |
| `exportSkip(q)` | Return true to leave the section out of Word (e.g. contract section for internal projects) |
| `blocks` | Array of blocks, rendered top to bottom |

## Blocks

| `type` | Keys | Notes |
|---|---|---|
| `h` | `text`, `sub` | Sub-heading inside the section (a rule above it). |
| `note` | `text` or `html` | Plain paragraph. |
| `callout` | `kind: 'tip'\|'rule'\|'warn'`, `title`, `text` | Highlighted remark (a rule of the method, a common failure). |
| `guide` | `title`, `text`, `items: [string]`, `ordered`, `collapsed`, `source` | "Method" card: the steps or rules of the method, in your own words. |
| `step` | `step: 'I3'` | Step record card (status, when, format, who, what we did, result) bound to the shared `steps` table. Put it only in the section your brief names. |
| `fields` | `title`, `hint`, `cols: 1-4`, `fields: [{key, label, kind, placeholder, hint, options, unit, compute, default, wide}]` | Single values. A `key` that exists in `shared.js` only needs `{key}`. |
| `table` | see below | Editable table with add/delete/move rows. |
| `graphic` | `title`, `caption`, `render(q, pal)`, `empty(q)`, `emptyW`, `emptyH` | Live SVG. `empty(q)` returns a short message (string) when there is not enough data yet, else null. |
| `checks` | `title`, `hint`, `run(q) => [{ok: true\|false\|null, text}]` | Automatic rule checks. `null` = information only. |
| `checklist` | `key`, `title`, `hint`, `items: [{id, text}]` | Manual tick list, stored as an array of ids in field `key`. |
| `group` | `cols: 2`, `blocks` | Puts blocks side by side on wide screens. |
| `custom` | `render(el, q, api)`, `update(el, q, api)`, `exportBlocks(q, opts, tools)`, `keys` | Escape hatch for a special layout. Prefer the standard blocks. See "Custom blocks". |

### Tables

```js
{ type: 'table', key: 'risks', title: 'Risk table', hint: '…', numbered: true, addLabel: 'Add risk',
  columns: [ {key, label, kind, w, sub, placeholder, options, compute, total, from, editSource, family, hidden, hint, dec} ],
  defaults: [ {col: value, _ph: {col: 'placeholder for this row'}} ],   // template rows, optional
  from: 'wbs', filter: (row, q) => bool,                                // derived rows, optional
  fixed: [ {_id: 'a1', col: 'reference text'} ] | (q) => [...],         // fixed rows, optional
  sort: 'code', emptyText: '…', compact: true }
```

- **Own table** (no `from`, no `fixed`): rows are stored in the file. `defaults` are template rows the
  user sees until the first edit. Give template rows real values only for standard content (e.g. the
  standard meetings) and use `_ph` for hints such as "(phase)".
- **Derived table** (`from: 'otherKey'`): one row per row of another table (usually `wbs`), filtered
  by `filter`. Own columns are stored per source row id. Columns with `from: true` show the source
  value read-only; add `editSource: true` to let the user edit the source value from here.
- **Fixed table** (`fixed`): a fixed list of rows (questions, criteria, the ten steps). `from: true`
  columns show the fixed text; the other columns are editable.
- To show a table defined elsewhere (shared or by another module), use `{type: 'table', key: 'wbs'}`
  with optional `title`, `hint`, `addLabel`. Do not repeat its columns.
- Reference another module's table key only when your brief lists it.

**Column kinds**: `text`, `textarea`, `number`, `money` (currency from the project), `percent`
(stored 0–100), `date` (ISO `YYYY-MM-DD`), `month` (`YYYY-MM`), `select` (`options`), `multi`
(several of `options`, stored as array), `person` (one person id from `people`), `people` (array of
person ids), `wbs` (one WBS row id), `check` (boolean), `rating` (1..n; `options` gives the n labels,
can be a function `(q, row) => [...]` for row-specific labels).

**Column options**: `w` minimum width in `ch`; `sub` small second header line; `placeholder` (string or
`(row) => string`); `options` (array of strings or `{value, label}`, or `(q, row) => [...]`);
`compute: (row, q) => value` makes it read-only and calculated (it runs in column order, so it can use
earlier computed columns of the same row); `total: true` adds a sum in the footer (or a function
`(rows, q) => text`); `family: 'mono'` for codes; `hidden: true` computes but does not show.

## The query object `q`

Every `render`, `compute`, `run`, `empty` and `options` function gets `q`. It reads the file the user
is looking at (their own file, or the example when "Example" is on).

| Call | Returns |
|---|---|
| `q.f(key, fallback)` | Field value (computed fields run their `compute`). |
| `q.rows(key)` | Rows of any table, with computed columns filled in. Derived rows also carry the source row's fields. |
| `q.raw(key)` | Stored rows of an own table, without computed columns. |
| `q.row(key, id)` | One row. |
| `q.label(row, col)` | The value, or the template placeholder (`_ph`) if empty. Use it in graphics so template rows show their hint text. |
| `q.isPlaceholder(row, col)` | True when `label` returned a placeholder (draw it muted/italic). |
| `q.people()`, `q.person(id)`, `q.name(id)`, `q.initials(id)`, `q.withRole('Project manager')` | People. Roles are from `PM.ROLES`. |
| `q.wbs()` | WBS lines with a code, sorted by code; each has `level` (1 project, 2 phase, 3+ WP) and `kind` (`Project`, `PM phase`, `Phase`, `Group`, `Work package`). |
| `q.wbsRow(id)`, `q.wbsByCode(code)`, `q.wbsLabel(id)`, `q.children(code)`, `q.phases()`, `q.wps()` | WBS helpers. `wps()` = leaf work packages. |
| `q.dates(wbsId)` | `{start, end, actualStart, actualEnd, progress, pred}`; parents get the span of their children. |
| `q.projectDates()` | `{start, end}` from the time boundaries, else from the schedule. |
| `q.cur()`, `q.money(n)`, `q.num(n, dec)`, `q.pct(n)`, `q.date(iso)` | Formatting. |
| `q.fmt(col, value, row)` | Display text for a value of a column. |
| `q.util` | `PM.util` (below). |
| `q.readOnly`, `q.example` | True while the example is shown. |

`PM.util`: `diffDays(a, b)`, `addDays(iso, n)`, `spanDays({start, end})`, `minDate(list)`,
`maxDate(list)`, `overlapDays(a1, a2, b1, b2)`, `months(start, end)` → `['2026-02', …]`,
`monthStart(ym)`, `monthEnd(ym)`, `monthLabel(ym)`, `monthShort(ym)`, `fmtDate(iso)`,
`fmtDateShort(iso)`, `num(text)`, `fmtNum(n, dec)`, `fmtMoney(n, cur)`, `fmtPct(n)`, `sum(list, fn)`,
`codeCmp(a, b)`, `codeLevel(code)`, `parentCode(code)`, `parsePred('1.2.1, 1.3.2 SS+2')` →
`[{code, type, lag}]`, `isDate(iso)`, `isEmpty(v)`, `clone(o)`, `esc(html)`.

## Graphics

`render(q, pal)` returns one SVG string made with `PM.svg` and colours only from `pal`.

- `pal` is `PM.pal.light` or `PM.pal.dark`; the Word export always uses light. Keys: `bg ink ink2 muted
  line grid axis box boxLine accent accentSoft accentInk strong strongInk mile mileSoft crit critSoft
  good goodSoft warn warnSoft`, `series[0..7]` (categorical, use in this fixed order, never cycle past
  8: fold the rest into "Other"), `status.{good,warning,serious,critical}` (reserved for state, always
  with a text label or icon).
- `S.svg(w, h, body, {pal, label})` wraps the drawing (background `pal.bg`, `role="img"`, `aria-label`).
  Choose `w` for the content: 720–1100 is typical; it scales down on small screens.
- Text: `S.text(x, y, str, {size, weight, fill, anchor, v: 'top'|'middle'|'base', family: 'mono', italic})`,
  `S.textBlock(x, y, str, {maxW, size, lineH, maxLines, ...})` → `{svg, h, lines}`, `S.wrap`, `S.fit`
  (ellipsis), `S.measure(str, size, weight)`. Text is 11–13px; titles inside a drawing 13–14px, weight 600.
  Text colour is `pal.ink`, `pal.ink2` or `pal.muted`, never a series colour (the mark next to it carries
  the colour). Text inside a dark fill uses `pal.accentInk` / `pal.strongInk`.
- Shapes: `S.rect`, `S.line`, `S.path`, `S.poly`, `S.polyline`, `S.circle`, `S.ellipse`,
  `S.diamond(cx, cy, r, o)` (milestones), `S.chevron(x, y, w, h, {first, fill})` (process steps),
  `S.box(x, y, w, h, label, {fill, stroke, sub, size, weight, color, maxLines, align})`,
  `S.bar(x, y, w, h, {fill, horizontal})` (4px rounded data end), `S.legend(items, x, y, pal, {maxW})`
  → `{svg, h, w}`, `S.arrowDef(id, color)` inside `<defs>` with ids from `S.uid('a')`.
- Time: `S.timeScale(startISO, endISO, x0, x1)` → `{x(iso), xEnd(iso), months: [{key, label, year, x, w}]}`;
  `S.timeAxis(scale, y, h, bottom, pal)` draws month labels and gridlines. Numbers: `S.niceTicks(max)`,
  `S.compact(n)`.
- Chart rules (from the data-viz guide): one value axis only, never two; bars ≤ 24px thick with a
  2px gap between touching segments; lines 2px; markers r ≥ 4; hairline recessive gridlines; a legend
  whenever there are 2+ series; label selectively (ends, extremes), not every point.
- Diagram rules: draw the mechanism the method is about (who reports to whom, what depends on what),
  align to a grid with even gaps, label arrows when the meaning is not obvious, keep labels short, put
  explanations in the `caption`. No `<style>`, `<script>`, `<foreignObject>` or images inside the SVG.
- Nothing may be drawn outside the viewBox. Compute the height from the content.
- Template data: draw template rows with `q.label` and muted italic text, so an untouched file still
  shows the structure. When there is truly nothing to draw (no dates, no rows), return a short message
  from `empty(q)` instead, e.g. "Add start and end dates to the work packages to see the bar chart."
- Every graphic must work for 0 rows, 1 row and many rows (e.g. 40 work packages, 30 people, long names).

## Custom blocks

`render(el, q, api)` fills `el`. Build inputs with `PM.ui.control(col, value, ctx)` where `ctx` is
`{id: PM.ui.id('c', key, rowId, colKey), q, row, ro: q.readOnly, data: PM.ui.cell(key, rowId, colKey, kind), ph}`
(or `data: PM.ui.field(fieldKey, kind)` for a field). The core saves those controls by itself.
`update(el, q, api)` runs after every edit (keep focus: update text, don't rebuild the inputs the user
is typing in). `exportBlocks(q, opts, {svgToPng})` returns Word blocks (see `docs/EXPORT-MODEL.md`).
`keys: ['t:tableKey', 'x:derivedKey', 'f:fieldKey']` lets the nav count what the block fills in.
`api` has `setField(key, value)`, `setCell(key, rowId, col, value)`, `addRow(key, afterId, values)`,
`deleteRow`, `moveRow`, `setRows`.

## Shared data you can use everywhere

Defined in `js/shared.js`:

- Fields `meta.name`, `meta.kind` (`Internal project`, `External (customer) project`, `Event`,
  `Programme`, `Other`), `meta.org`, `meta.summary`, `meta.status`, `meta.currency`, `meta.version`,
  `meta.author`, `meta.updated`, `time.startEvent`, `time.startDate`, `time.endEvent`, `time.endDate`,
  `time.duration` (computed).
- Tables `people`, `wbs`, `schedule` (derived from `wbs`: start, end, days, pred, actualStart,
  actualEnd, progress), `milestones` (wbs, name, type, baseline, revised, actual, slip), `steps`
  (fixed rows I1–S5).
- `PM.PROCESS` (the ten steps with activities, roles, format, result), `PM.ROLES`, `PM.STEP_STATUS`.

## Example data

The example project is a company **Summer Festival 2026** (an event for about 400 employees and their
families on 27 June 2026; project from 2 Feb to 31 Jul 2026; status: closed). Its backbone is in
`shared.js`: people `p1`…`p10`, WBS rows `w1`, `w11`, `w111`…`w163`, dates, milestones `m1`…`m8`
and the ten step records. Add example rows for **your own** tables and fields with

```js
PM.example({ f: {'my.field': 'value'}, t: {myTable: [{_id: 'x1', ...}]}, x: {myDerived: {w121: {col: 'value'}}} });
```

Reference people and WBS lines by those ids. Keep the example realistic, consistent with the
backbone (dates inside the project, costs that add up, the same people), and complete enough that
every table has rows and every graphic draws something meaningful.

## Words on the page

Write for someone filling in their own project file: plain, short, active sentences; name things the
way a project manager would. Explain each method in your own words; do not copy slide text and never
use the consultancy's name, logo or branding. Methods and concepts may be applied; the exact material
may not be reproduced. No em-dash asides, no "not X but Y", no exclamation marks, no emoji.

## Testing

```
node tools/check.mjs --modules your-file.js --section id1,id2                 # empty template
node tools/check.mjs --modules your-file.js --section id1,id2 --example        # example project
node tools/check.mjs --modules your-file.js --section id1,id2 --theme both --shots --out /tmp/pm-<name>
node tools/check.mjs --modules your-file.js --section id1,id2 --interact       # type, add and delete rows
node tools/check.mjs --modules your-file.js --section id1 --width 390 --shots  # phone width
```

`--modules` loads only the section files you list (comma-separated), so other people's unfinished
files cannot break your test. Every line must say `ok`: no console errors, no render errors, no page
overflow, every graphic drawn, no `svg overflow` lines. Then open the screenshots with the Read tool
and look at them: overlapping labels, clipped text, unreadable colours in dark mode and empty-looking
graphics are bugs.
