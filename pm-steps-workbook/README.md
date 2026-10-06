# PM Steps Workbook

A project management file to fill in, step by step, for the initiation and start of a project. It
follows the planning method from the "Planning & Starting Projects" training: the ten steps of the
initiation and start processes, every table of the method (charter, stakeholder analysis, WBS,
milestone plan, resource and cost plans, RACI chart, risk table and more) and every graphic, drawn
live from what you type.

- **Fill it in** section by section. The sidebar shows how much of each section is filled in.
- **Example** (top bar) shows a complete sample project (a company summer festival) so you can see
  every table and graphic in use. It is read-only and never touches your own file.
- **Export** builds a Word document (all sections, tables and graphics; optionally with blank lines to
  fill in by hand), an Excel workbook (one sheet per table) and a JSON backup you can restore later.
- Every graphic has **Save PNG** and **Save SVG** for slides and reports.

## How saving works

- Opened as a claude.ai Artifact, the file is saved online in the artifact's own storage, so it is
  there on every device you open the link on. The pill in the top bar says *All changes saved*.
- Opened from disk or any other web server, the file is saved in that browser only. Use
  *Export → Backup (.json)* to move it to another browser, and *Restore from a backup* to load it.
- Changes made while offline stay in the browser and upload by themselves the next time the
  online file is reachable.

## Sections

| Part | Sections |
|---|---|
| Overview | Project at a glance · 1 Process map: the ten steps · 2 Core ideas and planning depth |
| Initiation process | 3.1 Assess the idea · 3.2 Categorise the project · 3.3 Boundaries and context (six fields) · 3.3 Project Charter · 3.4 Stakeholder analysis · 3.5 Scope and WBS · 3.5 Schedule · 3.5 Resources and costs · 3.6 Project approval |
| Project start process | 4.1 Project organisation · 4.1 Communication and culture · 4.2 RACI chart · 4.2 Work package specifications · 4.2 Linked bar chart and network · 4.2 Resources and costs over time · 4.3 Consolidate and coordinate · 4.4 Finalise the PM plan · 4.5 Approve the PM plan |
| Risk management | 5 Risk management |
| Communication formats | 6 Kick-off and start workshop |
| External projects | 7 Contract management |
| Tailoring | 8 Tailoring the planning process (situation analysis, method check, planning navigator) |

## Run it

No build step and no packages. Open `index.html` in a browser, or open the single-file version
`dist/pm-steps-workbook.html` (everything inlined; works offline except the web fonts).

```bash
node tools/build.mjs        # rebuild dist/ after changing the source
node tools/check.mjs        # render every section in headless Chromium and report problems
node tools/check.mjs --example --theme both --shots --out /tmp/pm-check
node tools/export-check.mjs --example   # build the Word and Excel files and validate them
```

The checks need Node.js 20+ and Playwright with Chromium.

## Files

| Path | What it is |
|---|---|
| `index.html`, `css/app.css` | Page shell and styles |
| `js/core.js` | State, saving, the table/field/graphic renderers, navigation, export |
| `js/svg.js` | Drawing helpers and the two graphic palettes |
| `js/shared.js` | The ten steps, shared tables (people, WBS, dates, milestones, step records) and the example backbone |
| `js/sections/*.js` | One file per group of sections; each declares its tables, graphics and example rows |
| `js/zip.js`, `js/docx.js`, `js/xlsx.js` | Dependency-free Word and Excel writers |
| `docs/SECTION-API.md` | How a section is declared (for adding or changing sections) |
| `docs/EXPORT-MODEL.md` | The block model the Word and Excel writers accept |
| `tools/` | Bundler, render check, export check |
| `dist/` | Built single-file versions |

## A note on the method

The methods and concepts come from a training the author attended. Participants may apply them; the
training material itself may not be reproduced. This workbook therefore contains no slides, logos or
copied text: every explanation is written fresh, and the figures are drawn from your own data.
