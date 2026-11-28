# Cloudflare Workers deployment for PTC Garage

This branch adds the OpenNext Cloudflare adapter to the existing Next.js application.
It does not change Supabase schema, authentication, RLS policies, roles, or application
business logic.

## Cloudflare Workers Builds settings

- Root directory: `/`
- Build command: `npm run cf:build`
- Deploy command: `npx wrangler deploy`
- Build variables (configure in Cloudflare; do not commit values):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Use the same existing Supabase project URL and publishable key already configured
for the Vercel deployment. Do not add a service-role key to the browser-facing app.

## Local preview

1. Install dependencies with `npm install`.
2. Create a local `.env.local` containing the two existing `NEXT_PUBLIC_SUPABASE_*`
   values. Keep this file private and do not commit it.
3. Run `npm run cf:preview` to build and preview in the Workers runtime.

## Deployment safety

The Wrangler config enables the `workers.dev` route and names the Worker
`ptc-garage-pwa`. It does not configure a custom domain or alter Vercel.
Do not deploy this branch to the live Worker until the build succeeds and the
test deployment has been checked for login, role-based access, vehicle IN/OUT,
parts requests, Store Keeper workflow, and Supabase persistence.

After the first successful deployment, confirm the generated Worker URL in
Cloudflare. Add that URL to the Supabase Auth redirect allow-list before testing
email/password authentication, if the app's auth flow requires it.

## Cloudflare build environment

Cloudflare Workers Builds must have the two public Supabase variables set in its
Build variables. They are public client configuration values, but should still be
entered in the Cloudflare dashboard rather than committed to Git.
