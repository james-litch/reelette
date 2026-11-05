# Reelette

A movie request app built with Next.js, shadcn/ui, and Supabase Auth.

## Run locally

Install Docker and keep it running. The project's Supabase CLI is installed with
the npm dependencies. Copy the environment template to the root `.env` file and
fill in your Google OAuth client ID and secret before starting Supabase:

```bash
npm install
cp .env.example .env
npm run supabase-start
npm run supabase-db-migrate
npm run supabase-env
npm run dev
```

```dotenv
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
```

`supabase-env` reads the running local stack and writes only its public API URL
and publishable key to the ignored `.env.development.local` file. It preserves
other settings in that file and never copies a secret or service-role key. This
file overrides `.env.local` during `npm run dev`, so your hosted public values
can remain in `.env.local` for production builds. Restart Next.js after updating
environment files. All `.env` files containing credentials are ignored by git.

The app is at `http://localhost:3000`, local Supabase Studio is at
`http://127.0.0.1:54323`, and the local API is at `http://127.0.0.1:54321`.
Local users, sessions, and rooms are separate from the hosted project. Sign in
again after switching environments.

Useful local commands:

```bash
npm run supabase-status       # Local service URLs and keys; keep output private
npm run supabase-db-migrate   # Apply pending local migrations without a reset
npm run supabase-types        # Regenerate and format the public database types
npm run supabase-db-test      # Run room SQL checks locally; fixtures roll back
npm run supabase-stop         # Stop local services while preserving database data
```

`npm run supabase-db-reset` deletes local database data, replays migrations, and
runs `supabase/seed.sql`. The seed intentionally contains no real users or auth
sessions; sign in with Google and create rooms through the app. The database
tests create temporary fixtures themselves.

These commands target the local stack. `npm run supabase-db-pull` explicitly
reads the linked hosted schema; it does not apply your migrations to the host.
To deploy schema changes, review `npx supabase db push --remote` separately.

## Configure Google sign-in

