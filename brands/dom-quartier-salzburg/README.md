# Silva Salisburgensis — Proposal Site

A single-page bilingual (DE/EN) product showcase prepared as a pitch for **DomQuartier Salzburg**. Three GLB models — two ivory pine branches and one ivory sprig — are presented as interactive 3D viewers using Google's `<model-viewer>` web component.

## View locally

```bash
python3 -m http.server 8000 --directory brands/dom-quartier-salzburg
```

Then open <http://localhost:8000/>.

A local server is required — opening `index.html` directly via `file://` will block the GLB fetches in most browsers.

## Contents

- `index.html` — the single-page showcase
- `models/pine-branch-01.glb`, `pine-branch-02.glb`, `ivory-sprig.glb` — the three 3D pieces

## Notes

- Default language is German; toggle DE/EN in the top-right.
- 3D viewers use `reveal="interaction"` and `loading="lazy"` so the ~40 MB of GLB assets only load when needed.
- No build step. Static files only. Just serve and open.
