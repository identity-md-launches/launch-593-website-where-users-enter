# Pepe Collective

A single-action website: the "pepes armed with AI" artwork fills the screen, everything is green, and the only visible control is **Submit a project**. The dialog behind it verifies the visitor's Twitter account, then collects the five public details (Twitter account, project username, contract address, project description, wallet address).

This revision removes Privy. Twitter verification now runs through **Supabase Auth's Twitter provider** using its REST API directly (OAuth with PKCE) from `src/auth.tsx`; the Edge Function in `backend/` confirms the session with Supabase Auth before storing a submission. There is no wallet connection and no third-party auth SDK in the bundle.

**Delivered state:** `dist/` is a complete static export. Without configured public identifiers it shows the page and dialog, and the verification button explains that Twitter verification is not available in the preview. Real verification and shared public submissions need a Supabase project configured as described below. No credentials were supplied, so neither was deployed or exercised live here.

## Install and run

Use Node.js 22 or newer and npm:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Dependencies come from the checked-in `package-lock.json`; do not submit `node_modules/`, package caches or secrets.

```sh
npm run typecheck      # tsc --noEmit
npm test               # vitest: tests/**/*.test.tsx
npm run test:backend   # node backend/run-tests.mjs (handler + transport)
npm run build          # tsc --noEmit && vite build -> dist/
npm run preview        # serve dist/
```

`npm run build` writes the production export into `dist/`. For a build-free preview, `python3 -m http.server 8080 --directory dist` also works. Serve over HTTP rather than opening `index.html` as a `file:` URL.

The manifest and lockfile were not changed in this revision because the assignment forbids editing them. They still list `@privy-io/js-sdk-core` and `viem`, which nothing imports any more; Vite does not bundle them. Removing those two entries and refreshing the lockfile is a one-line follow-up once manifest edits are allowed.

## Enable Twitter verification and public submissions

1. Create a Supabase project. In **Authentication → Providers**, enable **Twitter** with an API key and secret from a Twitter developer app whose callback URL is `https://<project-ref>.supabase.co/auth/v1/callback`.
2. In **Authentication → URL configuration**, add the website's exact page URL to the redirect allow list, for example `https://your.site/` or `https://gateway.example/ipfs/<cid>/`. The frontend returns to `window.location.origin + pathname`, so a gateway subpath must be listed.
3. Deploy the SQL migration and the Edge Function using [backend/README.md](backend/README.md). Set `ALLOWED_ORIGINS` for the function. Supabase supplies the function's URL and keys itself; no auth secret is needed anywhere in this repository.
4. Edit `public/config.js` with the **public** identifiers:

   ```js
   window.PEPE_CONFIG = {
     supabaseUrl: 'https://your-project.supabase.co',
     supabaseAnonKey: 'your-public-anon-or-publishable-key',
   };
   ```

5. Run `npm run build` and publish `dist/`. `dist/config.js` is a separate runtime script, so an operator can also update the identifiers in the export without rebuilding; keep the source copy in sync for future builds.
6. On the real public origin: open the page, choose **Submit a project → Verify with Twitter**, complete the Twitter login, submit a test project, and confirm it appears through the public REST read (`GET /rest/v1/projects` with the anon key). Confirm anonymous insert, update and delete attempts are rejected. These live checks were not possible here.

### How verification works

- **Verify with Twitter** generates a PKCE verifier, stores it in local storage, remembers that the dialog should reopen, and sends the browser to `/auth/v1/authorize?provider=twitter&code_challenge=…`.
- Supabase Auth completes the Twitter OAuth exchange and returns to the page with `?code=…`. The adapter exchanges it at `/auth/v1/token?grant_type=pkce`, removes the single-use parameters from the address bar, and keeps the session (access token, refresh token, expiry, handle) in local storage.
- The Twitter handle is read only from the `twitter` entry in the user's `identities`, which Supabase Auth populates from the provider. Editable `user_metadata` is ignored on both client and server.
- Sessions refresh with `/auth/v1/token?grant_type=refresh_token` when the stored token is about to expire. **Not you? Sign out** inside the form clears the session and calls `/auth/v1/logout`.
- The Edge Function receives the user's access token, asks Supabase Auth (`GET /auth/v1/user`) who it belongs to, requires a Twitter identity, and stores the handle it returns. Client-supplied identity fields are discarded.

