# Public publishing validation — 2026-10-06

## Scope and outcome

**Complete for the stated implementation/export scope**, with external-service and manual-check limits below. The production export supports public submission and shared retrieval without authentication or private credentials. This report records worker checks; it is not independent network certification or a claim that the new export has reached the final hosted domain.

The starting form refused publication because both Supabase identifiers were blank. No existing hosted database configuration or deployment capability was supplied. The implemented default uses three public Nostr relays, retaining the optional Supabase provider and all prior project fields/visual identity. No browser-only persistence, example directory entries, account connection, token or on-chain action was introduced. Users explicitly consent to public sharing; ownership remains unverified.

Source: `src/services/directory.ts`, `src/services/public-directory.ts`, `src/config.ts`, `public/config.js`, the affected App/form/dialog/CSS and tests. Final export: `dist/`, served at `http://127.0.0.1:4173/preview/` for browser checks. That URL is a temporary local preview, not the public address. Supabase migrations/function source, build configuration, dependency manifests and lockfiles are unchanged.

## Commands and actual results

Dependencies were installed into an isolated source copy at `/tmp/pepe-publish-build`, using Node 24.21.0 and npm 11.19.0. Source/tests/public files were synchronized into that copy before checks. Nothing was installed in repository `node_modules/`. The complete generated `dist/` was copied back after the final source change.

| Command | Actual result |
| --- | --- |
| `npm ci --prefix /tmp/pepe-publish-build --cache /tmp/pepe-npm-cache --no-audit --no-fund` | Exit 0; 203 locked packages installed. npm noted a deprecated transitive encoding package and an esbuild install-script notice. Neither prevented the build. |
| `npm run typecheck --prefix /tmp/pepe-publish-build` | Exit 0 after the final source change. |
| `npm test --prefix /tmp/pepe-publish-build` | Exit 0; 24 tests in 3 files. Final run: 14.59 seconds. |
| `npm run test:backend --prefix /tmp/pepe-publish-build` | Exit 0; 9 existing handler/transport tests passed. Optional backend source remained unchanged afterward. |
| `npm run build --prefix /tmp/pepe-publish-build` | Exit 0 after the final source change; Vite 6.3.5, 1,601 transformed modules. JS `index-DmS5ab_T.js`: 262.70 kB / 85.00 kB gzip; CSS `index-5tdW3ZZ5.css`: 27.79 kB / 6.32 kB gzip. |
| `timeout 1800s python3 -m http.server 4173 --bind 0.0.0.0 --directory test/scratch/site` | Served the final export through the scratch `preview` symlink. Browser checks used the actual built files. Preview stopped after checks. |
| `npm install --prefix /tmp/pepe-validation-tools --cache /tmp/pepe-npm-cache --no-audit --no-fund axe-core@4.10.3` | Exit 0; temporary audit tooling only, outside the submission. |
| `git diff --check` | Passed. Protected manifest/build-config diff check was empty. |

Vite's notice that `./config.js` cannot be bundled without `type="module"` is expected: this is the existing separate runtime configuration script. Its production request returned 200. CSS font URLs were rewritten to `../fonts/...`; JS/CSS references, artwork and favicon loaded at the subpath.

An initial backend test run exposed that importing the new transport directly from the legacy Supabase library broke its isolated compiler's module resolution. The new provider adapter was moved to `src/services/directory.ts`; the original library and runner remain unchanged, and all 9 backend tests then passed. The Deno suite was not rerun; no backend runtime code changed.

## Interaction evidence

Chromium **154.0.8037.0**, via the assigned Playwright browser tools, inspected screenshots and exercised the export. Supporting machine results: [finalBrowser.json](finalBrowser.json) and [finalBrowserReview.json](finalBrowserReview.json).

### Live shared storage

The normal configuration/tag was read successfully and contained zero projects at the final check. No test project was published into `identitymd-593-projects-v1`.

