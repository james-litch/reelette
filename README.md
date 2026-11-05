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
npm run supabase-db-test      # Run room/request SQL checks; fixtures roll back
npm run supabase-stop         # Stop local services while preserving database data
```

`npm run supabase-db-reset` deletes local database data, replays migrations, and
runs `supabase/seed.sql`. The seed intentionally contains no real users or auth
sessions; sign in with Google and create rooms through the app. The database
tests create temporary fixtures themselves.

These commands target the local stack. `npm run supabase-db-pull` explicitly
reads the linked hosted schema; it does not apply your migrations to the host.
Use the production migration workflow described below to deploy schema changes.

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
sessions before server rendering; server-side access checks verify the user
with Supabase Auth. The homepage and header reflect the signed-in session.
Signed-in users can sign out directly from the header and return to the homepage.

References: [Supabase SSR setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[Google provider setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google),
[local config and secrets](https://supabase.com/docs/guides/local-development/managing-config).

## Enable rooms in Supabase

Locally, `npm run supabase-db-migrate` applies the room schema and RLS policies
from `supabase/migrations`. The migration is also applied on a fresh start or
local database reset. No hosted changes are made by these local commands.

For an existing hosted project, deploy all pending migrations through the
production workflow below. Avoid pasting migrations into SQL Editor: that does
not record them in the CLI's migration history.

After deployment, sign in to the app, click **Create Room**, enter a name, and
submit. You should land at `/rooms/<room-id>`. Create a second room to try
switching with the room-title dropdown.

Each room gets a UUID and creation timestamp from PostgreSQL. The app trims room
names and accepts 1–80 characters; database constraints enforce the length and
reject blank or space-padded names. `owner_id` references `auth.users`, and the
server derives it from the authenticated session. Deleting the owning auth user
also deletes their rooms.

The `authenticated` role can insert, select, update settings, and delete rooms.
RLS allows owners and joined members to read rooms and update `name` and
`exclude_last_requestor`. Only the owner can delete a room or invite people.
Room identity and ownership cannot be changed. Anonymous users have no room
access. These protections apply to direct Data API requests as well as requests
from this app. See Supabase's
[row-level security guide](https://supabase.com/docs/guides/database/postgres/row-level-security).

Your existing public Supabase environment variables and Google sign-in settings
are sufficient. No service-role key, auth trigger, or separate profiles table is
required. Rooms are private to their owner and users who have joined through
an invite. Knowing a room ID does not grant access.

The homepage now offers **Create Room** and **My Rooms** to signed-in users.
**My Rooms** opens the most recently created room. If you have no rooms yet, it
shows a first-room prompt. Each room's title dropdown lists owned and joined rooms and offers
**Create a room**.

The gear button beside the room title opens **Room settings** on every room tab.
**General** lets you rename the room and save **Exclude last requestor**. This
setting defaults to off. When enabled, random selection skips every unwatched
request from the requestor whose movie was most recently watched in this room,
matching names without case sensitivity. Requestor and genre filters still apply;
the request grid stays visible. Before the first watched movie, nobody is excluded.
If no eligible movies remain, change the filters or disable the setting. History
load failures disable random selection until a successful refresh.

**Danger** is visible only to the owner and offers room deletion with a separate confirmation. Deleting a room
permanently removes its requests and watched history, then opens **My Rooms**
(or the first-room prompt when none remain).

Apply `supabase/migrations/20261105200000_room_settings.sql` locally with
`npm run supabase-db-migrate`, then run `npm run supabase-types`. Apply the same
migration to hosted Supabase through your deployment workflow. It adds the
saved exclusion preference, owner-only settings updates and deletion, and an
index for the latest watched request. No new environment variables are needed.

**Members** lists everyone in the room, with **Owner** or **Member** badges.
Names come from Google profile metadata, falling back to the account's email
name (without the domain). The list is available to both owners and members
and refreshes when the tab opens.

Owners can choose **Create invite link** under Members, then copy and share the
link themselves. Anyone with the link can sign in with Google, see the room name,
and choose **Join room**. Links work for multiple recipients, expire after one
hour, and are replaced by **Create new invite link**. Replacing or expiring a
link does not remove existing members. Repeated joins are safe. Deleted rooms,
expired links, and replaced links cannot be joined.

Joined members can add and delete movies, mark them as watched, view history,
randomise the selection, rename the room, and change its random-selection setting.
They cannot invite other users or delete the room. Supabase enforces these
permissions even for direct API calls. Memberships and invite tokens cannot be
read or written directly through the Data API; checked database functions handle
joining, link rotation, and the participant list. Deleting a room also removes
its memberships and invite link.

Apply `supabase/migrations/20261105210000_room_members_and_invites.sql` locally
with `npm run supabase-db-migrate`, followed by `npm run supabase-types`. Apply
all pending migrations to hosted Supabase before deploying this app update.
The follow-up `supabase/migrations/20261105220000_one_hour_room_invites.sql`
sets a one-hour lifetime for new and replacement links and shortens existing
seven-day links to one hour from their original issue time. Older links expire
immediately; existing memberships remain valid.
No new environment variables, service-role key, email service, or OAuth redirect
allowlist changes are needed. A short-lived HttpOnly cookie remembers the invite
while Google sign-in uses the existing `/auth/callback` URL; the callback only
accepts a validated invite ID and clears the cookie after use. Invite pages are
excluded from indexing and use a no-referrer policy.

Each room has shared **Requests**, **Search**, and **History** tabs. Requests is
at `/rooms/<room-id>`, Search at `/rooms/<room-id>/search`, and History at
`/rooms/<room-id>/history`. The room selector and access checks are shared by
all three routes. History shows movies marked as watched, most recently watched first.

Search results have an **Add** icon that opens an **Add request** dialog. Select
a previous requestor or type a new name and choose **Add “name”**, then save.
Names come from submitted requests in the current room, with case-insensitive
deduplication. The Search page loads these names once and reuses them when the
dialog is reopened, adding newly saved requestors to its local list. Refreshing
or revisiting the page reloads the names. New names are only persisted when the
movie request is saved.
The Requests tab displays each movie's poster, title, year, and a requestor badge
over the poster, newest first, in a responsive portrait grid. Each item's three-dot
menu can mark it as watched (moving it to History) or delete it. History items
can also be deleted.

Filter Requests by requestor and genre using the checkbox dropdowns. Each supports
multiple selections: movies can match any selected requestor and any selected
genre. Choose **All requestors** or **All genres** to reset that selection.
Both filters apply together,
and **Randomise movie** chooses from the matching unwatched requests.
The random movie dialog lets you mark the choice as watched or **Pick again**,
which chooses a different movie when one is available. Watching a choice moves
it to History. These controls reuse the existing requests and watched action;
no additional Supabase migration or environment variables are required.

Apply `supabase/migrations/20261105170000_create_movie_requests.sql` with
`npm run supabase-db-migrate` locally, then `npm run supabase-types` to refresh
the generated types. For hosted Supabase, apply the same migration using your
deployment workflow. It creates `movie_requests` and the
`get_room_requestors` function. The membership migration below extends request RLS to owners and joined
members. Also apply `supabase/migrations/20261105190000_manage_movie_requests.sql`
locally with `npm run supabase-db-migrate` and to hosted Supabase through your
deployment workflow. It adds `watched_at`, owner-only deletes, and owner-only
updates restricted to the watched timestamp. Movie metadata and the room cannot
be changed. Anonymous access is not granted. The names
function uses invoker security, so the same RLS applies to suggestions.
No new environment variables are needed. The server verifies room access and
fetches movie details from TMDB before saving a snapshot with the request.

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
[`supabase/tests/rooms.sql`](supabase/tests/rooms.sql) and
[`supabase/tests/movie-requests.sql`](supabase/tests/movie-requests.sql), and
[`supabase/tests/room-members.sql`](supabase/tests/room-members.sql) verify
ownership, anonymous access, name constraints, requestor suggestions, watched
status, deletion, immutable movie metadata, invite expiry/rotation, and member
permissions. Run them in a test database
after the migration with `npm run supabase-db-test`; their fixtures are wrapped
in a transaction and rolled back. The test command uses `psql` inside the local
`supabase_db_reelette` Docker container, so no host PostgreSQL install is needed.

## Checks

```bash
npm run lint
npx next typegen
npm run typecheck
npm test
npm run build
```

## GitHub CI

[CI](.github/workflows/ci.yml) runs on pull requests and pushes to `main`:

- **App checks** installs locked dependencies with `npm ci`, then runs lint,
  Next.js route type generation, TypeScript, Vitest, and a production build.
- **Database checks** starts disposable local Postgres, replays every migration
  from scratch, runs the SQL permission/regression checks, and verifies that
  committed database types match the migrated schema.

Both jobs use Node.js 24. CI uses placeholders and mocks; no production,
Google, or TMDB secrets are needed. Google fonts are downloaded during the build.
Enable GitHub Actions after pushing this repository to GitHub, then require
**App checks** and **Database checks** in the `main` branch ruleset before merging.

## Production Supabase migrations

Treat `supabase/migrations` as the source of truth. Create a new migration with
`npx supabase migration new describe_the_change`, apply it locally with
`npm run supabase-db-migrate`, regenerate types with `npm run supabase-types`, and
commit the SQL and types together. Changes made in local Studio must also be
captured in a migration (for example with `npx supabase db diff -f describe_the_change`).
Once a migration has been deployed, add a new migration for further changes;
do not edit or rename an applied migration.

This follows [Supabase's recommended migration deployment approach](https://supabase.com/docs/guides/deployment/managing-environments).
The repository includes a manual
[Supabase production migrations](.github/workflows/supabase-production.yml)
workflow. It runs the same CI checks against the selected commit, then previews
pending production migrations. It only applies them when **Apply pending
migrations** is checked, and only runs from `main`. Deployments are serialized.

One-time GitHub setup:

1. Create a GitHub environment named **production**, restrict deployment branches
   to `main`, and configure required reviewers if available for your repository.
2. Add its environment variable `SUPABASE_PROJECT_REF`: your hosted production
   project's reference (the subdomain before `.supabase.co`).
3. Add its environment secrets `SUPABASE_ACCESS_TOKEN` (a Supabase personal or
   scoped access token with access to this project) and `SUPABASE_DB_PASSWORD`
   (the production database password). These are CLI credentials, not the app's
   publishable or service-role key. Keep them out of `.env.example` and git.

For a release, merge after CI passes. In **Actions → Supabase production
migrations → Run workflow**, choose `main` and leave **Apply pending migrations**
unchecked to review the migration list. Run again with it checked to apply the
reviewed migrations, then deploy the app version that depends on them. Every
run checks the selected commit again; review any new commits before applying.
The commands explicitly target the production project with `--remote=<ref>`;
the CLI never relies on a developer's local project link.

The workflow uses `--include-all` because the initial rooms migration
(`20261105143000`) predates the imported remote schema migration
(`20261105145208`) already recorded on the hosted project. This lets the CLI
apply older pending migrations as well as newer ones; it does not rerun versions
already recorded as applied. Review those older files in the preview too.

The workflow applies pending SQL only. It does not copy local users/data, run
seeds, reset production, or push local Auth configuration or Vault secrets.
Keep hosted Google OAuth credentials, Site URL, redirect URLs, and deployment
environment variables configured separately as described above.

Before the first deployment, compare `npx supabase migration list --remote=<ref>`
with the actual hosted schema. This project includes an imported remote schema
migration, and some early migrations may have been run manually in SQL Editor.
If a migration's changes already exist remotely but its version is missing from
history, verify the **complete** migration first, then mark only that version
with `npx supabase migration repair <version> --status applied --remote=<ref> --yes`.
Repair changes history, not the schema. Do not mark unapplied migrations as
applied or automatically repair a failed deployment; reconcile any partial
changes first. Preview again before applying anything.

Use backward-compatible migrations: add new fields/functions, deploy the app
using them, then remove old schema in a later release. The currently running
app must remain compatible while migrations run. Verify production backups
before changes that remove or rewrite data. Fix deployed schema issues with a
new migration; reverting app code does not undo a database migration. A separate
staging Supabase project is useful for rehearsing changes against realistic data
before production.
