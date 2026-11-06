# Reelette

Create a room, collect movie requests, and pick what to watch together.
Built with Next.js, shadcn/ui, Supabase, and TMDB.

## Run locally

Use Node.js 24 and Docker. Configure a Google OAuth client using the
[local development guide](docs/development.md#google-sign-in).

```bash
npm install
cp .env.example .env
```

Fill in the Google OAuth credentials in `.env` and add `TMDB_ACCESS_TOKEN` to
`.env.local`, then start the app:

```bash
npm run supabase-start
npm run supabase-db-migrate
npm run supabase-env
npm run dev
```

Open [localhost:3000](http://localhost:3000). Supabase Studio runs at
[127.0.0.1:54323](http://127.0.0.1:54323).

`supabase-env` writes local public credentials to `.env.development.local`,
which overrides `.env.local` during development. Restart Next.js after changing
environment variables. Local users and data are separate from production.

## Checks

```bash
npm run lint
npx next typegen
npm run typecheck
npm test
npm run supabase-db-test  # Requires local Supabase
npm run build
```

[GitHub CI](.github/workflows/ci.yml) checks the app, database migrations,
permissions, and generated types on pull requests and pushes to `main`.

## Documentation

- [Domain README](docs/domain/README.md): rooms, members, requests, and random selection.
- [Local development](docs/development.md): Google sign-in, database commands, and seed data.
- [Deployment](docs/deployment.md): environment variables, hosted Auth, and production migrations.
