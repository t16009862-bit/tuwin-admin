# Admin Panel

Admin panel for managing the [Articles & Gallery Google Sheet](https://docs.google.com/spreadsheets/d/1sY7_eNfVYkKDoS3SXm1ft2luVwKsN59orsIjehfV9Xs/edit).

- **Articles** tab — full CRUD (add / edit / delete rows: category, source, date, title, description, link_text, url).
- **Gallery** tab — upload one or many images at once (stored on Cloudinary, URLs saved to the sheet) into any category, move them between categories, reorder categories with ‹ › buttons (controls the column order in the sheet), and delete them. Categories are just named columns on the Gallery sheet — `local`/`international` are the two that already existed, and "+ Add Category" adds a new column so more can be created from the UI without touching the spreadsheet directly. "Delete Category" removes the column and every image in it (sheet row + Cloudinary asset) — there's no undo, so it confirms first.
- **Bio** tab — full CRUD for Name / Birthday / World Rank / Description. Age is never entered manually — it's calculated from Birthday on every read and write, so it can't go stale.
- **Sponsors** tab — full CRUD for Name / logo (Cloudinary upload, like Gallery) / Status (`current`/`former` dropdown) / Description. Replacing or deleting a logo cleans up the old Cloudinary asset.
- **Packages** tab — full CRUD for Tier Name / Title / Price / Benefits (one per line) / Image_Set (multiple Cloudinary-uploaded images per package, stored as a comma-separated list of URLs). Removing an image before saving, or deleting the whole package, cleans up the Cloudinary assets.
- **Rankings** tab — full CRUD for date / ranking (a simple time series).
- **PSA Records** tab — manages the ranking calculation summary, current/expired/pending tournament points, medical zeros, other ranking zeros, no-penalty withdrawals, and complete match history. Each data type has its own Google Sheet tab, and the public ranking archive reads those tabs automatically.
- **Site Music** tab — enables/disables the public official YouTube player and manages its title, artist, and video ID. The default is “Hall of Fame” by The Script ft. will.i.am.
- **Upcoming** tab — full CRUD for Name / Venue / Tournament Size / Start Date / End Date / Tournament Category / Status (`upcoming`/`completed` dropdown) / Finished Position / logo (multiple Cloudinary-uploaded images, comma-separated, like Packages' Image_Set), sheet name `UpcomingTournaments`. Rejects saving if End Date is before Start Date, or if Status is Completed without a Finished Position.
- **Coach & Club** tab — full CRUD for Name / Image (single Cloudinary upload, like Sponsors) / Profile / Biography, sheet name `Coach&Club`. Its `&` requires quoting in every Sheets API range (`'Coach&Club'!A1:D`) — worth remembering if this tab is ever touched directly. Profile is a list of points, each stored in its own sheet row directly beneath the coach's row (not one cell) — add/remove points in the UI and the backend inserts/deletes the physical rows to match, including a "Delete All Points" shortcut.
- **Contact** tab — full CRUD for Locations / email / phone numbers, sheet name `Contact`. Phone numbers support multiple entries via "+ Add Phone Number", stored as one comma-separated cell.
- **Career Achievements** tab — full CRUD for Title / heading / description / footer, sheet name `CareerAchievements`.
- **Career Highlights** tab — full CRUD for year / title / description / tag / icon, sheet name `CareerHighlights`. Icon is a plain text/emoji field, not an image upload.
- **Competency Blueprint** tab — full CRUD for a single-column list of blueprint names, sheet name `CompetencyBlueprint`.
- **Training History** tab — full CRUD for title / heading / description, sheet name `TrainingHistory`.
- **Biography** tab — a single overall description plus a list of Title/Heading/Description sections, sheet name `Biograpahy` (spelled that way in the real spreadsheet). The description lives only in row 2's `description` column; each section is its own row in the `Title`/`Heading`/`Description` columns. Deleting the section that happens to share row 2 with the description re-writes the description onto the row that becomes the new row 2, so it's never lost.

Reads go through the sheet's public XLSX export (no credentials needed — the
sheet must stay shared as "Anyone with the link can view"). Writes go through
the Google Sheets API using a service account. Image uploads go directly from
the browser to Cloudinary via an unsigned upload preset.

The control panel and every API route require the private owner access code.
The plain-text code is never included in the browser bundle or GitHub; the
backend compares its SHA-256 hash using a constant-time check. The code is kept
only for the current browser session and is removed when **Sign out** is used.
Set `ADMIN_ACCESS_HASH` to rotate the access code without editing source files.

## 1. Create a Google service account (write access)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create/select a project.
2. Enable the **Google Sheets API** for that project (APIs & Services → Enable APIs → search "Google Sheets API").
3. Go to APIs & Services → Credentials → Create Credentials → **Service account**. Give it any name (e.g. `sheet-writer`).
4. Open the new service account → Keys → Add Key → Create new key → **JSON**. This downloads a JSON file — keep it private.
5. From that JSON file, copy `client_email` and `private_key`.
6. Open the [spreadsheet](https://docs.google.com/spreadsheets/d/1sY7_eNfVYkKDoS3SXm1ft2luVwKsN59orsIjehfV9Xs/edit), click **Share**, and add the `client_email` address as **Editor**.
7. Confirm the sheet is also shared as "Anyone with the link — Viewer" (needed for the read path).

## 2. Create a Cloudinary unsigned upload preset

1. Sign in to [Cloudinary](https://cloudinary.com/console) and note your **Cloud name** (dashboard home).
2. Go to Settings → Upload → Upload presets → **Add upload preset**.
3. Set **Signing Mode** to **Unsigned**, optionally restrict the folder to `gallery`, and save. Note the preset name.
4. (Optional, for deleting images) Go to Settings → Access Keys and note your **API Key** and **API Secret**.

## 3. Configure environment variables

Copy `.env.example` to `.env` and fill in the values from steps 1–2:

```
cp .env.example .env
```

| Variable | Used by | Purpose |
| --- | --- | --- |
| `SHEET_ID` | backend | Spreadsheet ID (already filled in) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | backend | Service account email |
| `GOOGLE_PRIVATE_KEY` | backend | Service account private key |
| `ADMIN_ACCESS_HASH` | backend (optional) | SHA-256 hash of a replacement control-panel access code |
| `CLOUDINARY_CLOUD_NAME` | backend | For server-side deletes |
| `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | backend | For server-side deletes |
| `REACT_APP_CLOUDINARY_CLOUD_NAME` | frontend | For direct browser uploads |
| `REACT_APP_CLOUDINARY_UPLOAD_PRESET` | frontend | For direct browser uploads |

## 4. Run locally

```
npm install
npm run dev
```

This runs the React dev server (port 3000) and a small local API server
(port 5001, defined in `server/dev.js`) together — CRA's `proxy` setting
forwards `/api/*` calls from the browser to it. Open http://localhost:3000.

`server/dev.js` only exists for local development; it's not used in
production.

## 5. Deploy (Vercel)

The `/api` folder is deployed automatically as serverless functions — no
extra config needed.

```
npm install -g vercel   # if you don't have it
vercel                  # first deploy, follow the prompts to link/create a project
```

Then in the Vercel project dashboard, add all the variables from `.env` under
Settings → Environment Variables, and redeploy.

## 5b. Deploy (Netlify)

Netlify's drag-and-drop "upload a build folder" flow only serves static
files — it can't run the `/api` backend, so add/edit/delete/upload would all
404. `netlify/functions/` adapts the same `api/*.js` handlers to run as real
Netlify Functions instead, and `netlify.toml` rewrites `/api/*` to them so
the frontend code doesn't need to change. This means deploying with the
**Netlify CLI** rather than pure drag-and-drop — still a single command:

```
npm install
netlify login                 # one-time, opens a browser to authenticate
netlify init                  # link this folder to a new or existing Netlify site
```

Then add the same variables from `.env` in the Netlify dashboard (Site
configuration → Environment variables), or via the CLI:

```
netlify env:import .env
```

Then deploy:

```
npm run deploy:netlify         # builds and deploys to production
```

To test the whole thing (frontend + functions + redirects) locally before
deploying, run `npm run netlify:dev` — it serves both together on one port,
similar to `npm run dev` but through Netlify's own dev server.

## Project structure

```
api/                  Handler logic, shared by Vercel + Netlify + local dev
  _lib/sheet.js        Public-export read helper
  _lib/sheetsClient.js Google Sheets API (service account) write helper
  _lib/cloudinary.js   Cloudinary delete helper
  _lib/galleryColumns.js  Maps Gallery category names to sheet columns
  _lib/genericCrud.js  Shared GET/POST/PUT/DELETE factory for plain one-row-per-entry tabs
  _lib/simpleTabs.js   Config for the tabs merged behind [tab].js (see note below)
  articles.js          GET/POST/PUT/DELETE for the Articles tab
  gallery.js           GET/POST/PATCH/DELETE for the Gallery tab
  gallery-categories.js  POST/PATCH/DELETE to create, reorder, or remove a Gallery category (column)
  bio.js               GET/POST/PUT/DELETE for the Bio tab
  sponsors.js          GET/POST/PUT/DELETE for the Sponsors tab
  packages.js          GET/POST/PUT/DELETE for the Packages tab
  upcoming.js          GET/POST/PUT/DELETE for the Upcoming tab (sheet: UpcomingTournaments)
  coach-club.js        GET/POST/PUT/DELETE for the Coach & Club tab (sheet: Coach&Club)
  biography.js         GET/POST/PUT/DELETE for the Biography tab (sheet: Biograpahy)
  cloudinary-delete.js   POST to delete a single Cloudinary asset by URL
  [tab].js              Dynamic route for Rankings, Career Achievements, Career Highlights, Competency Blueprint, Training History, Contact — see below
netlify/functions/    Thin adapters that run api/*.js (or api/_lib/simpleTabs.js entries) as Netlify Functions
netlify.toml          Netlify build config + /api/* → functions redirect
server/dev.js         Local-only Express server that mounts the api/ handlers
src/
  api/client.js        Frontend fetch wrappers + Cloudinary upload
  components/          Layout, Modal
  pages/                ArticlesPage, GalleryPage, BioPage, SponsorsPage, PackagesPage, RankingsPage, UpcomingPage, CoachClubPage, ContactPage, CareerAchievementsPage, CareerHighlightsPage, CompetencyBlueprintPage, TrainingHistoryPage, BiographyPage
```

### Vercel's 12-function limit (Hobby plan)

Vercel's free Hobby plan caps a deployment at 12 serverless functions, and every top-level file in `/api` counts as one. To leave room for future tabs, the plain "one sheet row per entry" tabs that have no image upload, dropdown, or multi-row logic of their own — **Rankings, Career Achievements, Career Highlights, Competency Blueprint, Training History, Contact** — are merged behind a single dynamic route, `api/[tab].js`, which dispatches to the right config in `api/_lib/simpleTabs.js` based on the URL (`/api/rankings` → `tab === 'rankings'`). Vercel counts this as **one** function no matter how many tab keys are added to `simpleTabs.js`. Frontend URLs are unaffected — `src/api/client.js` still calls `/api/rankings`, `/api/contact`, etc. as before.

Netlify has no equivalent function-count limit, so `netlify/functions/` still has one file per tab (now importing its config from `api/_lib/simpleTabs.js` instead of a deleted standalone `api/*.js` file); `server/dev.js` mirrors the same dynamic dispatch via an Express catch-all route registered after the tabs that still have their own file.

Tabs that need something beyond plain CRUD (image uploads, dropdowns, comma-separated multi-value fields with special parsing, multi-row entries) should stay as their own `api/*.js` file for clarity — only fold a new simple tab into `simpleTabs.js` if the function count is getting close to 12 again.
