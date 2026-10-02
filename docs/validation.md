# Hackathon update: validation

## Scope and assumptions

This bounded update continues the existing React/TypeScript/Vite site. It replaces all four user-facing instances of “Small frogs” with “Small pepes”, adds the exact requested hackathon sentence as a visible hero paragraph and HTML description, and sets `https://hackathon.sites.imd.fun/` in canonical/Open Graph metadata and the footer link. Existing directory, artwork and authentication/submission behavior are preserved. One reproduced keyboard-focus defect in the changed collective-dialog path is fixed.

The static deliverable is `dist/`, with source, unchanged manifest/lockfiles and local runtime assets. Empty service identifiers still produce six explicitly fictional examples and unavailable-sign-in messaging. No live OAuth, public database write, hosting, DNS, redirect or on-chain action was performed. The new domain is the intended publishing destination: a repository edit cannot configure the external publisher or DNS. README documents the remaining hostname, HTTPS, OAuth callback and backend-origin configuration. No hosting-management capability was available.

Read the pinned project history, Better Interface workflow, all six domains' core principles, the documentation method and included license information. Preserved the existing design and attribution. This is a worker's evidence record, not independent certification.

## Better Interface coverage

| Domain | Coverage and actual evidence | Limitations |
| --- | --- | --- |
| Accessibility | **Checked.** Native buttons/links, one main/h1, labels, live states, focus CSS and dialog semantics reviewed. Enter/Escape, copy, submit gate and focus return exercised in Chromium; new mobile focus regression passes. Viewed lime primary-action focus and green menu focus. axe results below. | No screen-reader session, every individual focus/background pair, forced-colors rendering or full conformance assessment. |
| Layout | **Checked.** Added paragraph follows existing hero reading order before actions, uses minimum-height layout, a 44ch maximum and 12px separation. Viewed desktop/mobile/tablet screenshots and measured overflow at eight widths. | No native browser zoom, physical-device, translated-content or RTL testing; only English is implemented. |
| Writing | **Checked.** Exact requested sentence preserved, including “organised” and “ai”; updated hero/dialog/footer/title consistently. URL is explicit in metadata/footer/publishing docs. Search reset, fictional-data notice and unavailable sign-in match behavior. | Live service-specific errors and public writes not exercised. Unrelated frog/pond brand language retained. |
| Typography | **Checked.** Existing local Space Grotesk/Inter, weights, wrapping and responsive copy sizes reviewed; both fonts loaded. New paragraph is 14px desktop, 12px tablet, 13px mobile with line-height 1.75 and no truncation. | No Safari/iOS input-zoom or cross-platform font check. Existing compact supporting labels retained. |
| Colors | **Checked.** Existing semantic hex tokens reused; selected rendered foreground/background pairs measured below. Errors retain text and category buttons expose `aria-pressed`. | Every image/gradient/alpha/hover pair remains unverified. One theme; dark-mode variants are not applicable. |
| UI | **Checked.** Existing panel/button/card/dialog patterns preserved. Search/filter/sort, empty reset, full details, copy feedback, sign-in error and reduced-motion behavior checked in export. Existing mocked form tests cover invalid/busy/error/retry/success. | No animation-panel playback at 10% speed or real authenticated-form browser session in this update; no new component or animation system. |

## Findings and fixes

| Severity | Source location | Evidence and effect | Fix and recheck |
| --- | --- | --- | --- |
| Medium | `src/App.tsx:69`, `src/App.tsx:82`; dialog lifecycle at `src/components/Modal.tsx:7` | At 390px, opening The collective from the mobile menu unmounted its focused button before the dialog captured focus. Escape left `document.activeElement` as BODY, losing keyboard position. | `menuToggle` ref and `openInfo` focus the persistent menu control before hiding the menu. Final export returns to Open navigation at 320, 390 and 768px. Added `tests/app.test.tsx:92` regression; all 21 tests pass. Viewed/saved the 768px focus ring. |
| Low | `src/App.tsx:42`, `src/App.tsx:86`, `src/App.tsx:102`, `index.html:7` | Existing copy, page title and metadata did not describe the requested hackathon; previous publishing docs named the old host. | Updated all four Small pepes instances, visible hackathon text, description/title, canonical/Open Graph URL, footer and publishing docs. Browser checked exact sentence, title, link and canonical; static integrity check covers exported metadata. |

The new paragraph uses `src/styles.css:110`, preserving the established color/type roles and avoiding fixed height or truncation. No further reproduced blocker remains in the static-preview scope. External domain routing and live service activation remain deployment limitations.

## Commands and actual results

2026-10-02; Node 22.22.1, TypeScript 5.8.3, Vite 6.3.5, Vitest 3.2.3. Source, tests, public assets and existing configuration were copied into `/tmp/imd-hackathon-build-j1g5ie66`. Dependencies and cache stayed outside the repository. Final source and export were checked against that build copy.

| Command | Actual result |
| --- | --- |
| `npm ci --cache /tmp/imd-hackathon-npm-cache --no-audit --no-fund` | Exit 0; 203 locked packages. Upstream whatwg-encoding deprecation notice. |
| `npm run typecheck` | Exit 0 after final source change. |
| `npm test` | Exit 0 after final change; 21 tests in 3 files, 7.89s. Directory/navigation 6, authentication 9, submission 6. |
| `npm run test:backend` | Exit 0; 9 handler/transport tests. Backend source unchanged. |
| `npm run build` | Exit 0 after final change; 2,999 modules, 7.26s. Complete `dist/` copied back without stale chunks. |

