# PTC Garage Management

Fresh Next.js application for PTC Garage operations. This repository is separate from the legacy Google Sheets app and the previous Supabase project.

## Stack
- Next.js 16 / React 19
- Supabase Auth + Postgres
- Role-based portals: Admin, Supervisor, Store Keeper

## Local setup
1. Install Node.js 20.9 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
5. Run `npm run dev`.

## User ID login
The login screen maps a User ID to the internal Auth email alias `<userid>@ptc-garage.local`. Accounts must be provisioned server-side in Supabase Auth and receive the correct trusted `app_metadata` role/site claims. Never expose a Supabase secret/service-role key in browser code.

Database project: `pphixxcazzcydidcrnmi`.
