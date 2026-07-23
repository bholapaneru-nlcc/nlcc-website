# NLCC — Admin, Database, Auth & Image Hosting

This project ships with a working **admin panel**, **real authentication**,
**image uploads** in the page builder, a **Teacher Portal**, and
**contact-form email delivery**. Everything works immediately in **local mode**;
add free **Firebase** credentials to switch to a proper cloud database, secure
auth, hosted images, and emailed contact submissions.

---

## 🍎 Teacher Portal (lesson plans, questions, quizzes)

A separate area at **`/teachers`** where teachers log in with their own account
and create classroom content. Each teacher's content stays in their own profile,
and the admin can view everyone's content.

**How it works**
- **Admin → Teachers tab →** create teacher accounts (name, email, password).
- Teachers go to **`/teachers`**, log in, and see **only their own** content.
- The builder has all the text tools (bold/italic/underline/font/colour, images,
  tables, lists) **plus a "Shape + Text" block** where you can add
  **square / rectangle / line / triangle / circle / diamond / arrow / star** and
  position it **top / bottom / left / right** of the text.
- Content types: **Lesson Plan**, **Question**, **Quiz** (with multiple-choice
  questions that mark the correct answer).

**Firestore rule required.** Teacher accounts + content live in the
`content/teachers` document. Add this rule (below the `content/main` one):

```
match /content/teachers {
  allow read: if true;        // needed for teacher login + reading content
  allow write: if true;       // teachers (custom auth) save their own content
}
```

> ⚠️ Security note: because teacher logins are custom (not Firebase Auth),
> `content/teachers` must be readable/writable by anyone. Passwords are stored
> as a **SHA-256 hash** (not plain text) so they're not directly exposed. This
> suits a small community org. For stronger security later, teachers can be
> moved to Firebase Auth (then rules can use `request.auth`).

---

---

## 🔥 Firebase — the proper database (fixes "articles disappearing")

By default the site stores content in your browser (`localStorage`), which is
capped at ~5 MB — so large content/images can be lost on refresh. **Firebase
Firestore** moves all articles and content to a real cloud database that
persists forever and syncs in real time. **This is strongly recommended for a
live site.**

### Step 1 — Create a Firebase project
1. Go to **https://console.firebase.google.com** → **Add project** (any name).
2. Once created, open **Project settings** (the gear ⚙️ next to "Project Overview").
3. Under **"Your apps"** click the Web icon **`</>`** → register an app (any
   nickname) → you'll see a `firebaseConfig` block. Copy these 6 values into
   `.env`:
   ```
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=yourproject.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=yourproject
   VITE_FIREBASE_STORAGE_BUCKET=yourproject.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:1234:web:abcd
   ```

### Step 2 — Enable Authentication (your admin login)
1. **Build → Authentication → Get started → Sign-in method → enable Email/Password.**
2. Go to the **Users** tab → **Add user** → enter **bhola.paneru@nlccuk.com** and
   a password. **This is the account you'll log in with** at `/admin`.

### Step 3 — Create the database (Firestore)
1. **Build → Firestore Database → Create database → Start in production mode.**
2. Go to the **Rules** tab and paste these (public read, admin-only write):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
        match /content/main {
          allow read: if true;
          allow write: if request.auth != null;
        }
        match /content/teachers {
          allow read: if true;
          allow write: if true;
        }
        match /content/school {
          allow read: if true;
          allow write: if true;
        }
        match /{document=**} {
         allow read, write: if false;
       }
     }
   }
   ```
3. **Publish**.

### Step 4 — Create image hosting (Storage)
1. **Build → Storage → Get started** (creates the default bucket).
2. Go to the **Rules** tab and paste these (public read, admin-only upload):
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /uploads/{allPaths=**} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```
3. **Publish**.

### Step 5 — Rebuild & deploy
```bash
npm run build      # builds with the Firebase config
```
Then push to GitHub → Netlify rebuilds. **Add the 6 `VITE_FIREBASE_*` env vars in
Netlify's dashboard too** (Site settings → Environment variables), since `.env`
doesn't go to GitHub.

> First run: the database is empty, so the app automatically seeds it with the
> demo content once. From then on, everything you save in the admin is stored in
> Firestore permanently and appears live instantly — no refresh needed.

---

## ✉️ Sending contact messages to your email (bhola.paneru@nlccuk.com)

