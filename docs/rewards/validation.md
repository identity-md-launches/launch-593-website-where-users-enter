# Wallet collection removal — 2026-10-06

**Complete for the stated scope.** The existing website now replaces the wallet input with the exact text “Rewards will be sent directly to the winners deployer addresses”. The form, validation, new public records and optional managed-provider requests omit wallet data. Project details and help copy no longer request or display wallets. Personal Twitter remains optional; project Twitter, contract, description and public-sharing consent remain required.

## Scope and assumptions

Preserved the established green Pepe Collective design, public directory, namespace, artwork, metadata and hosting configuration. This is an informational payout change: no deployer lookup, wallet connection or reward transfer was added. Historical signed relay records remain readable without exposing their wallet in this site. A new optional Supabase migration makes the historical wallet column nullable without deleting earlier data. No remote database or on-chain action was performed.

Read the pinned project history, Better Interface workflow, core principles and verification guidance for all six domains, documentation method and license. The review is scoped to the submission flow, changed information/details and affected shared components. Existing attribution in `licenses/` is preserved.

## Commands and results

Node `v24.21.0`, npm `11.19.0`. The protected package manifest, lockfiles and build configuration were not changed. Dependencies were installed in a temporary directory to avoid creating repository `node_modules/`.

| Actual command | Outcome |
| --- | --- |
| `npm ci --prefix /tmp/imd-rewards-build-rcv5it_o --cache /tmp/imd-rewards-npm-cache --no-audit --no-fund` | Exit 0; 203 locked packages installed. Existing dependency deprecation and install-script notices emitted. |
| `npm run typecheck` in that directory | Exit 0. |
| `npm test` there | Exit 0; 30 tests across three files. |
| `npm run test:backend` there | Exit 0; 10 tests. Compiles the real handler core and HTTP client, then tests mocked persistence/network responses. |
| `npm run build` there | Exit 0; TypeScript and Vite 6.3.5 production build. Existing notice about non-module `config.js`; the file is deliberately separate and loaded successfully. |
| `npm install --prefix /tmp/imd-rewards-browser --cache /tmp/imd-rewards-npm-cache --no-audit --no-fund playwright@1.56.1 @axe-core/playwright@4.10.2` | Exit 0; five optional verification packages installed outside the repository. |
| `BROWSER_TOOLS_ROOT=/tmp/imd-rewards-browser CHROMIUM_PATH=/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome node artifacts/browser-check.mjs` | Exit 0; Chromium 153.0.8010.12, final export served at `/preview/`, intercepted relay fixtures. Retained script copied to `docs/rewards/browser-check.mjs` with its output directory updated. |
| `git diff --check` | Exit 0. |

The final `src/`, `tests/`, `public/`, `backend/`, HTML and configuration were copied to the build directory. The resulting `dist/` was copied back with superseded hashed assets removed. The final integrity check compares source/build input and every export byte, verifies relative local asset references, unchanged protected paths and the file-size limit; see [delivery-size.json](delivery-size.json).

Frontend tests exercise a submission with blank personal Twitter and no wallet; unchanged required fields, consent, normalization, loading, server error/retry and success focus; absence of wallet in details; contract copy, search, multi-record sorting and refresh recovery; signed legacy records, signature tampering, exact outbound fields, namespace filtering, duplicate checks, timeouts and relay acknowledgement/readback. Backend tests verify remaining field validation, discarding extraneous wallet properties, wallet-free requests/selection, optional Twitter, allowed origins, malformed/oversized input and recoverable failures.

## Production browser validation

The repeatable browser script owns its local static server and closes it and the browser at completion. It serves actual export bytes under `/preview/`, exercising relative assets. Its WebSocket interception simulates shared relays, including fresh-reader/reload and failure/retry; no live write was made.

- No page horizontal overflow at 320, 390, 672, 673, 768, 880, 1024 and 1440 CSS pixels. Form bounds fit at 320, 768 and 1440px; details fit at 390px.
- The four text fields remain labeled; personal Twitter is optional. Submitting empty marks the other three fields and consent, focuses the project handle and announces recovery guidance. No wallet input is present.
- The exact rewards notice is normal text below the description, before consent. It wraps onto two lines at 320px. Vertical dialog scrolling reaches consent, errors and the full-width publish action.
- Keyboard entry publishes without personal Twitter or a wallet. The actual signed outgoing payload contains only `schema`, `twitterUsername`, `projectUsername`, `contract`, and `description`. Success requires simulated acknowledgments/readback and focuses Explore the collective.
- Project detail displays the project profile, omitted personal account state and contract copy control, with no wallet row. Copy returns the full contract. Search/no-results/reset, sorting, mobile navigation, Escape and focus return pass. A new browser context and reload see the same fixture record; localStorage remains empty. Failed refresh keeps the record visible; retry recovers.
- Inter and Space Grotesk loaded locally. Reduced-motion emulation computed `0s` button transitions; forced-colors emulation retained a solid 3px focus outline.
- Three axe scans (empty directory, invalid form, project details) reported **zero violations**, with `color-contrast` incomplete items. This is not full accessibility certification. Selected opaque form pairs were measured separately below.
- No console exceptions/errors or failed HTTP resources in the completed fixture run.

