# PTC Garage database backup and recovery

## Automated backup

The GitHub Actions workflow `.github/workflows/supabase-backup.yml` runs daily at 01:30 UTC and can also be started manually. It creates a PostgreSQL 17 custom-format dump, verifies that the dump can be read, calculates a SHA-256 checksum, and stores it as a private GitHub Actions artifact for 14 days.

### One-time setup

1. Open the GitHub repository **Settings → Secrets and variables → Actions**.
2. Select **New repository secret**.
3. Name it `SUPABASE_DB_URL`.
4. Paste the PostgreSQL connection URI from the Supabase Dashboard → Project Settings → Database → Connection string. Use the direct connection when the runner can reach it; otherwise use the session pooler connection string.
5. Save the secret. Never put the URI in source code, an issue, a pull request, or a chat message.
6. After this workflow is merged to `main`, open **Actions → Supabase database backup → Run workflow** once and confirm the run succeeds.
7. Confirm the artifact named `ptc-garage-db-backup-...` is present and download it to a company-controlled secure location periodically.

The workflow cannot run successfully until the repository secret is configured. GitHub Actions artifacts are temporary (14-day retention); keep separate long-term copies in an approved company backup location.

## Restore procedure

A database restore is a maintenance operation and can overwrite live data. Do not restore over production without an approved maintenance window and a verified copy of the current database.

1. Download the required `.dump` artifact and its `.sha256` file.
2. Verify the checksum with `sha256sum -c <backup-file>.sha256`.
3. Prefer restoring into a separate Supabase project first and validate the application against it.
4. Restore with a PostgreSQL 17 client and a destination connection string:
   ```bash
   pg_restore --clean --if-exists --no-owner --no-acl --dbname="$RESTORE_DB_URL" <backup-file>.dump
   ```
5. Review extensions, database roles, Auth configuration, Storage objects, Edge Functions, and project secrets separately before any production cutover.

**Important:** A PostgreSQL dump does not include objects stored in Supabase Storage, Vercel environment variables, or external service secrets. Back up Storage objects and deployment configuration separately. The dump contains operational and potentially personal data, so restrict artifact access to trusted repository maintainers.

## Current limitations

- This workflow backs up the PostgreSQL database only.
- It does not automatically restore data.
- The GitHub Actions artifact is a short-retention copy, not a substitute for a company-approved long-term backup vault.
- Supabase Free projects do not receive Supabase-managed daily backups; use regular external exports. Pro, Team, and Enterprise plans include scheduled database backups.
