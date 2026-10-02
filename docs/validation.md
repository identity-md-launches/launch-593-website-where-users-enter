# First-version restoration: validation

## Scope and assumptions

The request “change the site back to the first version” means the first completed website in the pinned project history: `91c8c03f61c6a7388afd76825b054fc600d5e3d6`. Its source was recovered from that commit's GitHub archive and compared with the supplied workspace. The original landing page, directory, illustration, Privy adapter, public-submission backend and relevant tests were restored. Existing manifests/lockfiles are identical across those versions and were preserved; all existing build configuration was also preserved.

The rendered scope is the single landing page, directory/search/filter/sort/detail flows, information dialogs, compact navigation, sign-in gate and authenticated submission form. The original forest/lime hero and light directory are authoritative. The only intentional frontend differences from that first source are the tablet navigation fix below and explicit type/decorative-icon attributes on the dialog close button.

The export is `dist/`. Preview configuration has empty public identifiers, six fictional examples and no fake publishing. Tests with authenticated data use explicit mocks. No service, token or on-chain deployment was performed. The new publisher version is prepared for the existing hosting name; publishing was not performed in this task.

## Better Interface coverage

Read the pinned workflow, the core principles of all six domains and the implemented-design documentation section. Supporting keyboard/forms, responsive behavior, type wrapping and contrast guidance informed the checks. The table records checks actually performed, not merely guide sections read.

| Domain | Coverage and evidence | Unperformed or not applicable |
| --- | --- | --- |
| Accessibility | **Checked.** Native links/buttons, one main/h1, labeled fields, `aria-pressed`, invalid/error associations, status/alert markup reviewed. Browser Enter/Tab/Escape dialog path, focus return, mobile menu and first-invalid-field focus exercised. Viewed the visible sign-in focus ring. axe-core scans detailed below. | Screen reader, every individual focus target/background and assistive announcements while native dialogs are open are **not verified**. No full conformance claim. |
| Layout | **Checked.** Source grid/order/spacing and long-address wrapping; actual desktop, tablet and mobile screenshots; overflow measurements at eight widths; root-font enlargement. Found and fixed inaccessible tablet navigation. | Browser-native 200% zoom, physical devices, RTL and translated-content stress tests **not verified**. The product implements English only. |
| Writing | **Checked.** Restored action labels, example notices, public-data consent, failed-save retry, field format guidance and unavailable-sign-in copy match their behavior. No success is shown before the server/mock returns a record. | Live provider/backend error variants **not verified**; original product voice preserved. |
| Typography | **Checked.** Source fonts, weights, sizes, line heights and clamps; both local font faces reported loaded. Viewed heading/card wrapping at desktop/mobile and full values in detail/form states. Inputs are 16px on mobile. | Native iOS focus zoom and cross-platform font rendering **not verified**. Original small decorative metadata retained. |
| Colors | **Checked.** Actual hex tokens/roles, normal/error/selected states, computed opaque foreground/background pairs and selected contrast calculations below. Errors also have text; selection has pressed state. | All gradient/image/alpha combinations, every hover pair and forced-colors rendering **not verified**. No second theme exists. |
| UI | **Checked.** Original panels, borders, marks, icons, field/error/empty/loading state implementations reviewed; directory empty reset, form busy/error/retry/success tested. Reduced-motion emulation yielded `transition-duration: 0s` and `scroll-behavior: auto`. | 10% animation-panel playback **not performed**. No autoplay, theme toggle or staged page-load animation exists. |

## Findings and fixes

| Severity | Location | Evidence and effect | Correction and recheck |
| --- | --- | --- | --- |
| Medium | `src/styles.css:314` (first-version rule formerly at line 318) | At 768px the original stylesheet hid “The collective” but offered no compact menu. Browser accessible-button count was 0 and Open navigation was invisible, so that information destination was unreachable. | Activate the existing compact navigation at 55rem, including its icon and expanded links, instead of dropping a destination. Final export at 768px opens “Welcome to the collective.” from the menu. Zero overflow also confirmed around 672/673/880px boundaries. |
| Low | `src/components/Modal.tsx:19` | Original close button omitted its explicit non-submit type and exposed its decorative X SVG. Source review identified a reusable-component semantic weakness. | Retained `type="button"` and `aria-hidden="true"` from the newer implementation. Frontend tests and final browser Escape/open/close/focus checks pass. |
| Medium | `src/auth.tsx:1`, `backend/supabase/functions/submit-project/index.ts:1` | Restoring only the old appearance would leave the newer Supabase Auth adapter incompatible with the original Privy-gated workflow. | Restored frontend and backend Privy verification together, plus original config shape and tests. 9 frontend auth cases and 3 signed-token backend cases pass; no live authentication claim. |
| Low | `README.md:1`, `DESIGN.md:1`, `backend/README.md:1` | Supplied documentation described the later single-action screen and Supabase Twitter adapter; historical first-version docs linked absent evidence files. | Rewrote documentation around final source and current checks. Checked repository-relative documentation links and token names. |

