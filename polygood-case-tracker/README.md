# Polygood Case Tracker

A small web app for working on the **case study section of polygood.com**.

- Search any project to see whether it's in Notion, and whether it's already a case study on the website.
- Website cases come first, **oldest first**, as the reference for writing new ones.
- Mark each missing project (To do → Drafting → Ready to publish → Published / Skip), star references, write notes, and fill in missing case URLs.
- **Every change is saved as you go** and is still there next time you open the link, on any device.

Data: 219 entries from Notion › Marketing team space › **Project images** and the 48 cases listed on polygood.com/projects (as of 23 Sep 2026). NDA / internal-only projects are hidden by default.

## How saving works

Three layers, so no mark or note is lost:

1. **Your browser.** Every change is stored on your device instantly.
2. **The server (Upstash Redis on Vercel).** The change is sent to the server and retried until the server confirms. If you're offline or the server is unreachable, changes wait on your device and upload by themselves later, even after closing the tab. The pill in the top-right corner always tells you the state: *All changes saved*, *Saving…*, *N changes waiting to sync*.
3. **History and backups.** The *Saved changes* tab lists the last 150 changes stored on the server (the server keeps 1,000). *Download backup* saves everything to a JSON file; *Restore backup* loads it back.

## Deploy on Vercel (about 5 minutes)

1. **Import the project**
   - Go to <https://vercel.com/new> and import the GitHub repository `pertsevaolexa-sys/claude-remote-control`.
   - **Root Directory:** click *Edit* and choose `polygood-case-tracker`.
   - **Framework Preset:** *Other*. Leave Build Command and Output Directory empty.
   - Click **Deploy**.
   - Vercel builds production from the repository's default branch. The tracker currently lives on the branch `claude/amazing-allen-pxgqrq`. Merge it into the default branch, or change *Settings → Git → Production Branch* to that branch.

2. **Connect the database** (this is what makes progress permanent)
   - In the Vercel project, open the **Storage** tab → **Create Database** → **Upstash for Redis** (from the Marketplace) → free plan.
   - Connect it to this project for all environments. Vercel adds the connection variables (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) automatically.
   - Open **Deployments** → the latest deployment → **Redeploy**, so the app picks up the variables.

3. **Check it**
   - Open `https://<your-project>.vercel.app/api/health`. It should show `"storage":"redis"`.
   - Open the app, mark any project, reload the page, and check that the mark is still there. The top-right pill should say **All changes saved**.

4. **Optional: add a password.** Anyone with the link can otherwise change the progress. In *Settings → Environment Variables*, add `TRACKER_PASSWORD`, then redeploy. The app asks for it once per browser.

Until step 2 is done, the app works and keeps everything in your browser, and shows a notice. As soon as the database is connected, everything saved in the browser uploads automatically.

## Updating the project list

The project list is `data/catalog.json`. When new projects are added to Notion or new cases go live on the website, update that file (Claude can regenerate it from Notion) and push. Your progress is stored separately under each project's Notion ID, so updating the list never erases your marks or notes.

## Run it locally

Requires Node.js 20 or newer. No packages to install.

```bash
cd polygood-case-tracker
npm run dev      # http://localhost:3000, progress saved to .data/progress.json
npm test         # checks the API and the catalog
```

## Files

| Path | What it is |
|---|---|
| `index.html`, `assets/` | The app (plain HTML, CSS and JavaScript, no build step) |
| `data/catalog.json` | Notion projects and website cases |
| `docs/case-study-outline.md` | Typography notes on the Jimmy Fairly case and the outline for writing new cases (not deployed) |
| `api/progress.js` | Load and save progress |
| `api/history.js` | Recent saved changes |
| `api/health.js` | Shows whether storage and the password are set up |
| `lib/store.js` | Storage: Upstash Redis on Vercel, a local file in development |
| `scripts/dev.mjs`, `scripts/test.mjs` | Local server and tests |
