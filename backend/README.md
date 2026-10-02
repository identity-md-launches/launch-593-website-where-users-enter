# Public submission service

This directory supplies the hosted part of the website: Supabase Postgres stores shared submissions, Supabase Auth's Twitter provider verifies the visitor's Twitter account, and an Edge Function confirms that session before publishing. Everyone can read every stored project without signing in.

The static export works without credentials as a clearly marked preview. To accept real submissions, provision the services below, configure the frontend, rebuild and publish `dist/`. No Supabase project or Twitter developer app was supplied with this assignment; this service has not been deployed.

## Deployment

1. Create a Supabase project. Enable the **Twitter** provider under Authentication → Providers with a Twitter developer app's API key and secret; the app's callback URL is `https://<project-ref>.supabase.co/auth/v1/callback`. Add the website's exact page URL(s) to Authentication → URL configuration → Redirect URLs.
2. Apply `supabase/migrations/202610020001_public_projects.sql` in the SQL editor, or for a CLI deployment run `supabase link --workdir backend --project-ref YOUR_PROJECT_REF` then `supabase db push --workdir backend`. Do not run both against the same database.
3. In the Edge Function secret manager set:

   | Name | Value |
   | --- | --- |
   | `ALLOWED_ORIGINS` | Comma-separated exact website origins, e.g. `https://pond.example,https://preview.example`. No trailing slash, wildcard or path. |

   Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to hosted Edge Functions automatically. The service-role key stays server-side. No other secret is required.
4. From the repository root deploy with `supabase functions deploy submit-project --workdir backend --project-ref YOUR_PROJECT_REF --no-verify-jwt`. The checked-in config sets `verify_jwt = false` because the gateway check would also accept the public anon key; the function instead asks Supabase Auth who the caller is.
5. Set the frontend's public Supabase URL and anon/publishable key as described in the root README and rebuild the export. The frontend sends the public key in `apikey` and the user's Supabase Auth access token as `Authorization: Bearer …` on submission.
6. Verify on the final public origin: verify with Twitter, submit a test project, and read `GET /rest/v1/projects` with the anon key. Check that anonymous POST/PATCH/DELETE requests to `/rest/v1/projects` are denied. Delete the test row through the dashboard if needed.

Use a CLI installed outside this repository. Its login token, service secrets and caches are not deliverables. Official references: [Supabase Twitter login](https://supabase.com/docs/guides/auth/social-login/auth-twitter), [Auth REST endpoints](https://supabase.com/docs/reference/auth), [Edge Function auth](https://supabase.com/docs/guides/functions/auth) and [row level security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Data and behavior

The five public details are Twitter username, project username, contract, project description and wallet. Records also contain a generated ID and creation timestamp. No access tokens, e-mail addresses or Supabase user IDs are stored.

`authenticate()` in `supabase/functions/submit-project/index.ts` calls `GET /auth/v1/user` with the caller's bearer token. Supabase Auth validates the token's signature, expiry and revocation and returns the user with its `identities`. The function requires an identity with `provider: "twitter"` and takes the handle from its `identity_data.user_name` (or `preferred_username`), which Supabase Auth copied from Twitter during OAuth. Editable `user_metadata` and any client-provided username or verification flag are ignored. A rejected token yields 401; a session without Twitter yields 403; neither reaches the database.

Project usernames accept 3–32 letters, digits, underscores or hyphens, stripping one leading `@`. Descriptions accept 20–1,000 characters; both addresses must be nonzero EVM addresses. Contract addresses are normalized to lowercase and are unique; duplicates return an actionable 409. The directory does not distinguish chains and does not verify contract deployment, wallet ownership or project claims. There is no user editing/deletion flow; operators manage rows in the dashboard.

RLS grants anonymous and authenticated visitors read access only. Inserts use the service-role key after verification. The function caps request bodies at 16 KiB, times out upstream calls, restricts browser origins and returns errors without server details. Per-account rate limits and content moderation are not included.

## Validation actually run

On 2026-10-02:

- `node backend/run-tests.mjs` (via `npm run test:backend`): **9 tests passed**. The runner compiles `core.ts` and the frontend transport with TypeScript into a temporary directory and runs Node's test runner. Covered: normalization, invalid inputs, trusted identity selection, rejected authentication, CORS/preflight, methods, body-size and malformed-JSON handling, duplicate/error responses, public unauthenticated reading, pagination and submission headers.
- `deno task --config backend/deno.json check` and `deno task --config backend/deno.json test`: **not run**. Deno is not installed on the machine used for this revision. `tests/auth.test.ts` was rewritten to mock `GET /auth/v1/user` (valid Twitter identity, rejected token, session without Twitter) and should be run before deployment. `deno.lock` was not edited (the assignment forbids lockfile changes); it still lists the `jose` package that the function no longer imports, which is harmless.

These tests do not establish a deployed service. Migration execution, live RLS, live Twitter OAuth, real Supabase Auth responses, hosted CORS configuration and cross-browser persistence remain deployment checks.
