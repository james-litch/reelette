# Reelette

A movie request app built with Next.js, shadcn/ui, and Supabase Auth.

## Run locally

Install dependencies, copy `.env.example` to `.env.local`, and fill in the two
values from your Supabase project's **Connect** dialog:

```bash
npm install
cp .env.example .env.local
npm run dev
```

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Use the publishable key, not a secret or service-role key. Restart the development
server after changing environment variables. Without these values, the public
homepage still renders, but sign-in cannot connect.

## Configure Google sign-in

1. Create a Supabase project at [Supabase](https://supabase.com/dashboard).
2. In [Google Auth Platform](https://console.cloud.google.com/auth/overview),
   configure the app's branding and audience. Add your Google account as a test
   user if the app is in testing. Enable the `openid`, `userinfo.email`, and
   `userinfo.profile` scopes.
3. Create an OAuth client with **Web application** as its type. Set the authorized
   JavaScript origin to `http://localhost:3000`. Set the authorized redirect URI to
   your Supabase project's callback URL, copied from **Authentication → Sign In /
   Providers → Google** (usually
   `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`).
4. In Supabase's Google provider settings, enable Google and save that OAuth
   client ID and client secret. The Google client secret belongs in Supabase's
   provider settings; the app only needs the two public values above.
5. Under **Authentication → URL Configuration**, set the Site URL to
   `http://localhost:3000` and add `http://localhost:3000/auth/callback` to the
   redirect allow list.
6. Open the app and click **Sign in with Google**. A successful sign-in takes you
   to `/account`, where you can see your email and sign out.

For deployment, add the same Supabase environment variables to your host, use your
production URL as Supabase's Site URL, add
`https://YOUR_DOMAIN/auth/callback` to Supabase's redirect allow list, and add your
production origin to the Google OAuth client. Keep the Supabase callback URL as
Google's authorized redirect URI.

The app uses a PKCE code exchange and cookie-based sessions. `proxy.ts` refreshes
sessions before server rendering; `/account` independently verifies the user
with Supabase Auth. The homepage and header reflect the signed-in session.

References: [Supabase SSR setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[Google provider setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