1. In [Google Auth Platform](https://console.cloud.google.com/auth/overview),
   configure the app's branding and audience. Add your Google account as a test
   user if the app is in testing. Enable the `openid`, `userinfo.email`, and
   `userinfo.profile` scopes.
2. Create an OAuth client with **Web application** as its type. Set the authorized
   JavaScript origin to `http://localhost:3000`. Add
   `http://127.0.0.1:54321/auth/v1/callback` as an authorized redirect URI.
   Google redirects to Supabase here; Supabase then redirects to the app's
   `/auth/callback` route to exchange the PKCE code.
3. Put the client ID and secret in the root `.env` file as shown above.
   `supabase/config.toml` enables Google and reads those variables. It also allows
   `http://localhost:3000/auth/callback` and
   `http://127.0.0.1:3000/auth/callback` as app redirects.
4. After changing credentials or `config.toml`, run `npm run supabase-stop`
   followed by `npm run supabase-start` to reload the Auth service.
5. Open the app and click **Sign in with Google**. A successful sign-in takes you
   to `/rooms`.

For hosted Supabase, use the project's public URL and publishable key as
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in your
deployment host. Enable Google under **Authentication → Sign In / Providers**
and save the OAuth credentials there. Local `config.toml` settings do not
configure hosted Auth. Set the production Site URL and allow
`https://YOUR_DOMAIN/auth/callback` in **Authentication → URL Configuration**.
Add your production origin and the hosted Supabase callback
`https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` to the Google OAuth client.
Keep the local callback registered too when using the same client locally.

The app uses a PKCE code exchange and cookie-based sessions. `proxy.ts` refreshes
sessions before server rendering; `/account` independently verifies the user
with Supabase Auth. The homepage and header reflect the signed-in session.

References: [Supabase SSR setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[Google provider setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google),
[local config and secrets](https://supabase.com/docs/guides/local-development/managing-config).

## Enable rooms in Supabase

Locally, `npm run supabase-db-migrate` applies the room schema and RLS policies
from `supabase/migrations`. The migration is also applied on a fresh start or
local database reset. No hosted changes are made by these local commands.

For an existing hosted project that does not have the rooms migration yet,
apply it through your migration deployment workflow or run it once manually:

1. Open your Supabase project's **SQL Editor** and create a new query.
2. Paste the complete contents of
   [`supabase/migrations/20261105143000_create_rooms.sql`](supabase/migrations/20261105143000_create_rooms.sql)
   and run it once. The transaction creates the table, index, permissions, and
   row-level security policies together.
3. Confirm that **Table Editor → rooms** contains `id`, `owner_id`, `name`, and
   `created_at`, with RLS enabled.
4. Sign in to the app, click **Create Room**, enter a name, and submit. You should
   land at `/rooms/<room-id>`. Create a second room to try switching with the
   room-title dropdown.

Each room gets a UUID and creation timestamp from PostgreSQL. The app trims room
names and accepts 1–80 characters; database constraints enforce the length and
reject blank or space-padded names. `owner_id` references `auth.users`, and the
server derives it from the authenticated session. Deleting the owning auth user
also deletes their rooms.

The `authenticated` role can insert and select rooms. RLS allows those operations
only when `owner_id = auth.uid()`. Anonymous users have no room access, and room
updates and deletes are not granted. These protections apply to direct Data API
requests as well as requests from this app. See Supabase's
[row-level security guide](https://supabase.com/docs/guides/database/postgres/row-level-security).

Your existing public Supabase environment variables and Google sign-in settings
are sufficient. No service-role key, auth trigger, or separate profiles table is
required. Rooms are private to their creator; invitations and shared membership
would need an additional membership table and corresponding RLS policies.

The homepage now offers **Create Room** and **My Rooms** to signed-in users.
**My Rooms** opens the most recently created room. If you have no rooms yet, it
shows a first-room prompt. Each room's title dropdown lists your rooms and offers
**Create a room**. Movie requests are not part of this change.

Each room has shared **Requests**, **Search**, and **History** tabs. Requests is
at `/rooms/<room-id>`, Search at `/rooms/<room-id>/search`, and History at
`/rooms/<room-id>/history`. The room selector and access checks are shared by
all three routes. Requests and History currently show empty states.

The Search tab uses `tmdb-ts` through `GET /api/movies/search?query=<title>&page=1`.
Set `TMDB_ACCESS_TOKEN` to your TMDB API Read Access Token in `.env.local` and
your hosting environment. It is read only by server code and must never have a
`NEXT_PUBLIC_` prefix. The API requires sign-in, accepts 2–200 characters, and
returns the requested page of TMDB movie results unchanged, alongside its genre
list. The page defaults to 1 and must be an integer from 1 to 500. Previous and
Next controls use `total_pages`; the count uses `total_results` across all pages.
Changing the search text resets to page 1.
`MovieSearchResultItem` uses shadcn Item to display titles, bracketed years,
genre badges, and movie overviews.
`MoviePoster` builds poster URLs and accepts a TMDB `size` (for example, `w342`),
a CSS width via `className` (for example, `w-24`), and an image `sizes` hint.
Upstream failures return a generic error without credentials or provider details.
The colocated `useMovieSearch` hook debounces input by 350 ms, cancels previous
requests, and ignores stale responses, including responses that finish while the
next search is debouncing.

The generated schema is in `lib/supabase/database.types.ts`. After applying local
schema changes, run `npm run supabase-types` and commit the updated types.
The SQL regression checks in
[`supabase/tests/rooms.sql`](supabase/tests/rooms.sql) verify ownership, anonymous
access, name constraints, and denied updates/deletes. Run them in a test database
after the migration with `npm run supabase-db-test`; their fixtures are wrapped
in a transaction and rolled back. The test command uses `psql` inside the local
`supabase_db_reelette` Docker container, so no host PostgreSQL install is needed.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
