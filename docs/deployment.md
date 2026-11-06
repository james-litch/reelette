# Deployment

[Back to README](../README.md)

## Application environment

Set these variables in Vercel (or your deployment host):

- `NEXT_PUBLIC_SUPABASE_URL`: hosted project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: hosted public client key.
- `TMDB_ACCESS_TOKEN`: server-only TMDB API Read Access Token.

## Hosted Supabase Auth

Enable Google under **Authentication → Sign In / Providers** and save the
Google OAuth client credentials there. Local `config.toml` does not configure
hosted Auth.

Set the production **Site URL** and allow `https://YOUR_DOMAIN/auth/callback`
under **Authentication → URL Configuration**. Register the production origin and
`https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` with the Google OAuth
client. Keep the local callback registered if using the same client locally.

Enable Supabase Realtime. If using only private channels, public channel access
can be disabled in Realtime Settings.

## Schema changes

Treat [supabase/migrations](../supabase/migrations) as the source of truth.
Create a new migration, apply it locally, regenerate types, and commit both:

```bash
npx supabase migration new describe_the_change
# Write the SQL in the new migration.
npm run supabase-db-migrate
npm run supabase-types
npm run supabase-db-test
```

Capture Studio changes with `npx supabase db diff -f describe_the_change`.
Never edit or rename deployed migrations. Prefer backward-compatible changes:
add schema, deploy the app using it, then remove old schema in a later release.
App rollbacks do not undo database migrations.

## Production migration workflow

One-time GitHub setup: create a **production** environment restricted to `main`,
with variable `SUPABASE_PROJECT_REF` and secrets `SUPABASE_ACCESS_TOKEN` and
`SUPABASE_DB_PASSWORD`. The access token must have access to that project;
these are CLI credentials, not app keys. Add required reviewers if available.

After merging with CI passing:

1. Open **Actions → Supabase production migrations → Run workflow** on `main`.
2. Leave **Apply pending migrations** unchecked to preview pending SQL.
3. Review the migrations, then rerun with the option checked to apply them.
4. Deploy the app version that depends on the schema changes.

The [workflow](../.github/workflows/supabase-production.yml) reruns CI for the
selected commit and serializes migrations. Review any new commits between runs.
It explicitly targets the production project and applies SQL only; it does not
copy local data, run seeds, or configure hosted Auth or Vault secrets.

The workflow uses `--include-all` because the initial rooms migration predates
an imported remote schema migration. It applies pending older versions without
rerunning recorded ones, so review older migrations in the preview too.

For a legacy/manual deployment, compare migration history with the actual schema.
Only use `supabase migration repair` after verifying a migration's complete
changes already exist; repair updates history, not schema. Reconcile partial
changes before retrying. Verify backups before destructive changes.

See [Supabase's migration deployment guide](https://supabase.com/docs/guides/deployment/managing-environments).