The supplied browser tool separately loaded the final export, inspected the rendered desktop form (1440×1000) and mobile notice (320×900), checked the remaining field IDs, measured 320px page / 280px dialog widths without horizontal overflow, and verified Escape returns focus to Submit your project. Its read-only live directory request eventually displayed the empty-directory state; no live persistence claim follows from that observation. An initial preview navigation mistakenly used the source root and produced missing-asset/module errors; serving `dist/` corrected the preview setup. No site code change was needed, and the final fixture run had no resource failures.

## Better Interface coverage

| Domain | Coverage | Limitations / not applicable |
| --- | --- | --- |
| Accessibility — Checked | Native paragraph replaces input without adding a tab stop. Bound labels, required/optional semantics, error descriptions, consent, first-error/success focus, keyboard publishing, Escape/focus return, native modality, axe scans and reduced-motion checks. Tablet screenshot shows visible field focus. | Screen-reader session, physical touch targets and native browser zoom not verified. Forced-colors was checked via computed styles, not a visual screenshot. |
| Layout — Checked | Existing grid spans the notice across the form; removal closes the obsolete field space. Eight page widths, desktop/tablet/mobile dialogs and vertical reachability checked. | Other widths/orientations untested. Locale/RTL switching is not implemented and is not applicable. |
| Writing — Checked | Exact user wording retained. Disclosure lists only collected data. How it works now requests contract/description and explains deployer payouts; details and Public by design no longer mention wallet collection. Required/optional and recovery language matches behavior. | No localization or unrelated brand-copy redesign. |
| Typography — Checked | Existing Inter/Space Grotesk roles preserved and loaded. Notice uses normal-weight 14px Inter / 1.6 line-height instead of the removed 11px field hint. Natural mobile wrapping and readable error/details layouts inspected. | Native 200% zoom, physical-device fonts and other browser engines unverified. |
| Colors — Checked | Reused existing semantic tokens. Browser-computed opaque foreground/background pairs measured: rewards notice 14.37:1, optional marker 4.82:1, inline error 6.88:1, form alert 6.25:1, publish button 11.70:1. | Axe contrast incompletes are retained in the report. No exhaustive audit of gradients, images, alpha overlays or every focus/hover pair. One theme only; alternate theme is not applicable. |
| UI — Checked | Existing panel, field, action and dialog states retained; no replacement input affordance added. Empty, invalid, pending, success, details, refresh failure/retry and focus states exercised. Restrained motion remains gated by preference. | No slowed Animations-panel replay or hardware touch test. No new animation was added. |

## Findings and corrections

| Severity / source | Evidence and impact | Correction and recheck |
| --- | --- | --- |
| High — `src/components/Submission.tsx:8`, `src/lib/projects.ts:17`, `src/lib/submissions.ts:15`, `src/services/public-directory.ts:29`, `backend/supabase/functions/submit-project/core.ts:16` | Wallet was required throughout validation and payload normalization. Removing only its UI would block publishing or serialize missing data. | Removed it from the form state, types, validation, normalization and both transport paths. Frontend, backend and browser tests publish without a wallet and assert the actual outbound keys. Legacy signed records still decode. |
| Medium — `src/components/Submission.tsx:54`, `src/App.tsx:22`, `src/App.tsx:37` | Disclosure, details and help still described collection/payout to a submitted wallet. This would contradict the changed form. | Removed obsolete references and detail/copy row; How it works includes the requested deployer wording. Source review and rendered details confirm consistency. |
| Medium — `src/components/Submission.tsx:59`, `src/styles.css:199` | The former payout hint belonged to the deleted input; leaving it as a dangling hint would lose context and keep small hint typography. | Added a normal full-width paragraph before consent using existing 14px primary text. Exact-copy assertions, measured 14.37:1 contrast and inspected 320px wrapping confirm it is readable without a control. |
| High, optional managed provider — `backend/supabase/functions/submit-project/index.ts:10`, `backend/supabase/migrations/202610060003_remove_wallet_requirement.sql:5` | Existing database `NOT NULL` wallet constraint would reject the updated function's inserts. | Added a forward migration dropping that requirement; function inserts/selects omit wallet. Core/client tests pass; migration deployment and actual Postgres enforcement remain unverified. Deployment order is documented. Default Nostr provider is unaffected. |

No additional applicable defect was found in the scoped rendered review. `DESIGN.md` records the final tokens, typography, grid, notice, details and responsive behavior; historical review files remain labeled as earlier releases.

## Evidence and remaining limits

- [Browser results, computed styles and measurements](browser-results.json)
- [Desktop directory](rewards-desktop-empty.jpeg), [desktop form](rewards-desktop-form.jpeg), [mobile directory](rewards-mobile-empty.jpeg)
- [320px form errors](rewards-form-errors-320.jpeg), [320px rewards notice and publish action](rewards-notice-320.jpeg)
- [Tablet keyboard focus](rewards-tablet-focus.jpeg), [mobile project details](rewards-mobile-details.jpeg)
- [Repeatable browser check](browser-check.mjs)

Native zoom, screen readers, physical devices, other browser engines, live publication/readback, long-term relay retention, hosted DNS/HTTPS, real Supabase migration/RLS and Deno-specific tests are not claimed. Deno is unavailable in this environment; Node tests cover the changed validator and HTTP client. No hosting or on-chain deployment occurred. This is worker validation, not independent certification.

The delivery preserves source, local runtime assets, lockfile and export. Optional browser tools and package caches remain outside the repository. Browser-tool scratch captures were removed; durable evidence is under `docs/rewards/` because the preexisting Git exclusion covers `artifacts/`. No ignore file or Git metadata was changed.
