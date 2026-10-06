# Identity MD hackathon · Pepe Collective

Anyone can now submit a project without signing in or configuring a private backend. The finished static site in `dist/` stores submissions on three public Nostr relays and loads the shared directory for every visitor. The green Pepe artwork, hackathon copy, five-field form, All projects view, search, sorting and project details are preserved.

Publishing succeeds only after **two independent relays acknowledge the submission and return a valid stored copy on a new connection**. This is shared network storage, not localStorage. A live submission from the production export was retrieved in a separate browser context after refresh and reload; test records use separate validation directories and do not appear in the public hackathon directory.

## Install, preview and rebuild

Use Node.js 22 or newer and the supplied, unchanged lockfile:

```sh
npm ci
npm run dev
```

To validate and build:

```sh
npm run typecheck
npm test
npm run test:backend
npm run build
npm run preview
```

Vite prints the preview URL. For a build-free preview, use `python3 -m http.server 8080 --directory dist`. Open the site over HTTP on localhost, not as a `file:` URL. Production hosting must use HTTPS for browser cryptography and secure WebSockets.

The original package manifest, lockfiles and build configuration are unchanged. Signing uses the existing locked `@noble/curves` 1.9.1 and `@noble/hashes` 1.8.0 packages; their MIT licenses are included in the export. Privy and wallet packages in the protected manifest remain unused by the frontend. Development dependencies and caches are not part of the deliverable.

## Public storage and behavior

The default settings in `public/config.js` work without API keys:

```js
window.PEPE_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  relayUrls: ['wss://relay.damus.io', 'wss://relay.primal.net', 'wss://nostr.mom'],
  directoryTag: 'identitymd-593-projects-v1',
};
```

`src/services/public-directory.ts` publishes signed Nostr kind-1 events containing the five fields and the schema `identitymd-project-v1`. The site’s tag keeps these records discoverable as one directory. A random signing key is generated in memory for each new submission and discarded after signing; no account, wallet connection, extension, transaction or user-held key is required. Event IDs, signatures, schema, namespace and field values are validated before display. The transport follows the [Nostr NIP-01 event and relay protocol](https://github.com/nostr-protocol/nips/blob/master/01.md).

- All five fields become public after explicit consent. Records are also readable outside this website. Editing and removal are not available here; other people may retain copies.
- Twitter handles accept 1–15 letters, numbers or underscores. Project usernames accept 3–32 letters, numbers, underscores or hyphens. Descriptions accept 20–1,000 characters. Contract and wallet fields require nonzero EVM addresses. Oversized pasted addresses are rejected without silently shortening them.
- The form checks for an existing contract before writing. Reads merge copies by event ID and contract; competing claims use the earliest signed event timestamp, then event ID. This is a display rule, not a transactional uniqueness guarantee or proof of ownership. Accounts, wallets and contracts remain self-reported.
- Reads require two completed relay responses; writes require two acknowledgements **and** readbacks. A failed or uncertain save keeps the form values. Retrying unchanged details in the same page reuses the signed event, so an interrupted save is not duplicated. After reloading, search for the contract before resubmitting.
- The directory loads on each visit and refreshes on window focus, every 60 seconds while visible, and via **Refresh projects**. Failed refresh retains already loaded cards and offers **Try again**. A successful local publication cannot be erased by an earlier request completing late.
- Connections have 10-second timeouts. History retrieval uses overlapping 250-event pages, a 20-second traversal deadline checked between pages, and a 40-page ceiling. Stalled timestamp pages and oversized histories report a load failure rather than pretending to be complete. Dense histories of 250 or more events at one second need a larger-scale index/provider.

**Storage limitations:** these independent public relays are third-party services with their own availability, rate limits and retention policies. Replication and readback confirm storage at publication time, not permanent archival. There is no moderation, ownership verification, spam protection or recovery/edit account. A relay signature establishes record integrity, not the truth of the submitted claims. The site remains readable as a static page when services are unreachable, but shared reads and writes need connectivity to enough relays. Do not share private information.

Keep the production directory tag stable. Changing it starts a separate directory. Changing relay sets requires copying the signed history to the new relays first; this site does not migrate it automatically. Hosting with a Content Security Policy must permit `connect-src` to the configured `wss:` relay origins.

## Optional Supabase provider

The existing Supabase integration remains available in [backend/README.md](backend/README.md). Supplying both public Supabase identifiers selects that provider instead of Nostr. It uses the preserved Edge Function and Postgres policies. Never place a service-role key in frontend configuration. Changing providers does not migrate data. No Supabase account, credentials or service deployment were supplied or created for this update.

## Publish

Upload **all contents of `dist/`** to the static publisher, including `index.html`, `assets/`, `config.js`, `fonts/`, `images/`, `licenses/` and `favicon.svg`. The publisher serves these committed export files directly; it does not rebuild. Source and the existing `package-lock.json` accompany the export.

Vite retains `base: './'`. Built script/style/font/artwork URLs are relative; hash navigation and native dialogs require no server route rewrites. The export was tested at `/preview/`. Use a trailing slash for gateway subpaths. Local fonts and artwork are bundled.

The intended public URL remains **https://hackathon.sites.imd.fun/** under the existing publisher/ENS mapping. This assignment prepares the next static export; it does not change DNS, deploy to that origin or perform any on-chain action. Rebuild after changing `public/config.js` and publish the whole export together. Do not add dependency folders, package caches, registry mirrors or archive bundles to Git.

## Actual validation

On 2026-10-06, using Node 24.21.0, npm 11.19.0 and Chromium 154:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed. |
| `npm test` | 24 tests passed: form consent/validation/retry, directory interactions, signed events, multi-relay persistence, duplicates, timeouts, readback and pagination. |
| `npm run test:backend` | All 9 existing Supabase handler/transport tests passed. |
| `npm run build` | Passed; complete relative-path export included in `dist/`. |
| Production export / live storage | Real relay writes and independent-browser reads passed, including reload with empty browser storage. |
| Responsive / keyboard | Checked widths from 320 to 1440px, form errors, focus, mobile navigation, details, copy, search and offline recovery. |
| Better Interface | All six domains reviewed; applicable findings fixed. axe-core found zero automatic violations in checked directory/form states, with some contrast checks incomplete. |

The separate runtime `config.js` causes Vite’s expected “can’t be bundled” notice; its production request succeeded. The complete command results, evidence, review findings and limitations are in [docs/validation.md](docs/validation.md). [DESIGN.md](DESIGN.md) describes the final implemented design; [licenses/NOTICE.md](licenses/NOTICE.md) retains attribution. Physical devices, screen-reader sessions, native browser zoom, long-term relay retention and the final hosted origin have not been verified. The Deno suite was not rerun because the optional backend code is unchanged.
