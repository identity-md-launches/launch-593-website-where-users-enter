# Identity MD community hackathon

The existing green Pepe Collective website provides a public project directory. Wallet address collection has been removed from the form, validation, submission payloads and project details. Its replacement text is:

> Rewards will be sent directly to the winners deployer addresses

Personal Twitter remains optional. Project Twitter, EVM contract address, project description and public-sharing consent remain required. The site displays payout information; it does not discover deployer addresses or transfer rewards.

The complete static export is in `dist/`, alongside the source and unchanged `package-lock.json`. No sign-in, wallet connection or blockchain transaction is needed.

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

Vite prints the preview address. To preview the included export without dependencies, run `python3 -m http.server 8080 --directory dist` and open `http://localhost:8080/`. Use HTTP on localhost rather than `file:`. Production hosting needs HTTPS for browser cryptography and secure WebSockets.

Build configuration, manifests and lockfiles are unchanged. Unused authentication/wallet dependencies remain in the protected manifest but are not imported by the site. For this assignment, dependencies were installed outside the repository; see the validation record for the exact build location and commands.

## Submission and compatibility

`public/config.js` selects the existing public Nostr provider with directory tag `identitymd-593-community-hackathon-v2` and relays `wss://relay.damus.io`, `wss://relay.primal.net`, and `wss://nostr.mom`. Keep this tag across rebuilds so current submissions stay discoverable. The older `identitymd-593-projects-v1` namespace remains excluded.

- Personal Twitter can be blank; supplied handles and the required project Twitter accept 1–15 letters, numbers or underscores. A leading `@` is normalized.
- The contract must be a nonzero EVM address; descriptions contain 20–1,000 characters. Twitter and contract ownership are self-reported.
- New records contain the four remaining fields, with personal Twitter stored as `''` when omitted. Signed legacy records that contain a wallet remain readable; the frontend discards that field and no longer displays it. Public copies of earlier records are not erased.
- Publishing requires consent, acknowledgments and fresh readback from at least two relays. A one-use signing key is discarded after signing and is unrelated to any wallet. There is no localStorage fallback.
- Search, sorting, full project details, contract copying, refresh and retry remain available. Failed refresh preserves previously loaded projects. A partially saved submission may be public before confirmation; retry reuses its signed event.

Relay availability and retention depend on independent services. Editing, moderation, deletion and ownership verification are not implemented. Duplicate handling is not proof of ownership or transactional uniqueness.

The [optional Supabase backend](backend/README.md) also omits wallet fields. Before enabling it, apply `202610060003_remove_wallet_requirement.sql` and deploy the updated function: the previous database schema and endpoint require a wallet. The migration preserves historical values. Supabase is not configured in the included export; no hosted migration or deployment was performed.

## Publish

Upload **all contents of `dist/`**: `index.html`, `assets/`, `config.js`, `fonts/`, `images/`, `licenses/` and `favicon.svg`. The publisher serves this export without rebuilding. Include source, the existing manifest/lockfile and export in the submission.

Vite retains `base: './'`; production assets use relative URLs. Hash navigation and dialogs require no route rewrites. Use a trailing slash at a gateway subpath. Rebuild after changing source or `public/config.js`, then publish the complete export together.

The supplied hosting record identifies `pepe-collective-small-frogs-big.site.identitymd.eth` as the existing hosted name. Canonical/Open Graph metadata still uses `https://community.hackathon.sites.imd.fun/`; that hostname is not displayed in the footer. Metadata does not change DNS or hosting. This assignment does not claim deployment, a hostname change or an on-chain action.

Keep dependency folders, caches, registry mirrors, package archives and submodules out of the submission, including nested paths. The delivery-size report accounts for all source, export and documentation files against the 8 MiB limit. No ignore file was changed.

## Actual validation — 2026-10-06

Node 24.21.0, npm 11.19.0. Commands ran against copied final source in `/tmp/imd-rewards-build-rcv5it_o`, installed from the unchanged manifest and lockfile. The resulting export was copied back byte-for-byte.

| Command | Actual result |
| --- | --- |
| `npm run typecheck` | Passed. |
| `npm test` | 30 frontend tests passed, including wallet-free submission, legacy record compatibility, consent, retry, search, sorting, copying and relay validation. |
| `npm run test:backend` | 10 handler/HTTP-client tests passed, including omission and discarding of obsolete wallet data from persistence payloads. |
| `npm run build` | Passed; complete production export included. Vite's existing non-module `config.js` notice remains; the separate runtime script loaded successfully. |
| `BROWSER_TOOLS_ROOT=/tmp/imd-rewards-browser CHROMIUM_PATH=/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome node artifacts/browser-check.mjs` | Passed against the final export at `/preview/`. The retained script is now at `docs/rewards/browser-check.mjs`; only its output directory was changed afterward. |

Chromium 153 checked widths from 320 to 1440px, keyboard publication without a wallet, exact reward copy, public consent/errors, success focus, project details, contract copying, search/reset, sorting, fresh-reader/reload, refresh failure/retry and mobile navigation. No horizontal overflow, console errors or failed HTTP resources occurred in the fixture run. Three axe scans reported zero violations, with contrast items needing manual review; selected form contrast pairs were measured separately. Screenshots were inspected, including the mobile reward notice and tablet keyboard focus.

Public writes were simulated with intercepted relay fixtures; no live test submission was published. The supplied browser tool also inspected the production form at desktop/mobile sizes and focus return. Native 200% zoom, screen readers, physical devices, other browser engines, live persistence, database migration and Deno-only checks were not performed.

The six-domain Better Interface review, findings, commands, screenshots, measured contrast and limitations are recorded in [docs/rewards/validation.md](docs/rewards/validation.md), alongside [browser results](docs/rewards/browser-results.json) and [delivery size](docs/rewards/delivery-size.json). [DESIGN.md](DESIGN.md) describes the final implemented design. Earlier reports under `docs/` describe earlier releases. Guidance attribution remains in [licenses/NOTICE.md](licenses/NOTICE.md).
