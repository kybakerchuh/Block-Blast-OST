# Block Blast! OST — Algebra 1 Playbook Edition

An 8×8 **Block Blast!** puzzle game (Classic & Adventure modes) integrated with **330 Algebra 1 OST Playbook questions** across all **11 topics** (30 questions each), Google Sign-In cloud saves, and **Top 10 Leaderboards** for both High Score and OST Questions Answered Correctly.

## Run Locally (After Cloning from GitHub)

1. Install Node.js 24+ (or Node 22+).
2. Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

3. Open `http://localhost:3000` in your browser.

## Deploy via GitHub Pages

This repository includes `.github/workflows/deploy.yml` and automatic base-path handling in `vite.config.ts`:

1. Push this repository to GitHub on the `main` branch.
2. In GitHub, open **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
3. The workflow automatically runs `npm ci`, `npm run lint`, `npm run build`, and deploys `./dist`.
4. **Enable Google Sign-In on your GitHub Pages domain**:
   - Open the [Firebase Console](https://console.firebase.google.com/) for project `gen-lang-client-0363503334`.
   - Go to **Authentication → Settings → Authorized domains**.
   - Add `<your-github-username>.github.io` (or your custom domain).

## Scripts

- `npm run dev` — Start local Vite dev server on port 3000
- `npm run lint` — Run TypeScript type check (`tsc --noEmit`)
- `npm run build` — Build production bundle into `./dist`
- `npm run preview` — Preview production build locally
