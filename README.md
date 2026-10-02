# Identity MD hackathon · Pepe Collective

The existing Pepe Collective site now uses **Small pepes** in its hero, collective dialog, footer and page title. The hero includes the requested text: “Identity MD hackathon, organised by the community. Judged by IMD ai agents”. The canonical URL, Open Graph URL and visible footer link point to **https://hackathon.sites.imd.fun/**. The forest-green artwork, light public directory and submission flow remain in place. Mobile information dialogs now return keyboard focus to the menu button when closed.

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

This update used an isolated `/tmp` source copy for installation and builds, keeping dependency folders and caches outside the repository. All existing package manifests, lockfiles and build configuration remain unchanged. No ignore file was added or modified.

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

The existing adapter uses the pinned `@privy-io/js-sdk-core` SDK with PKCE and browser-local sessions. It requires HTTPS or localhost and available browser storage. Optional Privy CAPTCHA handling and custom HTTP-only-cookie proxy sessions are not implemented. No wallet is connected, created or transacted with; the existing `viem` dependency supports the SDK.

The form publishes exactly five details: authenticated Twitter handle, project username, EVM contract address, project description and public EVM wallet address. All are public, with explicit consent before publishing. The server derives the Twitter identity from Privy rather than client input. Failed requests retain input; success follows a server-returned record. Closing the form discards an unfinished draft.

Usernames accept 3–32 letters, numbers, underscores or hyphens; descriptions accept 20–1,000 characters; addresses must be nonzero EVM addresses. One submission is allowed per contract address. Twitter authentication does not verify contract or wallet ownership. Example accounts/addresses are illustrative; category tags are discovery aids inferred from descriptions. Editing/deletion, moderation and rate limiting are not implemented.

## Publish the static site

Publish **all contents of `dist/`**, including `index.html`, `assets/`, `fonts/`, `images/`, `favicon.svg` and `config.js`. The publisher serves this export directly and needs no build step. Publish at **https://hackathon.sites.imd.fun/** and configure that hostname in the hosting provider, including its required DNS mapping and HTTPS certificate. Update Privy's allowed origin to `https://hackathon.sites.imd.fun`, its callback URL to `https://hackathon.sites.imd.fun/`, and the backend's `ALLOWED_ORIGINS` to include `https://hackathon.sites.imd.fun` before enabling live submissions. No particular DNS record target is assumed: use the value supplied by the hosting provider.

**Domain routing is a remaining deployment step.** This repository sets the intended URL; editing canonical metadata does not change DNS or the publisher's domain mapping. The supplied history describes a prior ENS/IPFS hosting name. No hosting-management capability or production service configuration was available in this assignment, so neither the live hostname nor provider allowlists were changed or verified. No redirect from the previous hostname is implemented.

Vite retains `base: './'`. Script/style/image URLs and the built CSS's font URLs are relative, and navigation uses hashes and dialogs. No server rewrite is required. Use a trailing slash when hosting at a subpath, and allowlist that exact URL for OAuth. Fonts and artwork are bundled locally; real authentication and persistence require their hosted services.

Keep generated dependencies, caches and archives outside Git. The delivered export contains only runtime assets and their licenses. [DESIGN.md](DESIGN.md) documents the implemented design; [licenses/NOTICE.md](licenses/NOTICE.md) preserves attribution.

## Checks actually performed

2026-10-02, Node 22.22.1, TypeScript 5.8.3, Vite 6.3.5, Vitest 3.2.3 and Chromium 145.0.7632.6:

| Check | Result |
| --- | --- |
| `npm ci --cache /tmp/imd-hackathon-npm-cache --no-audit --no-fund` | Passed; 203 locked packages installed in an isolated `/tmp` project copy. |
| `npm run typecheck` | Passed after the final source change. |
| `npm test` | 21 tests passed: directory/navigation (6), authentication (9), submission (6). Includes the new mobile-dialog focus regression. |
| `npm run test:backend` | 9 handler/transport tests passed; backend unchanged. |
| `npm run build` | Passed after the final source change; complete export copied to `dist/`. |
| Production export under `/preview/` | Requested content/metadata, hash navigation, search, categories, empty/reset, sort, details, copying, keyboard dialogs and unavailable-auth recovery passed. |
| Responsive review | No page or new-paragraph horizontal overflow at 320, 390, 672, 673, 768, 880, 1024 and 1440 CSS pixels. Viewed desktop, mobile and tablet screenshots. |
| Better Interface | All six domains reviewed; mobile-menu focus defect reproduced, fixed and rechecked. axe-core 4.13.0 reported zero violations in directory, collective-dialog and sign-in states; dialog contrast incompletes received selected manual measurements. |
| Final resource/console check | Eight document/runtime responses returned 200 or 304; both fonts loaded; zero console errors, warnings or failed requests. |

Build notices: `config.js` intentionally remains a separate runtime script; the existing lazy Privy chunk is 718.23 kB, above Vite's advisory 500 kB threshold. Required runtime chunks are retained.

See [docs/validation.md](docs/validation.md) for the current review, measured pairs, screenshots, byte accounting and limitations. The [restoration record](docs/validation-restoration.md) is historical, not a fresh run. No live OAuth, real public write, production DNS/HTTPS, provider allowlist change, Deno JWT rerun, screen-reader session, physical device, Firefox/Safari or browser-native zoom check was performed. Authenticated submission behavior was tested with mocked services; text enlargement was checked separately. These results are worker-reported, not independent certification.
