# LabelLens: Phase 1

Foundation + live scan loop (stub extraction; real Gemini OCR arrives in Phase 2).

## Setup
```bash
# 1. Install dependencies (installs the packages listed in package.json)
npm install

# 2. Copy the env template and fill in your Supabase URL, anon key, service-role key and demo passwords
cp .env.example .env.local
```
3. In the Supabase dashboard, open **SQL Editor** and run `supabase/migrations/0001_init.sql`.
4. Create the three demo accounts:
```bash
# Loads .env.local into the shell, then creates customer/manufacturer/inspector users with roles
set -a; source .env.local; set +a; npm run seed
```
5. Run the app: `npm run dev` (also reachable from phones on the same Wi-Fi at `http://<laptop-ip>:3000`).
   Phone cameras need HTTPS: deploy (e.g. Vercel) or use an HTTPS tunnel; plain HTTP falls back to the photo picker.

## Checks
`npm run typecheck` · `npm test` · `npm run build` · `npm run e2e` (needs Supabase + seeded users + `SEED_*` env vars)

## Demo logins
customer@labellens.test, manufacturer@labellens.test, inspector@labellens.test (passwords = your `SEED_*` values).
