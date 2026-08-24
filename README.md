# sa-2027

Shared South America 2027 trip planner. Migrated from a Claude artifact into a
real web app: same route map, budget bar, drag-to-reorder countries, and
per-stop voting — now backed by Supabase (Postgres + Realtime + Auth) instead
of the artifact's publish-a-copy mechanism, so it can be deployed and shared
with a real URL.

Everyone signs in with a magic link (their email, no password) and edits sync
live to everyone else who has the page open.

## 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. In the SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql). This creates
   the `profiles` and `trip_state` tables, sets up row-level security, and
   turns on Realtime for both.
3. Under **Authentication -> Providers**, confirm Email is enabled (it is by
   default) — that's what sends the magic link.
4. Under **Authentication -> URL Configuration**, add the URLs you'll run the
   app from to **Redirect URLs** (and set **Site URL** to your main one):
   - `http://localhost:5173` for local dev
   - your Vercel deployment URL once you have it (e.g. `https://sa-2027.vercel.app`)
5. Under **Settings -> API**, copy the **Project URL** and the **anon public**
   key — you'll need both next.

By default anyone who knows the app's URL can sign themselves in with any
email. If you'd rather only your mates can get in, turn off "Allow new users
to sign up" under Authentication settings and add each person manually under
Authentication -> Users instead.

## 2. Local development

```bash
cp .env.example .env.local
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from step 1.5 above

npm install
npm run dev
```

## 3. Deploy on Vercel

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In Vercel: **New Project -> Import** this repo. It's a Vite app, so Vercel
   auto-detects the build (`npm run build`, output `dist`) — no config needed.
3. In the project's **Settings -> Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. Then go back to Supabase's Auth URL Configuration (step 1.4) and
   add the resulting `*.vercel.app` URL if you haven't already.
5. Share the Vercel URL with your mates — they sign in with their email and
   they're in.

## How it's put together

- `src/app.js` — all the trip-planning UI and logic (route map, budget bar,
  drag-to-reorder, voting), ported near-verbatim from the original artifact.
- `src/auth.js` / `src/main.js` — magic-link sign-in gate in front of the app.
- `src/supabaseClient.js` — the Supabase client, reads its config from env vars.
- `src/mapData.js` — the South America outline used to draw the route map.
- `supabase/schema.sql` — the two tables (`trip_state`, `profiles`) and their
  RLS policies / Realtime setup.

The whole trip (regions, stops, pins, budget, votes) lives as one JSON blob in
`trip_state`, same shape the artifact used. Edits are debounced (5s, or hit
"Save now") and written back to that row; every other open tab gets the
update pushed to it over Supabase Realtime and re-renders.