Final chunks: `index-BV1MM2w2.js`, `index-BcHP675B.css`, lazy `index-CtXGwjGD.js` and `ccip-DtdB4u7e.js`. Two existing build advisories remain: non-module `config.js` is intentionally served as a separate runtime script, and the lazy Privy chunk is 718.23 kB (185.40 kB gzip), above the 500 kB advisory threshold. All required runtime chunks remain delivered. No package/build configuration was changed.

Deno JWT tests recorded by the preceding assignment were not rerun. The current frontend tests explicitly mock authentication and submission services; they verify consent, first-invalid-field focus, normalized input, busy state, server-confirmed success, retained data after failure and retry. They do not establish live service availability.

## Production-browser checks

Chromium **145.0.7632.6** loaded the final export at `http://127.0.0.1:41153/preview/`. The expected tool preview sidecar was absent, so a temporary bounded Python HTTP preview served `dist/` via a scratch symlink. The port is local verification infrastructure, not the public URL.

- Exact requested hero sentence, new title, canonical URL and visible URL link checked. Collective dialog shows “Small pepes. Shared ambition.”
- Explore the pond navigates to `#projects`. Search for `SWARM_PROTOCOL` returns one card. Developer tools returns two. An unmatched query returns zero; Clear filters restores six and resets inputs.
- Alphabetical order: FrogStack, LilyPad, Pepe Research, Pond AI, Prompt Pond, Swarm Protocol. Newest restores original order.
- Pond AI details expose full example data. Copy contract writes exactly `0x1111111111111111111111111111111111111111` to the browser clipboard and shows feedback. Escape returns focus to its card.
- Keyboard Enter opens the primary submit gate. Continue with Twitter reports: “Twitter sign-in is not available in this preview. Please check back when the directory launches.” Escape returns to Submit your project. No editable form is exposed without authentication.
- Mobile menu → The collective → Escape returns focus to Open navigation at 320, 390 and 768px; visible ring inspected at 768px.
- Page and new-paragraph horizontal overflow were both **0px** at 320, 390, 672, 673, 768, 880, 1024 and 1440px (900px height). Screenshots viewed at 1440×1000, 390×844, 673×900 and 768×900. No overlap or clipping of the new paragraph was observed.
- At 320×568 with root font set to 200%, page overflow remained 0px. This is text enlargement, not native browser zoom; existing pixel-sized copy does not double from this change.
- Reduced-motion emulation returned `scroll-behavior: auto` and button `transition-duration: 0s`. Both local fonts reported loaded.
- Final clean reload: eight document/runtime requests returned 200 or cached 304; zero console errors, warnings and failed requests. No live-service request was made by the unconfigured preview.

An initial interaction harness asserted the words “not configured” instead of the actual unavailable-sign-in message and stopped, leaving the modal open for the next attempted click. The assertion was corrected to await the actual message and the full interaction sequence passed on the final export; this was a harness correction, not a UI change.

### Accessibility scan and measured contrast

axe-core **4.13.0**, installed only under `/tmp`, scanned WCAG 2 A/AA, WCAG 2.1 AA and best-practice rules. Directory: 0 violations, 0 incomplete rules. Collective dialog: 0 violations, color-contrast incomplete on two paragraphs. Sign-in: 0 violations, color-contrast incomplete on alert/public-notice text. Selected opaque pairs were then measured manually from browser-computed colors, using the actual nontransparent ancestor surface where necessary:

| Pair | Foreground / background | Ratio |
| --- | --- | --- |
| Hackathon paragraph on opaque forest surface | `#c0cdbb` / `#11291d` | 9.34:1 |
| Primary button | `#11291d` / `#c3ee86` | 11.70:1 |
| Footer URL on page surface | `#5c685d` / `#f7f8f4` | 5.48:1 |
| Collective body paragraph on dialog | `#5c685d` / `#ffffff` | 5.84:1 |
| Sign-in alert | `#a72d29` / `#fff1ed` | 6.25:1 |
| Public notice in sign-in gate | `#5c685d` / `#f5f7f1` | 5.41:1 |

These pairs exceed 4.5:1. They do not establish contrast over every masked-artwork pixel or every state, and do not convert automated incomplete items into a full accessibility certification. An initial footer calculation used transparent body fill; it was discarded and recalculated against the actual opaque HTML page surface above.

### Final screenshots

Captured from the final export and visually inspected:

- [Desktop, full page](screenshots/hackathon-desktop.jpeg)
- [Mobile hero and primary focus](screenshots/hackathon-mobile.jpeg)
- [Tablet and restored menu focus](screenshots/hackathon-tablet-focus.jpeg)

Earlier `docs/screenshots/restored-*` files are retained as historical evidence, not current screenshots.

## Delivery integrity and completion

Integrity checks passed: protected-file hashes, source/export parity, relative HTML/CSS/chunk references, requested content, documentation links, and `git diff --check`. The complete deliverable has 62 files, approximately 2.95 MB uncompressed, including a 1,230,689-byte export. A temporary gzip snapshot is approximately 1.86 MB; it remains outside the repository. The deliverable is below the 8,388,608-byte budget with ample headroom. Existing manifest, lockfiles and build configuration are preserved; generated packages/caches and temporary browser captures are excluded. No ignore file or submodule was added. Current screenshots and this report use the existing `docs/` area because the repository excludes `artifacts/` from Git; no exclusion rule was changed. The preview browser and temporary server were closed after checking. `dist/` keeps local fonts, artwork, configuration, favicon and all generated JavaScript/CSS with relative runtime URLs. Absolute canonical and footer URLs intentionally identify the public site.

**Complete for the repository update and static export.** The external hostname still needs publishing-provider/DNS/HTTPS configuration. Live Twitter authentication, Supabase persistence, final-origin CORS and the additional manual/device checks above remain unverified; none is claimed as completed.