For a real write/read test, only the served `config.js` response was overridden in the browser to select a separate validation tag. The production bundle, relay endpoints, signing code, validation, submission UI and retrieval were real; WebSocket/storage responses were **not mocked**. The source and delivered config retain the production tag.

- Initial live flow: tag `identitymd-593-validation-20261006-public`, event `1aeace73f59c576e02ee39db7098b884133a82c60cc64e354ed3aa35318b70b5`. All three relays acknowledged it. A separate context already open before publication retrieved it with Refresh projects, then again after reload; localStorage and sessionStorage were both empty.
- Final rebuilt-export flow: tag `identitymd-593-validation-20261006-final`, event `16381d4b599be7b7803fae3246616f52b1685f6904a35bb844c5ca0f14c1a725`. `relay.primal.net` and `nostr.mom` acknowledged and returned valid records, satisfying the two-copy requirement. `relay.damus.io` returned a **503 WebSocket handshake error** during this run; publication still succeeded. This is observed failover, not a claim that all three services were healthy continuously.
- A fresh independent browser context loaded the final record, reloaded and still displayed the exact two 42-character addresses. Both browser storage counts remained zero. No persisted publisher key or identity was available to the reader.
- Retrying identical details in the same page returned success with one directory card, confirming idempotency. A changed project claim for the same contract returned the duplicate message and retained the entered address. The first duplicate harness expected rejection of an identical retry; its timeout was corrected to test a different claim, consistent with the intended retry behavior.
- An early expiring protocol probe used `identitymd-593-validation-v1`. The two form-test records above explicitly identify themselves as validation data and remain separate from production. No real person's private information was used.

This demonstrates storage and public readback at test time. It does not establish archival retention, independent ownership of relay operators, exhaustive history completeness from a malicious relay, or behavior from every geography/browser/origin.

### Browser interactions and rendering

- Real publish: five editable fields, no sign-in, explicit public-consent checkbox, keyboard Space/Enter submission, disabled publish/close controls while waiting, live progress, success after readback, focused Explore the collective action.
- Validation: empty form marked all five fields and consent invalid; focus moved to Twitter. Overlong pasted address remained intact and failed validation. The final correction/publish path retained the exact intended address.
- Search/no-results/All projects reset, details and complete addresses, copy to clipboard, dismissible copy feedback, Escape dismissal, focus return, mobile information navigation and its persistent menu focus were exercised. Alphabetical/newest sorting also passed the component suite with two distinct records.
- A reader context was set offline; refresh showed an actionable error and retained its existing card. Returning online and selecting Try again recovered shared results.
- Page widths **320, 390, 672, 673, 768, 880, 1024, 1440 CSS px**: `scrollWidth <= innerWidth` in empty and populated directory passes. Form widths **320, 390, 768px**: no internal horizontal overflow. At 320×844, the focused Publish project button was visible at y≈704 with height≈48px after scrolling the dialog.
- Native modal focus containment was checked using Tab/Shift+Tab; Escape returns to the trigger. Resizing from a desktop trigger to 320px now returns to the visible hero submit button instead of body. Focus rings were inspected in screenshots.
- Both local Inter and Space Grotesk faces reported loaded. Full descriptions/addresses wrapped in mobile details. Reduced motion computed `scroll-behavior: auto` and button transition duration `0s`; forced-colors emulation retained a solid 3px focus outline.
- Final live success flow logged no JavaScript page exceptions and no failed HTTP resource requests. Browser console included the handled Damus 503 noted above. Earlier checks also deliberately produced offline transport errors. The temporary preview process stopped once during work, causing connection-refused navigation attempts; restarting it and reloading the rebuilt export resolved those local preview failures.

Final screenshots, captured from the final export and visually inspected:

- [Production desktop / empty directory](screenshots/publishing-public-desktop.jpeg)
- [Confirmed publication / desktop focus](screenshots/publishing-published-desktop.jpeg)
- [Independent public reader / mobile](screenshots/publishing-public-reader-mobile.jpeg)
- [Complete project details / mobile](screenshots/publishing-project-details-mobile.jpeg)
- [Form validation / 320px focus](screenshots/publishing-form-validation-320.jpeg)
- [Tablet navigation focus](screenshots/publishing-tablet-focus.jpeg)

