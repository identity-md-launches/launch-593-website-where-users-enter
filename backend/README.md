# Public submission service

Supabase Postgres stores the shared directory. The Edge Function validates all five self-reported fields and inserts with a server-held service key. Visitors can read and submit without an account. Twitter account, contract and wallet ownership are not verified.

No hosted service configuration was supplied and this update does not deploy the service. The unconfigured static export presents an empty directory and explains that publishing is unavailable.

## Deployment

1. Use the existing Supabase project if one is deployed. For a new project, apply `supabase/migrations/202610020001_public_projects.sql`. Do not replay table creation over an existing database.
2. Apply `supabase/migrations/202610060001_self_reported_submissions.sql` to update the table description. It changes no records, constraints or access policies.
3. Set the Edge Function's server-side `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and comma-separated `ALLOWED_ORIGINS` (including `https://hackathon.sites.imd.fun` when used). Never place the service key in frontend configuration. Privy settings are no longer used.
4. Deploy `supabase/functions/submit-project/` as the `submit-project` function with JWT gateway verification disabled. The preserved `supabase/config.toml` already sets `verify_jwt = false`. Its old authentication comment is historical; configuration files are unchanged under this assignment's restrictions.
5. Configure only `supabaseUrl` and the public `supabaseAnonKey` in the frontend's `public/config.js`, rebuild and publish the complete `dist/` export. Deploy this endpoint before enabling the new form against it; the old endpoint expects a Twitter session.
6. Check a live publish and a public read from another browser on the final origin, including a duplicate contract and an invalid submission. These are deployment checks, not results claimed here.

The database still permits anonymous SELECT only. Anonymous direct INSERT/UPDATE/DELETE remain disallowed by the existing grants and RLS policy; the function inserts with the service key. No browser storage is used as a substitute for shared persistence.

## Request contract

`POST /functions/v1/submit-project` accepts JSON with `twitterUsername`, `projectUsername`, `contract`, `description` and `wallet`. The public API key is supplied in `apikey`; no user bearer token is required. The handler returns the stored record with `id` and `createdAt` after a successful insert.

Handles accept 1–15 letters, numbers or underscores. Project usernames accept 3–32 letters, numbers, underscores or hyphens. A leading `@` and surrounding whitespace are normalized. Contracts and wallets must be nonzero `0x` EVM addresses; contracts are stored in lowercase. Descriptions accept 20–1,000 characters. Extra request properties are discarded, including verification claims.

The handler bounds the streamed body to 16,384 bytes, accepts JSON only, validates allowed browser origins, and returns recoverable errors for invalid input, duplicates and unavailable storage. CORS is a browser policy, not authentication or abuse prevention; clients without an Origin header can submit too. Moderation, rate limiting, edits and deletion are not implemented. Input validation and unique contracts do not prevent impersonation or spam.

## Local checks

From the repository root, install the locked frontend dependencies and run `npm run test:backend` for the handler/transport suite. From `backend/`, run:

```sh
deno task --frozen check
deno task --frozen test
```

The existing `tests/auth.test.ts` path is retained so the protected Deno task configuration does not need changing. Its tests now cover the public endpoint, normalized handles, invalid input and duplicate errors using mocked database responses. The existing unused `jose` lock entry is retained; the endpoint has no OAuth/JWT library import.

Actual command results and limitations are in [docs/validation.md](../docs/validation.md). Tests do not establish that migrations ran, production RLS works, or shared persistence is deployed.
