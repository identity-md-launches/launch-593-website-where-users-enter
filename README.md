# Pepe Collective

Restored the first website version, commit `91c8c03f61c6a7388afd76825b054fc600d5e3d6`: the forest-green hero and original Pepe artwork, light public directory, search, categories, sorting, full project details, information dialogs and Privy Twitter sign-in before the five-detail submission form. One responsive correction keeps all navigation destinations available at tablet widths.

`dist/` contains the finished static export alongside the source and unchanged `package-lock.json`. Without service configuration, the site provides six clearly labeled fictional examples. **Live Twitter sign-in and public publishing require a configured Privy app and Supabase backend.** No live service configuration was supplied; the preview explains unavailable sign-in and never pretends to publish.

## Install, preview and rebuild

Use Node.js 22 or newer:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. For the production export:

```sh
npm run typecheck       # TypeScript, no emit
npm test                # Directory, authentication and form tests
npm run test:backend     # Handler/transport compilation and tests
npm run build           # TypeScript + Vite -> dist/
npm run preview         # Serve the built export
```

A build-free preview also works with `python3 -m http.server 8080 --directory dist`. Serve over HTTP, rather than opening the HTML as a local file. For the backend's additional JWT tests, install Deno separately and run `deno task --frozen check` and `deno task --frozen test` from `backend/`.

This restoration used an isolated `/tmp` source copy for installation and builds, keeping dependency folders and caches outside the repository. All existing package manifests, lockfiles and build configuration remain unchanged. No ignore file was added or modified.

## Configure live submissions

1. Configure a Privy app with Twitter OAuth and allow the final website origin and exact callback URL. The adapter returns to the page's origin + pathname, including its static-host subpath. Frontend and backend must use the same Privy app ID.
2. Provision the database and Privy-verifying Edge Function described in [backend/README.md](backend/README.md). Keep service-role keys and Privy app secrets exclusively on the server.
3. Set **public identifiers only** in `public/config.js`:

   ```js
   window.PEPE_CONFIG = {
     privyAppId: 'your-public-privy-app-id',
     privyClientId: '',
     supabaseUrl: 'https://your-project.supabase.co',
     supabaseAnonKey: 'your-public-anon-or-publishable-key',
   };
   ```

4. Rebuild and publish `dist/`. `dist/config.js` remains a separate runtime script; if an operator edits that exported file, keep `public/config.js` synchronized for future builds.
5. On the final origin, complete Twitter login and publish a test project. Confirm the record appears in a separate signed-out browser and that anonymous database writes are rejected. These deployment checks have not been performed here.

The restored adapter uses the pinned `@privy-io/js-sdk-core` SDK with PKCE and browser-local sessions. It requires HTTPS or localhost and available browser storage. Optional Privy CAPTCHA handling and custom HTTP-only-cookie proxy sessions are not implemented. No wallet is connected, created or transacted with; the existing `viem` dependency supports the SDK.

The form publishes exactly five details: authenticated Twitter handle, project username, EVM contract address, project description and public EVM wallet address. All are public, with explicit consent before publishing. The server derives the Twitter identity from Privy rather than client input. Failed requests retain input; success follows a server-returned record. Closing the form discards an unfinished draft.

Usernames accept 3–32 letters, numbers, underscores or hyphens; descriptions accept 20–1,000 characters; addresses must be nonzero EVM addresses. One submission is allowed per contract address. Twitter authentication does not verify contract or wallet ownership. Example accounts/addresses are illustrative; category tags are discovery aids inferred from descriptions. Editing/deletion, moderation and rate limiting are not implemented.

## Publish the static site

Publish **all contents of `dist/`**, including `index.html`, `assets/`, `fonts/`, `images/`, `favicon.svg` and `config.js`. The publisher serves this export directly and needs no build step. The site's existing hosting name is `pepe-collective-small-frogs-big.site.identitymd.eth`; this task prepares its next version without performing a deployment.

Vite retains `base: './'`. Script/style/image URLs and the built CSS's font URLs are relative, and navigation uses hashes and dialogs. No server rewrite is required. Use a trailing slash when hosting at a subpath, and allowlist that exact URL for OAuth. Fonts and artwork are bundled locally; real authentication and persistence require their hosted services.

Keep generated dependencies, caches and archives outside Git. The delivered export contains only runtime assets and their licenses. [DESIGN.md](DESIGN.md) documents the implemented design; [licenses/NOTICE.md](licenses/NOTICE.md) preserves attribution.

## Checks actually performed

2026-10-02, Node 22.22.1, TypeScript 5.8.3, Vite 6.3.5, Vitest 3.2.3 and Deno 2.5.6:

| Check | Result |
| --- | --- |
| `npm ci --cache <temporary directory> --no-audit --no-fund` | Passed; 203 locked packages installed outside the repository. |
| `npm run typecheck` | Passed, exit 0. |
| `npm test` | 20 tests passed across authentication, directory interactions and submission flows. |
| `npm run test:backend` | 9 tests passed. |
| `deno task --frozen check` / `deno task --frozen test` | Passed; 3 JWT/identity tests passed. Lockfile unchanged. |
| `npm run build` | Passed after the final source changes; clean `dist/` copied back. |
| Chromium production export at `/preview/` | Search, categories, empty/reset, sort, details/copy, keyboard dialogs, mobile/tablet navigation and unavailable-auth recovery passed. No horizontal overflow at 320, 390, 672, 673, 768, 880, 1024 or 1440 CSS pixels. |
| Browser form fixtures | Verified required fields/consent, first-error focus, failed-save retention, retry and successful directory insertion with intercepted SDK/API responses. No live authentication or persistence claim. |
| Better Interface | All six domains reviewed. The tablet navigation omission was fixed. axe-core 4.13.0 reported zero violations in checked directory, sign-in, information and form states; two dialog scans left contrast items requiring manual review. |
| Final unconfigured preview | All eight initial document/runtime requests returned 200; both fonts loaded; console reported 0 errors and 0 warnings. |

Build notices: `config.js` is intentionally left as a runtime script; the lazy Privy chunk is 718.23 kB, above Vite's advisory 500 kB threshold. It is not loaded by the unconfigured preview.

See [docs/validation.md](docs/validation.md) for findings, evidence, screenshots, byte accounting and limitations. No live OAuth, database/RLS deployment, screen-reader session, physical device, Firefox/Safari check or browser-native zoom was performed. Root-font enlargement was checked separately. These are worker-side results, not independent certification.