The mobile full-page screenshot was recaptured from scroll position zero after confirming an apparent skip-link overlay was a full-page screenshot artifact: the actual unfocused link's rectangle ended at y=−18.4, outside the viewport. No hiding CSS was added to conceal a live issue. Older `hackathon-*` and `restored-*` images document earlier releases only.

## Better Interface consolidated review

Applied the pinned `.imd/reads/skills/better-interface/REFERENCE.md`: workflow, all six core domains and implemented-design documentation method. Existing MIT/Apache attribution is preserved in `licenses/`. Scope covers changed publishing/directory states and their affected shared components; the established forest/lime artwork and overall layout were preserved.

| Domain | Coverage | Evidence and remaining limits |
| --- | --- | --- |
| Accessibility | **Checked** | Native labels/controls/dialog, required consent, error associations, live progress, disabled busy state, synchronous error focus, focus return including resize, Tab/Shift+Tab, Escape, copy feedback, reduced-motion and forced-colors emulation. axe-core: zero automatic violations in mobile populated directory (41 checks passed) and desktop invalid form (24 passed). Contrast had incomplete automatic checks due to overlap/background detection. No screen-reader session or physical touch device. |
| Layout | **Checked** | Existing container/grid/breakpoints reviewed. Added refresh/sort group wraps with 12px gaps. Empty, populated, detail and invalid-form states inspected at representative widths; no measured horizontal overflow. Long descriptions and full addresses remain reachable. Browser-native 200% zoom and physical-device safe areas not tested. RTL/localized variants are not implemented, so variant review is not applicable. |
| Writing | **Checked** | Publish/Refresh/Try again labels match actions; public-network disclosure and consent precede writes. Errors give recovery and partial-save copy admits that a record may already be visible. Ownership remains explicitly self-reported; unavailable setup copy removed from the default flow. |
| Typography | **Checked** | Local font loading, source roles/weights, mobile 16px fields, wrapping addresses/descriptions and tabular counts checked. Success subheading reduced to 19px to respect the 21px/19px dialog-title hierarchy. No native browser zoom or additional language/italics variants checked. |
| Colors | **Checked** | Reused the existing hex semantic tokens. Browser-computed opaque form/action contrast pairs measured below. No automatic contrast violations; incomplete axe checks remain explicitly unclaimed. Image/mask composites and every possible hover/focus adjacency were not exhaustively pixel sampled. No alternate theme exists. |
| UI | **Checked** | Empty/error/loading/success/duplicate, disabled busy controls, retry behavior, primary/secondary actions, focus states and responsive dialog scrolling inspected. Refresh uses an existing-style bordered control; hover remains pointer-gated. Existing 150ms motion is opt-in; no autoplay or new animation. No 10%-speed Animations-panel playback was performed. |

### Findings and fixes

Locations refer to the final source, where each correction can be inspected.

