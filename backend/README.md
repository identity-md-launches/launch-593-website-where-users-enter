# Optional managed submission service

Supabase Postgres stores the shared directory. The Edge Function validates three required project fields and the optional personal Twitter account and inserts with a server-held service key. Visitors can read and submit without an account. Twitter account and contract ownership are not verified.

This service is optional. The shipped static export now uses public Nostr relays without credentials; see the root README. Supplying both Supabase identifiers explicitly selects this managed provider instead. The validating function no longer persists or returns a wallet field. The new migration makes the historical wallet column nullable so submissions can omit it, without deleting earlier values. The original migrations remain unchanged. No hosted Supabase service was supplied or deployed during this update. Selecting a provider does not migrate records between services. The directory namespace chosen in the earlier release is retained for the shipped Nostr provider. Supabase rows are not deleted or reset; enabling a preexisting Supabase database would show its own directory.

## Deployment

1. Use the existing Supabase project if one is deployed. For a new project, apply `supabase/migrations/202610020001_public_projects.sql`. Do not replay table creation over an existing database.
2. Apply `supabase/migrations/202610060001_self_reported_submissions.sql` to update the table description. It changes no records, constraints or access policies. Then apply `supabase/migrations/202610060002_optional_personal_twitter.sql`: it allows an empty personal Twitter string and requires a valid project Twitter handle for new writes. The project-handle check is `NOT VALID` to preserve historical rows; existing invalid handles still need correction before updating those rows.
3. Apply `supabase/migrations/202610060003_remove_wallet_requirement.sql` before deploying the updated function. It drops only the wallet column’s `NOT NULL` requirement; its existing check permits NULL and still constrains any historical value. The new function inserts no wallet and explicitly excludes it from responses. This migration has not been run against a database in this assignment.
4. Set the Edge Function's server-side `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and comma-separated `ALLOWED_ORIGINS` (including `https://community.hackathon.sites.imd.fun` when used). Never place the service key in frontend configuration. Privy settings are no longer used.
5. Deploy `supabase/functions/submit-project/` as the `submit-project` function with JWT gateway verification disabled. The preserved `supabase/config.toml` already sets `verify_jwt = false`. Its old authentication comment is historical; configuration files are unchanged under this assignment's restrictions.
6. Configure only `supabaseUrl` and the public `supabaseAnonKey` in the frontend's `public/config.js`, rebuild and publish the complete `dist/` export. Deploy this endpoint before enabling the new form against it; the old endpoint still requires a wallet.
7. Check a live publish and a public read from another browser on the final origin, including a duplicate contract and an invalid submission. These are deployment checks, not results claimed here.

The database still permits anonymous SELECT only. Anonymous direct INSERT/UPDATE/DELETE remain disallowed by the existing grants and RLS policy; the function inserts with the service key. No browser storage is used as a substitute for shared persistence.

## Request contract

`POST /functions/v1/submit-project` accepts JSON with `twitterUsername`, `projectUsername`, `contract` and `description`. The public API key is supplied in `apikey`; no user bearer token is required. The handler returns the stored record with `id` and `createdAt` after a successful insert.

Handles accept 1–15 letters, numbers or underscores. Personal Twitter may be blank or omitted. The existing `projectUsername` property now holds the required project Twitter handle with the same 1–15-character format. A leading `@` and surrounding whitespace are normalized. Contracts must be nonzero `0x` EVM addresses and are stored in lowercase. Wallet fields sent by older callers are discarded. Descriptions accept 20–1,000 characters. Extra request properties are discarded, including verification claims.

The handler bounds the streamed body to 16,384 bytes, accepts JSON only, validates allowed browser origins, and returns recoverable errors for invalid input, duplicates and unavailable storage. CORS is a browser policy, not authentication or abuse prevention; clients without an Origin header can submit too. Moderation, rate limiting, edits and deletion are not implemented. Input validation and unique contracts do not prevent impersonation or spam.

## Local checks

From the repository root, install the locked frontend dependencies and run `npm run test:backend` for the handler/transport suite. From `backend/`, run:

```sh
deno task --frozen check
deno task --frozen test
```

The existing `tests/auth.test.ts` path is retained so the protected Deno task configuration does not need changing. Its tests now cover the public endpoint, normalized handles, invalid input and duplicate errors using mocked database responses. The existing unused `jose` lock entry is retained; the endpoint has no OAuth/JWT library import.

Actual command results and limitations are in [docs/rewards/validation.md](../docs/rewards/validation.md). Tests do not establish that migrations ran, production RLS works, or shared persistence is deployed.
