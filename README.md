# Nepalese Language and Culture Centre (NLCC)

A modern, mobile-friendly website built with **React + Vite + Tailwind CSS**.
Includes a content admin panel (with article page-builder + image uploads),
real contact-form email delivery, and live dual-timezone clocks.

> If you previously used **Astro**, this is the same idea but built with **Vite**.
> The `npm` workflow is identical (`npm install`, `npm run dev`, `npm run build`).

---

## 📦 Part 1 — Install on your local machine

### 1. Download the project
Download/export the **entire project folder** (everything: `src/`, `package.json`,
`vite.config.ts`, `tsconfig.json`, `index.html`, `netlify.toml`, `.gitignore`,
`.env.example`, `SETUP.md`, this `README.md`).

Put it in a **new empty folder**, e.g. `nlcc-website-vite`. Keep it **separate**
from your old Astro project so nothing gets mixed up.

### 2. Install Node.js (if you don't already have it)
You need Node.js **v20 or newer**. Check with:
```bash
node --version
```
If it's missing or old, install from https://nodejs.org (choose the LTS version).

### 3. Install the packages
Open a terminal **inside the project folder** and run:
```bash
npm install
```
This downloads all dependencies (same step you used for Astro). Wait for it to
finish.

### 4. Create your local config
Copy the example config:
```bash
cp .env.example .env
```
(On Windows: `copy .env.example .env`)

Then open `.env` in a text editor. The essential values are already filled in:
```env
VITE_WEB3FORMS_KEY=ba8b7f80-d83b-4fd5-ab67-8c7e8220caf1
VITE_ADMIN_EMAIL=bhola.paneru@nlccuk.com
VITE_ADMIN_PASSWORD=nlcc-admin-2026
```

### ⚠️ Strongly recommended: enable Firebase (the proper database)
Without it, content is stored in your browser (`localStorage`, ~5 MB) and large
content/images can disappear on refresh. **Firebase Firestore** stores articles
in a real cloud database that persists forever.

1. Follow the **5-step Firebase guide** in `SETUP.md` (free, ~10 minutes).
2. Add the 6 `VITE_FIREBASE_*` values to `.env`.

This fixes the "articles disappearing" problem permanently. (The site still runs
fine without Firebase — it just uses browser storage instead of the database.)