| Severity / domain | Source | Evidence, impact, correction and recheck |
| --- | --- | --- |
| HIGH · UI / writing | `src/services/directory.ts:6`, `src/services/public-directory.ts:162`, `src/components/Submission.tsx:31` | Blank Supabase settings previously guaranteed refusal. Added a functioning default shared provider; removed the unconditional unavailable gate. Live writes and independent-context reads passed. Supabase compatibility tests still pass. |
| HIGH · UI / data integrity | `src/services/public-directory.ts:175` | Shared writes can partly succeed or acknowledge without serving a record. Reuse the signed event on retry and require two acknowledgements plus independent readbacks. Tests cover one saved copy, positive ACK without readback, retry, timeouts and one failed relay; final live run exercised a 503 failover. |
| HIGH · accessibility / forms | `src/components/Submission.tsx:47` | The original 42-character input maximum silently clipped an overlong pasted address into a different valid address during the live test. Allow the entered value up to 256 characters and let exact-length validation reject it. Component and final browser checks retained the overlong value, marked it invalid, then stored the corrected 42-character value. |
| MEDIUM · accessibility | `src/components/Submission.tsx:28` | Deferred animation-frame focus could move focus while a rapid correction was being filled, sending part of an address into Twitter. Focus now changes synchronously in the invalid-submit handler. The formerly failing live correction sequence then passed; all tests and build reran. |
| MEDIUM · accessibility / UI | `src/components/Modal.tsx:16` | After opening from desktop and resizing to mobile, the hidden trigger could not receive focus. Cleanup now falls back to the first visible enabled main action. Browser recheck returned “Submit your project”. |
| MEDIUM · UI / accessibility | `src/components/Modal.tsx:22`, `src/components/Submission.tsx:64` | Closing during a shared write could discard the pending form and its outcome. Busy state disables dismissal and communicates progress until the bounded request completes. Real publish showed disabled close/submit; success focused the next action. |
| MEDIUM · UI / layout | `src/App.tsx:59`, `src/App.tsx:106`, `src/styles.css:204` | A directory loaded only once could stay stale, and a refresh failure could hide known records. Added manual/focus/timed refresh, overlapping-request suppression and retained cards on error. Independent-reader refresh and offline recovery passed; controls fit at 320px. |
| MEDIUM · typography | `src/styles.css:228` | Original 32px success h3 overpowered the 21px dialog h2. Reduced h3 to 19px; final success screenshot confirms the hierarchy. |

### Measured contrast

Computed from actual browser foreground/background styles with the WCAG sRGB luminance formula. These rows identify opaque surfaces, not inferred image/alpha composites. Normal text target: 4.5:1; the focus perimeter target: 3:1.

| Pair | Ratio |
| --- | --- |
| Publishing disclosure / white dialog (`#5c685d` / `#ffffff`) | 5.84:1 |
| Field hint / white dialog (`#5c685d` / `#ffffff`) | 5.84:1 |
| Error text / white (`#a72d29` / `#ffffff`) | 6.88:1 |
| Error text / alert (`#a72d29` / `#fff1ed`) | 6.25:1 |
| Field label or refresh text / white (`#202d23` / `#ffffff`) | 14.37:1 |
| Primary action text / lime (`#11291d` / `#c3ee86`) | 11.70:1 |
| Focus outline / white dialog (`#47713c` / `#ffffff`) | 5.68:1 |

## Delivery and limitations

The complete export is **539,673 bytes**. The complete final source/export/document snapshot was measured separately from disposable browser/scratch outputs; size results are in `delivery-size.json`. Historical Git bundling was unavailable in the read-only partial checkout because it attempted to fetch missing history objects. An isolated temporary bare Git store was used to measure a bundle of the complete final file snapshot, without changing the repository’s Git metadata. The supplied checkout’s full historical bundle size is not claimed. Source, existing lockfile, runtime fonts/artwork/licenses, design documentation, reproducible component/transport tests and this record accompany it. No package archive, dependency/cache directory, submodule, secret, ignore-file change or build-configuration change is included. `artifacts/` contains inspection outputs; repository copies of evidence are in `docs/` because the environment excludes `artifacts/` from Git. Nothing required relies on `test/scratch/`.

No remaining reproduced blocker exists in the checked flow. Relay uptime and permanent retention are not guaranteed: services can remove records, change policies or deny access. Anonymous publication is vulnerable to spam and false ownership claims. Deduplication uses signed-but-user-chosen timestamps, not a trusted ownership registry; concurrent claims are not prevented by a database constraint. A large/dense history can exceed the documented traversal bounds and needs a larger index or managed provider. These limits are also recorded in the README and appropriate public-sharing copy.

Unperformed: final-origin deployment/DNS/CSP checks, long-term retention, Supabase deployment/migrations/live RLS, Deno checks for the unchanged backend, native zoom, screen-reader session, Safari/Firefox, physical devices and exhaustive contrast on artwork composites. No browser snapshot or automated audit is represented as a substitute for those checks.
