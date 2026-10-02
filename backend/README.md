# Public submission service

This directory supplies the hosted part of the website: Supabase Postgres stores shared submissions, and an Edge Function verifies a Privy session before publishing. Everyone can read every stored project without signing in. Local browser storage is not a shared directory.

The static export works without credentials as a clearly marked preview. To accept real submissions, provision the services below, configure the frontend, rebuild and publish `dist/`. No live project, Privy app or credentials were supplied with this assignment; this service has not been deployed.

## Deployment

1. Create a Supabase project and a Privy app. Enable Twitter OAuth in Privy and configure the website's allowed domains and OAuth redirect URLs. The frontend Privy app ID and server `PRIVY_APP_ID` must match.
2. Apply `supabase/migrations/202610020001_public_projects.sql` using the Supabase SQL editor. For a fresh CLI deployment, `supabase link --workdir backend --project-ref YOUR_PROJECT_REF` followed by `supabase db push --workdir backend` applies the checked-in migration instead. Do not run both migration methods against the same database.
3. In the Supabase dashboard's Edge Function secret manager, set:

   | Name | Value |
   | --- | --- |
   | `PRIVY_APP_ID` | The same public app ID used by the frontend. |
   | `PRIVY_APP_SECRET` | Privy's server app secret. Never put this in frontend config. |
   | `PRIVY_VERIFICATION_KEY` | Your app's **authentication** verification public key in PEM/SPKI format (`BEGIN PUBLIC KEY`). Literal `\n` separators or real newlines are accepted. This is not a wallet authorization key. |
   | `ALLOWED_ORIGINS` | Comma-separated exact origins, e.g. `https://pond.example,https://preview.example`. No trailing slash, wildcard or path. |

   Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically to hosted Edge Functions. The service-role key remains server-side. Update the verification key when rotating the Privy authentication key.
4. From the repository root deploy with `supabase functions deploy submit-project --workdir backend --project-ref YOUR_PROJECT_REF --no-verify-jwt`. The checked-in config also sets `verify_jwt = false`: the function verifies a **Privy** JWT itself; Supabase's built-in check expects Supabase Auth credentials and would reject it.
5. Set the frontend's public Supabase URL, public anon/publishable key and Privy app ID as described in the root README. Rebuild the static export. The frontend transport uses only the public key in `apikey`; an actual Privy access token is sent as `Authorization: Bearer ...` on submission.
6. Verify on the final public origin: sign in through Twitter, submit a test project, and open the directory in a separate signed-out browser. Check that direct anonymous POST/PATCH/DELETE requests to `/rest/v1/projects` are denied. Delete the test row through the authenticated Supabase dashboard if needed.

Use a CLI installed outside this repository. Its login token, service secrets, caches and local database files are not deliverables. Privy and Supabase require network connectivity at runtime. See official [Privy access-token verification](https://docs.privy.io/authentication/user-authentication/access-tokens), [Privy user lookup](https://docs.privy.io/api-reference/users/get), [Supabase function authentication headers](https://supabase.com/docs/guides/functions/auth-headers) and [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Data and behavior

The five public details are Twitter username, project username, contract, project description and wallet. Records also contain a generated ID and creation timestamp. No private profile data, access tokens, email addresses or Privy user IDs are stored.

The server verifies the JWT's ES256 signature, `privy.io` issuer, app audience, expiry and required subject/issued-at claims using pinned `jose`. It fetches the verified subject's current user object directly from Privy and requires a linked `twitter_oauth` account. Client-provided Twitter usernames and verification flags are discarded. Privy API credentials never enter the browser.

Project usernames accept 3–32 letters, digits, underscores or hyphens, stripping one leading `@`. Descriptions accept 20–1,000 characters; both addresses must be nonzero EVM addresses (`0x` plus 40 hexadecimal digits). Contract addresses are normalized to lowercase. The database permits one submission per contract address globally; duplicates return an actionable 409. This directory does not distinguish chains and does not verify contract deployment, wallet ownership or project claims. Published entries have no user editing/deletion flow; an operator can manage them through the database dashboard.

RLS grants anonymous and authenticated visitors read access only. Inserts use the service-role key after Privy verification. The function caps request bodies at 16 KiB, times out upstream calls, restricts browser origins and returns errors without server details. CORS is not authentication: non-browser requests without an `Origin` header still require the same valid Privy token. API reads are intentionally public. Per-account rate limits and content moderation are not included.

`src/lib/submissions.ts` reads all records in 250-row pages and removes duplicate IDs if the directory changes during a multi-page read. Sorting is newest first. A concurrently changing directory can require Refresh to obtain a consistent latest view. Requests time out after 20 seconds; retrying a write that already persisted returns the duplicate-contract error instead of creating a second record.

## Validation of this restoration

On 2026-10-02, the restored backend was checked in an isolated copy with the existing dependencies and lockfiles:

- `npm run test:backend`: **9 tests passed**, including TypeScript compilation of the request handler and frontend transport, normalization, trusted identity, invalid input, rejected authentication, CORS, request bounds, duplicates, public reads and pagination.
- From `backend/`, `deno task --frozen check`: **passed** with Deno 2.5.6.
- From `backend/`, `deno task --frozen test`: **3 tests passed** with synthetic ES256 tokens and mocked Privy/database responses. Valid Twitter identity succeeds; invalid signatures/claims and missing Twitter identity are rejected.
- `deno.json` and `deno.lock` were unchanged. No live service was deployed or contacted by the tests.

The existing `supabase/config.toml` was preserved under this assignment's build-configuration restriction. Its `verify_jwt = false` remains correct for the restored function; its historical comment about Supabase Auth describes the superseded version. The function now validates Privy JWTs as documented above.

Repeat the Node suite after installing frontend dependencies, using `npm run test:backend`. For Deno, install it separately and run the two tasks above inside `backend/`. Deno uses an external package cache; no dependency directories belong in the submission.

SQL migration execution, live RLS enforcement, Twitter OAuth, real Privy responses, hosted CORS and shared persistence remain unverified because no deployed service configuration was provided. See [the complete validation record](../docs/validation.md).