### 5. Run it locally
```bash
npm run dev
```
Open the URL it prints (usually **http://localhost:5173**). Edit files and watch
changes appear live. ✅

To double-check a production build works:
```bash
npm run build      # builds into the dist/ folder
npm run preview    # previews that build locally
```

---

## 🐙 Part 2 — Push to GitHub

Since you already have a website in GitHub, **pick ONE of these options:**

### Option A — Replace the existing repo (recommended if it's the same site)
This swaps your old Astro code for the new Vite code in the same repo, so
Netlify keeps the same link and domain.

```bash
cd nlcc-website-vite          # your new project folder

git init
git add .
git commit -m "Replace Astro site with new Vite build"

# Point git at your EXISTING GitHub repo (use your own URL):
git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
# (if "origin" already exists, run:  git remote set-url origin https://github.com/YOUR-USER/YOUR-REPO.git)

git branch -M main
git push origin main --force   # ⚠️ --force OVERWRITES the old code in the repo
```

> ⚠️ `--force` permanently replaces the repo's contents. If you want to keep the
> old code as a backup, **Option B** is safer — or first make a copy of the repo
> on GitHub (Settings → it's a good idea to download a ZIP of the old repo).

### Option B — Brand new repo (safest)
Keeps your old site untouched.

1. Go to GitHub → **New repository** → name it e.g. `nlcc-website` → Create.
2. Copy the repo URL.
3. Then:
```bash
cd nlcc-website-vite
git init
git add .
git commit -m "Initial NLCC Vite site"
git branch -M main
git remote add origin https://github.com/YOUR-USER/nlcc-website.git
git push -u origin main
```

### 🔐 Important — your `.env` is protected
The `.gitignore` already excludes `.env`, so **your secrets never go to GitHub**.
That means Netlify won't have them automatically — you must add them in Netlify
(see Part 3, step 3).

---

## 🚀 Part 3 — Switch Netlify to this site

You have an existing site linked to Netlify. You have two ways to switch it.

### Option A — Repoint your existing Netlify site to the new repo/branch (keeps your domain)
Best if you want to keep the **same Netlify URL and custom domain**.

1. Log in to **https://app.netlify.com**.
2. Click your **existing site** → **Site configuration** → **Build & deploy**.
3. Under **Continuous Deployment**:
   - **Option B** users (new repo): change **Repository** to your new repo.
   - **Option A** users (same repo, replaced code): no repo change needed.
4. **Site settings → Environment variables** → add each (critical!):
   - `VITE_WEB3FORMS_KEY` = `ba8b7f80-d83b-4fd5-ab67-8c7e8220caf1`
   - `VITE_ADMIN_EMAIL` = `bhola.paneru@nlccuk.com`
   - `VITE_ADMIN_PASSWORD` = `nlcc-admin-2026`
   - The 6 `VITE_FIREBASE_*` values (API key, auth domain, project id, storage
     bucket, messaging sender id, app id) — copy these exactly as in your local `.env`.
   - Without the Firebase vars here, the live site falls back to browser storage.
5. Go to **Deploys** → **Trigger deploy** → **Deploy site**. ✅

---

## 💾 "My article disappeared after refresh!" (local-mode storage limit)

In **local mode** (no Firebase), everything — including uploaded images — is
stored in the browser's `localStorage`, which is capped at **~5 MB**. If your
content (especially images) pushes past that limit, the browser silently refuses
to save, so the change lives only in memory and vanishes on refresh.

This is now handled several ways:

1. **Automatic image compression** — every uploaded image is resized (max 1280px)
   and re-encoded to JPEG (~82% quality) before storing. A 4 MB phone photo
   shrinks to ~200 KB, so you can store many more images safely.
2. **A clear warning** — if a save ever *can't* be persisted, the admin now shows
   a yellow ⚠️ banner telling you it won't survive a refresh (instead of failing
   silently).
3. **No more accidental wipes** — saved content is never overwritten by a
   version/re-seed check.

**The real fix: enable Firebase (see SETUP.md).** All articles and content then
live in **Firestore** — a proper cloud database with no storage limit, that
persists forever and syncs in real time. This is the recommended setup for a
live site.

> If you test in **Private/Incognito** mode, `localStorage` doesn't persist
> between sessions — use a normal browser window when editing.

### Option B — Unlink old, link new (start fresh)
If you prefer a clean Netlify site:

1. Log in to **https://app.netlify.com**.
2. Open your **old site** → **Site configuration** → scroll to the bottom →
   **Detach** / **Delete site** (this only removes the Netlify site, **not** your
   GitHub repo). Note your custom domain if you have one.
3. **Add new site → Import an existing project** → pick your new GitHub repo.
4. Netlify auto-reads `netlify.toml`, so these are already set:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** `20`
5. Before deploying, **add environment variables** (same 4 keys as Option A step 4).
6. **Deploy site**. ✅
7. If you had a **custom domain**, add it: **Set up a custom domain**.

---

## ✅ Verify it's live
- Open the Netlify URL (or your custom domain).
- Test the **Contact form** — you should receive an email at
  `bhola.paneru@nlccuk.com`.
- Go to **`/admin`** (e.g. `https://yoursite/admin`) and log in with your
  admin email + password.

---

## 🔄 Your ongoing workflow (same as before)
```bash
npm run dev                 # test changes locally
git add . && git commit -m "describe change"
git push                    # Netlify auto-builds & deploys
```

---

## 📝 Making content changes permanent via Git (recommended)

Content you create in the admin is stored in the browser by default (for
instant preview). To make it **permanent on the live site** (and avoid the
browser's ~5 MB storage limit), export it and commit it to GitHub:

1. **Admin → Settings → scroll to "Content (Git workflow)"** → click
   **⬇ Export content**. This downloads `site-content.json`.
2. **Save it in the repo**, replacing `src/data/site-content.json`.
3. **Commit & push:**
   ```bash
   git add src/data/site-content.json
   git commit -m "Update site content"
   git push
   ```
4. Netlify rebuilds — your articles/events/committee etc. are now baked into
   the live site permanently.

The committed `site-content.json` is the **source of truth**: the app loads it
at build time, so pushed edits always win, with no storage limits and no
"disappeared on refresh". (To resume editing later, use **⬆ Import content** to
load a previously exported file.)

> Out of the box, `src/data/site-content.json` is an empty marker, so the
> built-in demo data (with live upcoming dates) is used until you export real
> content.

---

## 🛠️ Quick reference: Astro → Vite

| What | Astro (before) | Vite (now) |
| --- | --- | --- |
| Install | `npm install` | `npm install` *(same)* |
| Dev server | `npm run dev` | `npm run dev` *(same; default port 5173)* |
| Build | `npm run build` | `npm run build` *(same)* |
| Build output | `dist/` (many files) | `dist/index.html` (**single file**) |
| Config file | `astro.config.mjs` | `vite.config.ts` |

See **`SETUP.md`** for details on auth, image hosting/logo, and email delivery.
