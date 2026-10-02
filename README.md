# Pepe Collective

A responsive, green project directory for people building with AI. The React/TypeScript site includes custom Pepe artwork, public project cards, search, category filters, sorting, complete project details, and a five-detail submission form gated by Privy Twitter authentication.

**Delivered state:** `dist/` is a complete static preview with six clearly labeled fictional examples. Real Twitter sign-in and shared public submissions require your Privy app and a deployed Supabase backend. No credentials were provided, so neither service has been deployed or claimed to work live. The preview does not fake authentication, save local submissions, or represent examples as real projects.

## Install and run

Use Node.js 22 or newer and npm:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Dependencies use the checked-in `package-lock.json`; do not submit `node_modules/`, package caches, or service secrets.

```sh
npm run typecheck
npm test
npm run test:backend
npm run build
npm run preview
```

`npm run build` runs TypeScript and writes the production export into `dist/`. `npm run preview` serves that export. For a build-free preview, `python3 -m http.server 8080 --directory dist` also works. Serve over HTTP rather than opening `index.html` as a `file:` URL.

## Enable real Twitter sign-in and public submissions

1. Create a Privy app and enable Twitter OAuth. Allow the final website origin and exact callback URL, including any hosting subpath. The callback is the page's origin + pathname, without its hash. The frontend and backend must use the same Privy app ID.
2. Deploy the SQL migration and authenticated Edge Function using [backend/README.md](backend/README.md). Privy app secrets and the Supabase service-role key belong only in the Edge Function's secret manager.
3. Edit `public/config.js` with these **public** identifiers:

   ```js
   window.PEPE_CONFIG = {
     privyAppId: 'your-public-privy-app-id',
     privyClientId: '', // Optional public Privy client ID
     supabaseUrl: 'https://your-project.supabase.co',
     supabaseAnonKey: 'your-public-anon-or-publishable-key',
   };
   ```

4. Run `npm run build` and publish the resulting `dist/`. The file `dist/config.js` is runtime configuration, so a hosting operator can also update its public identifiers without rebuilding JavaScript; update the source copy as well for future builds.
5. On your actual public domain, complete Twitter login, publish a test project, and confirm it appears in another signed-out browser. Verify anonymous insert/update/delete attempts are rejected. These live deployment checks were not possible here.

The auth adapter uses the official, pinned, low-level `@privy-io/js-sdk-core` SDK with OAuth PKCE and browser local-storage sessions. It requires HTTPS (or localhost) and accessible browser storage. **Privy CAPTCHA-enabled login is not implemented**: use an app without that optional setting, or implement supported CAPTCHA handling before enabling it. Custom HTTP-only-cookie proxy sessions are also outside this adapter. See [auth implementation notes](artifacts/auth-notes.md) and [Privy's CAPTCHA documentation](https://docs.privy.io/authentication/user-authentication/captcha). No wallets are connected, created, or transacted with; `viem` is an SDK dependency only.

## What gets published

The form collects exactly five project details: Twitter account (read-only after verification), project username, contract address, project description, and wallet address. All five are public. A separate consent checkbox explains this before publishing. Form data stays in memory until submission; closing the dialog discards an unfinished draft.

The server validates the Privy token and retrieves its subject from Privy to derive the Twitter account. It ignores any client-provided Twitter identity. Anonymous users can read the directory; only the server can insert a validated submission. A failed request preserves the form, and success appears only after the server returns a stored record.

Assumptions: addresses are nonzero EVM addresses; usernames are 3–32 letters/numbers/underscores/hyphens; descriptions are 20–1,000 characters. One submission is allowed per contract address, regardless of chain. Twitter verification does not prove contract/wallet ownership. Cards classify descriptions by agent/tool keywords, falling back to Community; these categories are discovery aids, not submitted claims. There is no wallet transaction, project endorsement, user editing/deletion flow, or moderation/rate-limit system. Operators can manage records in Supabase.

## Publish the static export

Upload **the contents of `dist/`** to your static host, including `assets/`, `fonts/`, `images/`, `favicon.svg`, and `config.js`. The host does not need Node or a build step. Keep `dist/index.html` alongside its assets in the submission; do not upload only the source.

Vite uses `base: './'`. Exported script, CSS, image and font URLs resolve relative to the page and support a gateway subpath. Navigation uses hashes/native dialogs, so no SPA rewrite rules are required. Fonts and artwork are bundled locally; real authentication and database operations still require the configured hosted services. If hosting under `/some/path/`, use its trailing-slash URL and allowlist that exact OAuth return URL.

No ignore file was added or changed. During this assignment dependencies, package caches and builds ran in `/tmp/pepe-collective-build`; the clean finished export and lockfile were copied back. No generated dependency directories or archives are included. See the byte accounting in [validation](artifacts/validation.md).

## Checks actually performed

On 2026-10-02, with Node 22.22.1, TypeScript 5.8.3 and Vite 6.3.5:

| Check | Actual result |
| --- | --- |
| `npm run typecheck` | Passed, exit 0. |
| `npm run build` | Passed, exit 0; final `dist/` inspected and cleaned of stale chunks. |
| `npm test` | 20 tests passed: auth/session/callback handling, directory interactions and form validation/submission/error flows. |
| `npm run test:backend` | 9 tests passed: validation, trusted identity, CORS, request bounds, duplicates, pagination and transport. |
| `deno task --config backend/deno.json check` | Passed using Deno 2.5.6. |
| `deno task --config backend/deno.json test` | 3 signed-JWT tests passed, with Privy/database HTTP responses mocked. |
| Chromium production preview | `/preview/` checked at 320, 390, 768, 1024 and 1440 CSS pixels; no page overflow at those widths. Search, filters, sort, complete details, keyboard dialogs, mobile navigation and unavailable-auth recovery exercised. |
| Form browser fixture | The production UI was exercised with intercepted test-only auth/API responses: five fields, consent, failure retention, retry and successful card insertion. This is not live OAuth or persistence evidence. |
| Accessibility | axe-core 4.10.3 reported no violations in the checked directory, sign-in, information dialog and authenticated form fixture states. Keyboard focus, text enlargement, reduced motion and selected contrast pairs were also checked. |

The production build reports two nonfatal notices: `config.js` is intentionally a separate runtime script, and the lazy-loaded Privy chunk is over Vite's 500 kB advisory size. The auth chunk is not loaded by the unconfigured preview. Initial installation failed because the default npm cache was read-only; installing with a temporary cache succeeded. Initial local preview port 4173 was occupied; checks ran on 4188 instead.

See [artifacts/validation.md](artifacts/validation.md) for all six Better Interface domains, observed findings and fixes, screenshots, coverage and limits. No live Twitter OAuth, deployed Supabase/RLS, physical device, screen reader, native browser zoom, or full accessibility certification is claimed. [DESIGN.md](DESIGN.md) documents the final source. [licenses/NOTICE.md](licenses/NOTICE.md) preserves design-guide, font and artwork attribution.
