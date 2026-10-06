# Community hackathon update — validation

Date: 2026-10-06. This is worker-run evidence for the final source and `dist/`, not independent certification. Earlier files under `docs/` describe previous deliveries.

## Scope and assumptions

Kept the existing Vite/React/TypeScript site, local artwork/fonts, green design, public relay storage and five-field form. Changed the directory namespace, intended public URL, personal Twitter requirement, project Twitter labeling/validation, omitted-handle display, and wallet payout hint. Updated the optional Supabase validator and supplied an additive constraint migration; no database was accessed.

The existing `projectUsername` field represents project Twitter, matching the requested required project contact. A fresh namespace clears the displayed list without claiming that third-party relay copies can be deleted. New records remain public and discoverable. No user accounts, wallet connection, blockchain actions or funds transfers were added.

## Executed checks

Node 24.21.0, npm 11.6.2; unchanged dependency manifest/lockfile installed with `npm ci --ignore-scripts --no-audit --no-fund` in `/tmp/imd-community-build`. Source, tests and original configuration were copied there. Commands used the temporary npm CLI, e.g. `node /tmp/imd-community-tool/package/bin/npm-cli.js --prefix /tmp/imd-community-build run build`. Repository `node_modules/` was not created or modified.

| Check | Result |
| --- | --- |
| `npm run typecheck` | Exit 0 on final source. |
| `npm test` | Exit 0: 29 tests across three files. Covers omitted and malformed personal handles (including retries), the four required fields, mandatory project Twitter, consent, focus, pending/success/failure/retry, search/sort/details, old-directory exclusion, shared new records, signatures, relay readback, duplicate handling, pagination and timeouts. |
| `npm run test:backend` | Exit 0: 10 tests. The changed optional-backend validator accepts missing/blank personal Twitter and rejects missing project Twitter; transport/error checks also pass. |
| `npm run build` | Exit 0 after the final source change. Vite transformed 1,601 modules; final JS is `assets/index-BJIo3dgW.js`. The separate runtime `config.js` produces the preexisting non-module bundling notice and is copied into the export as intended. |
| `diff -rq dist /tmp/imd-community-build/dist` | Exit 0 after copying the complete final export. Old JS bundle removed. |
| Production-browser interactions | Chromium 141.0.7390.37; Playwright 1.56.1. Served actual `dist/` at `/preview/` using a bounded foreground script which closes its HTTP server and browser. Result and individual checks: [browser-results.json](browser-results.json). |
| Real public directory read | Fresh namespace returned 0 projects and its empty state, with no load error. Read only; no live test records were published. |
| Browser submission and second visitor | Real production code with deterministic WebSocket relay fixtures; personal Twitter blank/whitespace; valid project Twitter and required fields; consent; two-copy ACK/readback; success focus; fresh browser context and reload both read the stored test record. This is not evidence of a new live relay write. |
| Browser navigation and recovery | Keyboard form entry/completion, first invalid field, Escape/mobile-menu focus return, search/no-results/reset, sort control, project Twitter link, omitted-personal display, address copy, failed refresh preserving cards and retry recovery passed. |
| Resources/console | No page exceptions, console errors, failed requests or HTTP resource failures in the deterministic production run. Local Inter and Space Grotesk report loaded. |
| Automatic accessibility scan | axe-core: zero reported violations in empty-directory, invalid-form and project-detail states. `color-contrast` had incomplete checks in each state; this is not a claim of complete accessibility compliance. |

The supplied MCP browser was attempted and could not start: Chrome was missing at `/opt/google/chrome/chrome`. The isolated browser fallback initially lacked runtime libraries and font configuration, causing blank rendering/timeouts. All browser packages, shared libraries, fonts and caches were installed/extracted under `/tmp`; after adding a temporary font configuration, the checks completed. Nothing from that setup is included in the submission.

### Reproducing the browser check

On a host with Chromium's system dependencies available, install review tools outside the repository:

```sh
npm install --prefix /tmp/community-browser-tools playwright@1.56.1 @axe-core/playwright@4.10.2
PLAYWRIGHT_BROWSERS_PATH=/tmp/community-browsers /tmp/community-browser-tools/node_modules/.bin/playwright install chromium
BROWSER_TOOLS_ROOT=/tmp/community-browser-tools PLAYWRIGHT_BROWSERS_PATH=/tmp/community-browsers CHECK_LIVE=1 node docs/community/browser-check.mjs
```

`CHECK_LIVE=1` adds a read-only live directory request. The default run uses isolated relay fixtures. The script generates the JSON and screenshots alongside itself. During this mission the equivalent command used `BROWSER_TOOLS_ROOT=/tmp/imd-community-browser`, `PLAYWRIGHT_BROWSERS_PATH=/tmp/imd-community-browsers`, `LD_LIBRARY_PATH=/tmp/imd-community-libs/usr/lib/x86_64-linux-gnu`, and `FONTCONFIG_FILE=/tmp/imd-community-libs/fonts.conf`. These are temporary tool paths, not runtime site dependencies.

## Better Interface coverage

Read the pinned workflow, the core principles and verification guidance in all six domains, relevant form/focus guidance, and the design-documentation method. Kept established tokens/components; no unrelated redesign. Screenshots were opened and visually inspected, in addition to source review and automated checks.