No reproduced blocker remains in the restored static-preview scope. Live-service activation remains an external configuration limitation.

## Commands and actual results

Run on 2026-10-02. Frontend checks used Node 22.22.1, TypeScript 5.8.3, Vitest 3.2.3 and Vite 6.3.5. To avoid writing repository dependency paths, copied source, tests, public assets and unchanged configuration into `/tmp/pepe-restore-build-_jrvoivc`; npm cache was also outside the repository. The final built `dist/` was copied back in full after the last source change.

| Command | Result |
| --- | --- |
| `npm ci --cache <temporary directory> --no-audit --no-fund` | Exit 0; installed 203 locked packages. One upstream `whatwg-encoding` deprecation notice. |
| `npm run typecheck` | Exit 0. Repeated after the final source corrections. |
| `npm test` | Exit 0: 20 tests, 3 files. Directory (5), Privy/session/callback adapter (9), submission (6). Final run 7.35s. |
| `npm run test:backend` | Exit 0: 9 tests, including TypeScript compilation. Covers validation, trusted identity, failed authentication, CORS/methods, malformed/oversized requests, duplicates, transport and public pagination. |
| `deno task --frozen check` from `backend/` | Exit 0 with Deno 2.5.6 / TypeScript 5.9.2. Checked actual restored Edge Function. |
| `deno task --frozen test` from `backend/` | Exit 0: 3 tests passed, 0 failed. Synthetic ES256 tokens; mocked Privy/database responses. Deno cache external; config and lock hashes unchanged. |
| `npm run build` | Exit 0 after the final source corrections. 2,999 modules, 7.34s. Final assets: `index-C532xPy6.js`, `index-BkcY5jBf.css`, lazy `index-DK-7tFL_.js` and `ccip-DL437w1e.js`. |

The build's two advisory notices are expected: `config.js` remains a separate non-module runtime script; the lazy Privy chunk is 718.23 kB (185.40 kB gzip), above Vite's 500 kB warning threshold. All required chunks remain in the export. No source maps, dependency archives or cache directories are delivered.

The initial attempt to inspect old Git objects could not fetch into the read-only `.git` area; recovery used GitHub's immutable commit archive in `/tmp` instead. An early export-copy check correctly stopped with “Build not finished”; copying succeeded after the build exited. Neither event is represented as a passed build or a source failure.

## Production-browser evidence

Chromium inspected the actual exported files at `http://127.0.0.1:4189/preview/`, using a temporary foreground Python preview process and an external `/tmp` symlink to `dist/`. The process was bounded and closed after checking. The local URL is verification infrastructure, not the published website.

- Search matched `SWARM_PROTOCOL`; clear restored six cards. Developer tools returned two; a nonexistent query returned zero and Clear filters reset both controls. Alphabetical order was FrogStack, LilyPad, Pepe Research, Pond AI, Prompt Pond, Swarm Protocol. Newest restored Pond AI first.
- Detail dialog exposed complete Twitter, project, description, contract and wallet values. Contract copying returned exactly `0x1111111111111111111111111111111111111111`. Escape returned focus to the initiating card. Unit tests independently cover copying/focus.
- The primary action opened the Privy Twitter gate with no editable fields. Continue with Twitter showed the explicit unconfigured-preview error. Enter/Tab/Escape worked; the green 3px sign-in focus ring was viewed in the saved screenshot.
- Compact navigation worked at 320px and, after correction, 768px. Information dialogs opened and closed. Screenshots were inspected, not only accessibility snapshots.
- Final `scrollWidth - innerWidth` was **0** at 320, 390, 672, 673, 768, 880, 1024 and 1440px. Layout samples used 900px height; saved desktop is 1440×1000, tablet 768×900, mobile/sign-in 390×844. 320×568 was used for the scrolling form/gate.
- At 320px with root font set to 200%, page scroll width remained 320px and dialog client/scroll width were both 248px. This is text enlargement, **not browser-native zoom**.
- Reduced-motion emulation disabled transitions and smooth scrolling. Final reload with normal media and no intercepted routes returned to the unconfigured export.
- Both Inter and Space Grotesk reported `loaded`. Final clean reload's eight document/runtime requests returned 200. Console: **0 errors, 0 warnings**. The unconfigured preview did not load the Privy chunk or contact hosted services.