When someone submits the Contact form, the message is always saved into the
admin **Contact Messages** inbox. To also receive it as a real **email**, enable
Web3Forms (free, no backend, made for static sites):

1. Go to **https://web3forms.com** and enter **bhola.paneru@nlccuk.com**
2. Check that inbox and copy the **access key** you're sent
3. Paste it into `.env`:
   ```
   VITE_WEB3FORMS_KEY=your-access-key-here
   ```
4. Rebuild (`npm run build`)

Done — submissions now arrive at **bhola.paneru@nlccuk.com** as a neatly
formatted email (name, email, phone, subject and message), with **Reply-To** set
to the sender so you can reply directly. The access key is safe to ship in the
client bundle (that's how Web3Forms works).

---

## 🖼️ How images & the logo work (the short version)

Every image you see is either a **placeholder** (a branded gradient) or a **real
image you uploaded**. To replace a placeholder with a real image, you upload one
through the admin — it's stored and shown automatically.

There are two storage modes:

| Mode | When | How images are stored |
| --- | --- | --- |
| **Local (default)** | No Firebase keys set | Uploaded files are saved **inside the article data** (base64). Works instantly, but limited to ~5 MB total. |
| **Firebase** | You add keys in `.env` | Uploaded files are sent to **Firebase Storage** and stored as real hosted URLs. **Use this for a live site with many photos.** |

### Uploading the logo

1. Go to **`/admin`** → **Settings**
2. Use the **Site Logo** uploader → **Upload** (pick your PNG/SVG), or paste a URL
3. **Save Settings**
4. The logo instantly updates in the **header, homepage hero, footer, and admin**.
   The browser **favicon** updates on next page reload.

Leave the field empty to keep the bundled default logo.

### Replacing an article/placeholder image

1. Go to **`/admin`** → **News / Events** → **Edit** on an article
2. Under **Details → Feature Image**, click **Upload** (or paste a URL)
3. Inside the **Content Blocks**, the *Image / Image + Text / Text Around Image /
   Columns* blocks each have their own **Upload** button
4. **Save Article** — the real image replaces the placeholder on the live article
   page and homepage cards.

Other uploaders exist for **Photo Slider** slides and **Committee** member photos.

### Any image field gives you two options

- **⬆ Upload** — pick a file from your device, or
- **Paste a URL** — from any image host (Cloudinary, ImgBB, Imgur, your own server…).

---

## Opening the admin

There is no visible button on the public site (by request). Go straight to:

```
/admin
```

(e.g. `https://yoursite/admin`) — bookmark it.

## Login

- **Local mode (no Firebase configured):** sign in with the email & password in
  `.env` — `bhola.paneru@nlccuk.com` / `nlcc-admin-2026`.
- **Firebase mode:** sign in with the user you created in
  Firebase **Authentication** (Step 2 above). This is genuinely secure.

## Page builder blocks (12)

Heading, Paragraph, Image, Image + Text, Text Around Image, Table, 2 Columns,
3 Columns, 4 Columns, Quote / Highlight, Divider, Button / Link. Reorder, delete
and live-preview each block. Article bodies built here render on the public
article page.

## Image uploads

Anywhere you see an **Upload** button (article feature image, Image / Image+Text /
Columns blocks, Photo Slider, Committee photos) you can either:

1. **Upload a file** — stored in **Firebase Storage** (a real hosted URL) when
   configured, **or** in local mode embedded as base64 inside the article data, **or**
2. **Paste an image URL** — from any image host.

## Where to host images?

| Option | Notes |
| --- | --- |
| **Firebase Storage** | Already wired in. Free tier. Also handles the database + auth. **Recommended.** |
| **Cloudinary** | Excellent for images, free tier, on-the-fly resizing. |
| **ImgBB / Imgur** | Simple upload-and-paste-a-URL hosting. |
| **Cloudflare R2 / AWS S3** | For large volumes / production scale. |

To use Firebase Storage, follow the 5-step Firebase setup at the top of this file.

---

## 💾 Git content workflow (backup / version history)

Even with Firebase, you can export your content to a file as a backup or to keep
a version history in GitHub: **Admin → Settings → ⬇ Export content**, then commit
`src/data/site-content.json`. Import a saved file with **⬆ Import content**.

> Note: Firebase is the live source of truth. The Git export is for backups.

