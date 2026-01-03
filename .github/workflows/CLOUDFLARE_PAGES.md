# Deploying Artwalls Web to Cloudflare Pages

This repo's frontend is a Vite app that builds to `dist` and can be hosted on Cloudflare Pages.

Quick setup (recommended):

1. Cloudflare Pages project settings
   - Build command: `npm ci && npm run build` (or `npm run build` if you prefer)
   - Build output directory: `dist`
   - Branch: `main` (or the branch you use)

2. Environment variables for the Pages project
   - VITE_API_BASE_URL = https://api.artwalls.space
   - VITE_SUPABASE_URL = https://<your-project-ref>.supabase.co
   - VITE_SUPABASE_ANON_KEY = <your-supabase-anon-key>

   Add any other `VITE_*` variables your app expects in the Pages project UI under "Variables & Secrets".

3. Deploy via GitHub Actions (optional, provided in this repo)
   - This repo includes `.github/workflows/deploy-cloudflare-pages.yml` which builds and deploys on push to `main`.
   - You must set these GitHub repository secrets:
     - `CLOUDFLARE_API_TOKEN` — a scoped API token with permissions to deploy Pages sites.
     - `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID.
     - `CLOUDFLARE_PROJECT_NAME` — the Pages project name (the slug shown in the Pages dashboard).

   Creating a token: In the Cloudflare dashboard go to "My Profile" → "API Tokens" → "Create Token". Use the "Edit Cloudflare Workers" or custom template with at least the Pages and Account permissions required to deploy (or follow Cloudflare docs for Pages deployment token).

4. Notes
   - The frontend build script is already in `package.json` (`npm run build` uses Vite). It outputs to `dist` by default.
   - If you prefer to connect Pages directly to the GitHub repo (recommended for simple static sites), you can skip the GitHub Action and configure the build command & output directory in the Pages UI.

If you want, I can also:
- Add a Pages preview branch configuration.
- Add instructions for setting preview env vars.
- Add instructions for hosting the API (the `server/` Express app) separately (Cloudflare Workers requires a port; it won't run Express as-is).