### Authenticated form fixtures

Intercepted only the browser's runtime config, lazy SDK module and calls to `fixture.invalid`; delivered config/export files were never changed by these fixtures. The fake SDK supplied a Twitter identity/token and the API returned controlled responses. This checks the production UI, not real Privy or database behavior.

At 320px, an empty publish set five invalid controls (four fields plus consent), focused `projectUsername`, and had no horizontal dialog overflow. Valid inputs followed by an injected 503 retained all values and checked consent, displayed an actionable alert, and re-enabled publishing. Retrying with a stored-record response produced success and a visible directory card. The same sequence was repeated on the final export at 1440px: five invalid controls, first-error focus, retained input/consent, two attempts and one new card. The injected 503 produced the expected resource-console error; it was absent after restoring normal routes/reloading.

axe-core **4.13.0**: directory and invalid authenticated-form scans had zero violations and no incomplete items. Sign-in and “How it works” scans also had zero violations but each reported incomplete `color-contrast` checks; this is not an all-pairs contrast pass. No screen-reader session was performed.

### Selected measured contrast

WCAG relative-luminance calculations using browser-computed opaque foreground/background colors:

| Pair | Foreground / background | Ratio |
| --- | --- | --- |
| Card description | `#5c685d` / `#ffffff` | 5.84:1 |
| Muted card label | `#6a7569` / `#ffffff` | 4.82:1 |
| Hero paragraph on its opaque forest surface | `#c0cdbb` / `#11291d` | 9.34:1 |
| Primary button text | `#11291d` / `#c3ee86` | 11.70:1 |
| Search-field border against its fill | `#7f8b79` / `#ffffff` | 3.58:1 |

These exceed 4.5:1 for the listed normal text pairs and 3:1 for the listed boundary. They do not certify every state or any text/image overlap. Focus ring visibility was inspected separately; no ratio from an unfocused element's default outline is claimed.

### Saved screenshots

Final exported UI, viewed after capture; stored in the existing tracked documentation area so no ignore-file change is required:

- [Desktop, full page](screenshots/restored-desktop.jpeg)
- [Mobile, full page](screenshots/restored-mobile.jpeg)
- [Tablet menu, corrected](screenshots/restored-tablet.jpeg)
- [Sign-in and keyboard focus](screenshots/restored-signin.jpeg)
- [Authenticated form validation — mocked services](screenshots/restored-form-validation.jpeg)

## Delivery integrity and completion

The final source/export, documentation, licenses and existing lockfiles are included. Existing build configuration and package/lock files were verified unchanged. `dist/` was regenerated without stale chunks; relative asset references resolve to included files. No ignore file was changed, no submodule was introduced, and no dependency/cache directories or package archives are included. The final delivery contains 58 files totaling 2,424,117 bytes uncompressed, including a 1,230,266-byte production export. A compressed snapshot is approximately 1.40 MB. The full uncompressed file set is below the 8,388,608-byte limit with more than 5.9 MB of headroom; the temporary accounting archive stays outside the repository. `git diff --check`, relative HTML/CSS asset resolution, documentation links and source/export comparisons against the final build all passed.

**Complete for the stated restoration scope.** Limitations: no live Twitter OAuth, deployed Supabase migration/RLS/persistence, production-origin CORS or deployment; no optional CAPTCHA flow; no physical device, screen reader, Firefox/Safari, RTL/localization, forced-colors rendering, native zoom or full accessibility certification. These checks are worker-reported evidence, not independent network certification.
