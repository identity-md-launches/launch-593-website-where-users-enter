# Identity MD hackathon · Pepe Collective

The existing green Pepe Collective website now opens its five-field submission form directly, without Twitter sign-in. Twitter usernames are entered by the submitter and are not verified. The directory contains only published records: fictional preview projects and the AI agents, Developer tools and Community filters have been removed. **All projects**, search, sorting, project details and address copying remain available.

The hero artwork, “Small pepes” headline, hackathon description and `https://hackathon.sites.imd.fun/` metadata are preserved. The finished static export is in `dist/`, alongside the source and existing `package-lock.json`.

## Install, preview and rebuild

Use Node.js 22 or newer:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. To check and rebuild:

```sh
npm run typecheck
npm test
npm run test:backend
npm run build
npm run preview
```

A build-free preview also works with `python3 -m http.server 8080 --directory dist`. Serve over HTTP instead of opening `index.html` as a local file. Backend entry-point checks use Deno: from `backend/`, run `deno task --frozen check` and `deno task --frozen test`.

The dependency manifests, lockfiles and existing build configuration were left unchanged. The unused Privy dependency remains in the protected manifest but is no longer imported or bundled. This assignment installed packages, built and ran checks in an isolated `/tmp` source copy; no dependency directories, caches, ignore-file changes or submodules were added to the repository.

## Public submissions

Without backend configuration, the directory is empty and the form explains that publishing is unavailable. Form validation works, but no details are stored and no success is claimed. Closing the form discards its unfinished draft.

For shared persistence:

1. Provision or update the Supabase service described in [backend/README.md](backend/README.md). Deploy the updated `submit-project` Edge Function: the old endpoint requires a Twitter token and is incompatible with this frontend. Existing records and database access policies remain intact.
2. Set public identifiers in `public/config.js`:

   ```js
   window.PEPE_CONFIG = {
     supabaseUrl: 'https://your-project.supabase.co',
     supabaseAnonKey: 'your-public-anon-or-publishable-key',
   };
   ```

3. Rebuild and publish `dist/`. Keep `public/config.js` synchronized if changing the exported `dist/config.js` directly.
4. Verify a submission on the final origin and confirm it appears in another browser. Live database, hosted endpoint and production-origin checks have not been performed in this assignment.

All five details become public after explicit consent: Twitter username, project username, EVM contract, project description and EVM wallet. Twitter handles accept 1–15 letters, numbers or underscores; project usernames accept 3–32 letters, numbers, underscores or hyphens; descriptions accept 20–1,000 characters. Addresses must be nonzero EVM addresses. Optional leading `@` and surrounding whitespace are normalized. A contract may appear only once.

Neither account nor address ownership is verified. There is no wallet connection, transaction or OAuth flow. The server validates input and retains database write credentials server-side. Publishing is open to visitors; moderation, rate limiting, edits and deletion are not implemented. Failed saves retain entered details; success requires a server-returned record.

## Publish

Publish **every file inside `dist/`**: `index.html`, `assets/`, `fonts/`, `images/`, `favicon.svg` and `config.js`. The publisher serves this export directly without rebuilding. Source, lockfile and the complete export are included in this submission.

Vite retains `base: './'`. Runtime assets use relative URLs and navigation uses hashes/dialogs, so the export supports static gateway subpaths without server rewrites. Use a trailing slash for a hosted subpath. Local artwork and fonts work without external visual services; shared publishing requires the configured backend.

The intended public URL remains **https://hackathon.sites.imd.fun/**. Domain/DNS/HTTPS and the original ENS/IPFS publisher mapping are external hosting settings; this job did not change or verify them. Set the backend's `ALLOWED_ORIGINS` for the actual site origin. No on-chain action or deployment was performed.

Keep dependencies, caches and archives out of Git at every nesting level. Do not publish historical documentation screenshots as site assets. [DESIGN.md](DESIGN.md) describes the implemented design; [licenses/NOTICE.md](licenses/NOTICE.md) retains guide attribution.

## Validation

Actual results for this update are recorded in [docs/validation.md](docs/validation.md), including production build, typecheck, interaction checks, the six-domain Better Interface review and remaining limitations. Older records and screenshots describe earlier versions and are not evidence for this release.

On 2026-10-06, with Node 24.21.0:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed. |
| `npm test` | 11 frontend interaction tests passed. |
| `npm run test:backend` | 9 handler/transport tests passed. |
| `deno task --frozen check` / `deno task --frozen test` | Typecheck passed; 3 endpoint tests passed with Deno 2.9.6. |
| `npm run build` | Passed; the complete 493,957-byte export is in `dist/`. |
| Chromium production-export checks at `/preview/` | Passed at eight widths (320–1440px); no page overflow or unexpected resource/console failures. Keyboard/form/navigation and mocked public-publishing interactions passed. |
| Better Interface | All six domains reviewed; applicable findings fixed. axe-core found zero violations in the checked desktop directory and validation-form states. |

Vite reports that the separate runtime `config.js` is not bundled; it loaded correctly in the export. No live service publication, database migration, domain change, screen-reader session, physical-device check or native browser-zoom test was performed. Current screenshots and detailed evidence are linked from the validation record. The deliverable is below the 8 MiB limit with no bundled dependency caches.