Twitter verification confirms access to the account. It does not prove ownership of the contract or wallet, and the site does not endorse submissions.

## What gets submitted

The form collects exactly five details: Twitter account (read-only after verification), project username, contract address, project description and wallet address. All five are public; a consent checkbox states this before submitting. Form data stays in memory until it is sent, and a failed request keeps everything entered so it can be retried. Closing the dialog discards an unfinished draft.

Assumptions: addresses are nonzero EVM addresses; usernames are 3–32 letters, numbers, underscores or hyphens; descriptions are 20–1,000 characters; one submission per contract address. There is no directory page any more (the request removed all other text and controls), but every stored submission remains publicly readable through the Supabase REST API, and `fetchProjects` in `src/lib/submissions.ts` still reads them if a listing is wanted later.

## Publish the static export

Upload **the contents of `dist/`**: `index.html`, `assets/`, `fonts/`, `images/`, `favicon.svg` and `config.js`. The host needs no Node or build step. Vite uses `base: './'`, so script, style, font and image URLs are relative and work under a gateway subpath or an ENS name. There is no client-side routing, so no rewrite rules are needed. If hosting under `/some/path/`, use its trailing-slash URL and add that exact URL to the Supabase redirect allow list.

No ignore file was added or changed. Dependencies were installed into `node_modules/` for the checks below and removed before submission; no generated dependency directories or archives are included.

## Checks actually performed

On 2026-10-02 with Node 22.23.3, TypeScript 5.8.3, Vite 6.3.5 and Vitest 3.2.3:

| Check | Actual result |
| --- | --- |
| `npm run typecheck` | Passed, exit 0. |
| `npm test` | 18 tests passed in 3 files: Supabase Auth adapter (preview fail-closed, stored session reuse and refresh, PKCE callback exchange and URL cleanup, cancelled callbacks, missing Twitter identity, OAuth start parameters), single-action page (one button, dialog open/close, focus return, resume after redirect) and the submission form (gate, validation and focus, consent, token use, failure retention, expired session). |
| `npm run test:backend` | 9 tests passed: validation, trusted identity, CORS, request bounds, duplicates, pagination and transport. |
| `npm run build` | Passed, exit 0; `dist/` regenerated after the last source change. The one notice (`config.js` is not bundled) is intentional. |
| Deno tasks (`backend/deno.json`) | **Not run.** Deno is not installed on this machine. `backend/tests/auth.test.ts` was rewritten for the new function but has not been executed. |
| Chromium production export | `dist/index.html` opened at 1440×900, 390×844 and 320×568 CSS pixels; no horizontal overflow at any width, nor at 320px with the root font size at 200%. Keyboard: Tab reaches the only button with a visible ring, Enter opens the dialog, Escape closes it and focus returns to the button. Console had no errors or warnings on the unconfigured page; all eight static resources loaded with relative URLs. |
| Form browser fixture | With `dist/config.js` temporarily pointed at `http://localhost:1` and a verified session seeded in local storage: the dialog reopened on the form; empty submit marked all five controls invalid, showed errors beside them and focused the first; valid data produced a network failure message with every value and the consent state kept; **Sign out** returned to the verification step with no stale error. The fixture config was restored afterwards. This is not live OAuth or persistence evidence. |
| Better Interface review | Six domains reviewed; see [docs/validation.md](docs/validation.md). |

Limitations: no live Twitter OAuth, no deployed Supabase project or RLS run, no Deno execution, no screen reader, no physical device, and no browser-native zoom (root font enlargement was used instead). The browser tool could not write screenshot files into this workspace, so screenshots were inspected inline and are not committed. [DESIGN.md](DESIGN.md) documents the final source; [licenses/NOTICE.md](licenses/NOTICE.md) keeps design-guide, font and artwork attribution.
