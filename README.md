# Identity MD community hackathon

The existing green Pepe Collective site now starts with a fresh public project directory. Personal Twitter is optional; project Twitter, contract, description, wallet and public-sharing consent remain required. The wallet hint explains where hackathon winner funds will be sent. Canonical metadata, Open Graph metadata and the footer link use **https://community.hackathon.sites.imd.fun/**.

The ready-to-publish static export is in `dist/`, alongside the source and unchanged `package-lock.json`. No sign-in, wallet connection or blockchain transaction is needed.

## Install, preview and rebuild

Use Node.js 22 or newer and npm:

```sh
npm ci
npm run dev
```

Check and rebuild:

```sh
npm run typecheck
npm test
npm run test:backend
npm run build
npm run preview
```

Vite prints the preview address. For a preview without installing dependencies, run `python3 -m http.server 8080 --directory dist` and open `http://localhost:8080/`. Use HTTP on localhost, not a `file:` URL. Production hosting needs HTTPS for browser cryptography and secure WebSockets.

The package manifest, lockfiles and build configuration are preserved. Local fonts, artwork and required third-party licenses are included. Unused authentication/wallet dependencies remain in the protected manifest but are not imported by the site.

## Fresh directory and submission behavior

`public/config.js` and the service's default both use the new directory tag:

```js
window.PEPE_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  relayUrls: ['wss://relay.damus.io', 'wss://relay.primal.net', 'wss://nostr.mom'],
  directoryTag: 'identitymd-593-community-hackathon-v2',
};
```

The earlier `identitymd-593-projects-v1` records are excluded from reads and duplicate checks in this fresh directory. New submissions appear normally for all visitors. This clears the website's list; it does not erase copies already held by independent public relays. Keep the new tag unchanged across rebuilds so new projects remain discoverable. Do not override it with the old tag when publishing.

- Personal Twitter may be empty or whitespace. If provided, it must be a valid 1–15-character handle.
- The existing `projectUsername` property now represents **Project Twitter account**. It is required and accepts 1–15 letters, numbers or underscores, with an optional leading `@`. It is linked to the project's X profile. Ownership is self-reported.
- A nonzero EVM contract address, a 20–1,000-character description, and a nonzero public EVM wallet address remain required. The wallet receives hackathon winner funds; this site does not send funds.
- All submitted details become public only after consent and Publish project. Personal Twitter is stored as `''` when absent; details show “Not provided” without a broken link, and cards fall back to the project handle.

The existing Nostr transport signs the payload using a one-use random transport key, discarded after signing. This key is unrelated to a wallet or account. Success requires acknowledgment **and fresh readback from at least two relays**. Reads validate signatures and fields, merge records, and exclude other directory tags. There is no localStorage fallback. Search, sorting, full details, address copying, refresh and retry remain available. Refresh failure preserves previously loaded records.

Public relay availability and retention are outside this website's control. Editing, moderation, deletion and account verification are not implemented. Duplicate-contract handling is a display/transport rule, not proof of ownership or transactional uniqueness. A partially saved record can be public even if confirmation fails; retry reuses its signed event.

The optional managed provider is documented in [backend/README.md](backend/README.md). Its validator and new migration also accept omitted personal Twitter while enforcing project Twitter. Supabase is not configured in the shipped export; its existing records are not reset. No database migration or hosted service was executed here.

## Publish and hostname handoff

Upload **all contents of `dist/`** to the static publisher: `index.html`, `assets/`, `config.js`, `fonts/`, `images/`, `licenses/` and `favicon.svg`. The publisher serves these export files directly and does not rebuild. Source and the original lockfile accompany the export.

Vite retains `base: './'`; built assets use relative URLs. The site uses hash navigation and native dialogs, so it needs no server route rewrites. Use a trailing slash on gateway subpaths. Rebuild after editing `public/config.js` and publish the whole export together.

**Publisher action still required:** map `community.hackathon.sites.imd.fun` to this export, replacing the former `pepe-collective-small-frogs-big.sites.imd.fun` site address. The supplied project notes say normal publishing keeps the existing hosted name, so metadata alone cannot rename it. This workspace provides no hosting/DNS administration capability. If the platform supports it, redirect the former hostname to the new one, then verify HTTPS, assets, project reads and submission on the final address. No hosted rename or deployment is claimed by this delivery.

Do not submit dependency folders, package caches, registry mirrors, archives or submodules. Do not change the protected build files. The complete submission must remain below 8 MiB.

## Actual validation

This release was checked on 2026-10-06 with Node 24.21.0 and npm 11.6.2:

| Command | Actual result |
| --- | --- |
| `npm run typecheck` | Passed. |
| `npm test` | 29 frontend tests passed: optional personal Twitter, required remaining fields, consent, errors, retries, details, search/sort, directory reset, signatures and relay behavior. |
| `npm run test:backend` | 10 handler/transport tests passed, including omitted personal Twitter and mandatory project Twitter. |
| `npm run build` | Passed; the final complete export is included in `dist/`. |

Dependencies were installed with the unchanged manifest/lockfile in `/tmp/imd-community-build`; these commands ran against copied final sources there to avoid touching repository `node_modules/`. npm was bootstrapped outside the repository. The produced export was copied back and compared byte-for-byte. Chromium 141 browser checks passed against `/preview/`: eight directory widths (320–1440px), optional-field submission via mocked relays, a fresh reader, keyboard navigation, details/copy and failed-refresh recovery. A read-only check of the real relays returned an empty directory. No live test submissions were published. axe-core reported no automatic violations in the three checked states; some contrast checks remained incomplete. Vite's existing notice about the separate non-module `config.js` is expected; that runtime configuration must remain a separate file.

Current browser results, the six-domain Better Interface review, corrected findings, delivery-size check and concrete limitations are in [docs/community/validation.md](docs/community/validation.md), with raw browser evidence in [docs/community/browser-results.json](docs/community/browser-results.json). [DESIGN.md](DESIGN.md) records the implemented design. The older `docs/` reports and screenshots describe previous releases, not this validation. Attribution remains in [licenses/NOTICE.md](licenses/NOTICE.md).