| Domain | Coverage and evidence | Limitations |
| --- | --- | --- |
| Accessibility — Checked | Native labels and `required` states, explicit optional text, linked hints/errors, first-invalid focus, keyboard publishing, consent, busy/success states, native dialogs/Escape/focus return, visible project/wallet focus screenshots, axe scans. Reduced-motion transition measured `0s`; forced-colors focus measured solid 3px. | No screen-reader session, physical device, full focus-background contrast audit or native 200% browser zoom. Forced-colors check is computed-style evidence, not a screenshot of every state. |
| Layout — Checked | Directory widths 320, 390, 672, 673, 768, 880, 1024, 1440px; form 320/768px; details 390px. No horizontal overflow in measured states. Two-column form becomes one column, labels/hints wrap, vertical dialog scrolling reaches the publish action. | Not every intermediate width or mobile orientation. No localization/RTL variants exist. |
| Writing — Checked | Required project versus optional personal account is consistent in form, details, consent and information dialogs. Wallet note states the payout destination. Empty state offers submission; errors give correction/retry actions. Canonical/footer URL matches the requested hostname. | Final hosted hostname is pending publisher configuration. |
| Typography — Checked | Preserved Space Grotesk/Inter hierarchy, 16px editable fields, wrapping wallet hint/addresses, readable optional label, existing counters. Local fonts loaded. | No cross-browser font rendering or physical iOS keyboard/zoom test. |
| Colors — Checked | Reused source tokens; measured actual opaque browser foreground/background pairs below. Errors include text, not color alone. | Image/alpha compositing and every hover/focus pair were not measured. axe reports incomplete contrast checks. No second theme exists. |
| UI — Checked | Existing green buttons, borders/radii, public cards, empty/loading/error/pending/success behavior; disabled publishing/close action, copy feedback, refreshed cards. Motion remains the existing opt-in 150ms treatment. | No slowed Animations-panel replay or touch hardware check. |

Measured opaque pairs (WCAG relative-luminance ratios): wallet hint `#5c685d` on white **5.84:1**; optional label `#6a7569` on white **4.82:1**; error `#a72d29` on white **6.88:1** and on `#fff1ed` **6.25:1**; publish text `#11291d` on `#c3ee86` **11.70:1**. All exceed 4.5:1. These are the specific measured pairs, not a site-wide contrast claim.

## Findings and corrections

| Priority / source | Evidence and impact | Correction and recheck |
| --- | --- | --- |
| High — `public/config.js:7`, `src/services/public-directory.ts:8` | Old tag would reload existing projects after refresh; merely clearing React state would not satisfy the reset. | Both defaults use a fresh namespace. Regression seeds a signed old entry, checks new directory empty, publishes a new record and rereads it. Real new-directory read returned empty. |
| High — `src/lib/projects.ts:15`, `src/components/Submission.tsx:44`, `backend/supabase/functions/submit-project/core.ts:27` | Existing validation and every input's `required` blocked submission without personal Twitter. | Optional blank value across UI/default service/managed validator; remaining fields and consent required. 29 frontend and 10 backend tests pass; browser completed a blank-personal submission. SQL migration provided, not executed. |
| Medium — `src/components/Submission.tsx:53`, `src/App.tsx:38` | “All five details” and the generic project-username label misrepresented the updated requirements. | Clear personal/project Twitter labels, required project-handle format, optional-aware privacy/consent/how-it-works copy. Source review and form screenshot confirm consistency. |
| Medium — `src/App.tsx:20`, `src/App.tsx:31` | Omitting personal Twitter would render a bare `@` and a link to the X homepage. | Card falls back to project Twitter; details show “Not provided” for personal Twitter and link the required project account. Component and production-browser tests pass. |
| Medium — `src/components/Submission.tsx:59` | Wallet hint did not explain its hackathon payout purpose. | Added the requested sentence to the existing associated hint. At 320px the sentence wraps above consent and the reachable publish button. Measured 5.84:1. |
| Medium — `index.html:8`, `src/App.tsx:114` | Metadata/footer named the prior intended hostname. | Canonical, Open Graph and footer now use `community.hackathon.sites.imd.fun`; browser assertions pass. Hosting rename remains external, documented in README. |
| Medium — `src/services/public-directory.ts:173` | A lone `@` could normalize to the same empty value as a previous pending optional-handle submission. | Validate raw input before retry reuse as well as event creation. Dedicated regression confirms no public write for that malformed retry. |

## Evidence and delivery

- [Desktop empty directory](community-desktop-empty.jpeg), [mobile empty directory](community-mobile-empty.jpeg).
- [320px optional/required form and errors](community-form-errors-320.jpeg), [320px wallet note and publish action](community-wallet-note-320.jpeg).
- [Tablet keyboard focus](community-tablet-focus.jpeg), [mobile project details](community-mobile-details.jpeg).
- [Raw browser results](browser-results.json), [reproducible browser script](browser-check.mjs), [delivery inventory](delivery-size.json).

`DESIGN.md` was refreshed from the final source: existing colors, type, spacing, responsive breakpoints, component states and new copy/optional-field behavior. The supplied combined guidance license exactly matches the retained `licenses/Better-Interface-LICENSE.txt`; notices remain intact.

Evidence is kept under the existing `docs/` convention because this workspace excludes `artifacts/` from Git. No ignore file was changed. Temporary duplicate review captures were removed. The protected manifests/lockfiles/configuration/dependencies remain unchanged; no submodules or dependency/cache/archive directories were added. `dist/` retains all needed runtime assets and licenses.

## Completion and remaining limits

The local implementation, production export, requested documentation and worker checks are complete. The public hostname switch is **not performed**: the notes specify the old hosted name is retained by normal publishing, and no hosting/DNS management capability was supplied. The publisher must map `community.hackathon.sites.imd.fun` to this export and verify the final HTTPS origin; the README provides that handoff.

No new live relay write, long-term relay retention, Supabase migration/deployment/RLS validation, Deno suite (Deno unavailable), physical-device test, screen-reader session or native browser zoom check is claimed. The original public relay records remain outside this website's new directory. No on-chain transaction or wallet signing occurred.
