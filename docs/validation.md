# Validation · directory and submission cleanup

Date: 2026-10-06. This record describes the current source/export. Older screenshots in `docs/screenshots/` and `validation-restoration.md` are historical. Results below are worker-reported checks, not independent certification.

## Scope and implementation assumptions

The requested changes remove Twitter sign-in, fictional preview projects, and the AI agents / Developer tools / Community directory options while retaining All projects. Removing sign-in was interpreted as opening the existing submission form directly. The Twitter detail remains as a self-reported username; no substitute authentication, wallet connection or local fake persistence was introduced.

The existing green visual system, illustration, hackathon copy, public URL metadata, search, sort, details and copy actions are preserved. The frontend transport and hosted service source now accept the five validated fields without a Twitter token. Existing database access policies and records are unchanged. A new migration changes only the table's descriptive comment. Live configuration/deployment remains external.

## Commands and results

Build/check tools: Node 24.21.0, TypeScript 5.8.3, Vite 6.3.5, Vitest 3.2.3, Deno 2.9.6. Browser tools installed separately under `/tmp`: Playwright Core 1.63.0, axe-core 4.14.0; existing Chromium 154.0.8037.0.

| Command or check | Actual result |
| --- | --- |
| `npm ci --cache /tmp/pepe-update-npm-cache --no-audit --no-fund` in an isolated source copy | Passed; 203 locked packages installed. Existing manifests and lockfiles were not edited. |
| `npm run typecheck` | Passed, including the final source. |
| `npm test` | 11 tests passed: 7 directory/navigation tests and 4 submission tests. |
| `npm run test:backend` | Handler and frontend transport compiled; 9 tests passed. |
| `deno task --frozen check` from the copied `backend/` | Passed for the real Edge Function entry point. |
| `deno task --frozen test` from the copied `backend/` | 3 tests passed with a mocked database, exercising the real entry point. |
| `npm run build` | Passed after the final source correction. 1,585 modules transformed; final JS 220,004 bytes, CSS 27,196 bytes. |
| `node test/scratch/browser-check.mjs` | Final run passed against repository `dist/` served under `/preview/`. The scratch runner owned its server/browser and closed both on exit. |
| Production resource check | Nine observed document/runtime responses returned 200, including one repeat favicon request. Every URL stayed under `/preview/`; both local fonts loaded. No default-export console warnings, console errors, page errors or failed requests. |
| Protected-file comparison | SHA-256 comparison against the initial snapshot found all existing manifests, lockfiles and build configuration unchanged. No ignore files changed. |

Vite emits the existing informational notice that the separate `./config.js` runtime script cannot be bundled without `type="module"`. The exported script loaded successfully in Chromium. The obsolete Privy and CCIP chunks were removed by the clean production build. The unused dependencies remain in the protected manifest/lockfile; none are imported by the final runtime.

Two runner issues were resolved: Chromium initially could not write its default crash-handler configuration, so its XDG config/cache directories were placed in `/tmp`. An overly strict Tab assertion expected immediate focus on Close; actual native-dialog behavior goes through browser chrome and then focuses the dialog container. The corrected check distinguishes browser focus from page background focus. No custom trap was added to override native behavior.

## Interaction coverage

Permanent frontend tests exercise the absence of sample records/sign-in/category controls; the empty state; real-record search by username, builder and full contract; sorting; All projects reset; full details; copying; focus return; load-error retry; five immediately editable fields; validation and consent; pending controls; normalized submission; server-only success; retained input and retry; and honest unconfigured behavior.

The Node suite exercises field normalization, handle/address/description rejection, anonymous submission, invalid-input rejection before persistence, CORS, JSON requirements, body bounds, preflight/method behavior, duplicate errors, private error redaction, token-free transport and paginated public reads. Deno tests cover the deployed entry-point shape, server-held database credentials, absence of account lookups, invalid handles and duplicate recovery. Test records exist only in test code, not in application source or `dist/`.

The browser run covered:

- The actual default export: no sign-in control, preview label, example cards or removed category options; only All projects remains in the view control group.
- Hash navigation, empty search, All projects reset, Enter to open the form, all five editable fields, first-invalid-field focus, explicit consent and unavailable-publishing feedback with retained input.
- Tab order through Twitter, project username, contract, description, wallet, consent and Publish. Native browser chrome is reachable at the boundary; Tab returns to the modal without focusing background controls. Escape restores the triggering submission action. Mobile information dialogs return to the menu toggle; How it works → form → Escape returns to the original information trigger.
- Configured service behavior using intercepted runtime configuration, in-memory test records and the real handler's validation: failed read/retry, search, sort, full details, clipboard, failed write/retry, publication, updated directory and reload. Browser requests had no account bearer token. This is simulated persistence, not a live database write.

## Better Interface review

The pinned workflow, all six domains' core principles and the documentation method were read. Existing tokens/components were retained and the review was limited to the requested changes and affected shared surfaces. Attribution remains in `licenses/`.

| Domain | Coverage and evidence | Limitations |
| --- | --- | --- |
| Accessibility | Source review of native controls, field labels, hints/errors, `aria-invalid`, alerts, status count, focus CSS and reduced-motion guards. Browser keyboard sequence, modal focus return and visible Twitter-field focus ring inspected. axe reported zero violations and zero incomplete checks in the desktop empty directory and validated form states. | No screen-reader session or comprehensive focus-ring measurement across all backgrounds; axe is not full accessibility certification. |
| Layout | Preserved container, reading order, toolbar and modal structure. Page scroll width equaled viewport width at 320, 390, 672, 673, 768, 880, 1024 and 1440 CSS px. Form had no horizontal overflow at 320, 390 or 768px. Desktop/mobile/tablet screenshots viewed. | Other widths, locales, RTL and physical devices not tested. Native browser zoom not tested. |
| Writing | Reviewed the header, principles, how-to/public dialogs, empty/search states, form hints, errors and success. Removed verified-account and fictional-example claims. Empty state leads to Submit; failed requests explain retry; unavailable publishing is explained before input. | Hosted server responses and external account contents not reviewed. |
| Typography | Local Inter and Space Grotesk loaded. Existing type hierarchy, wrapping and full-record access retained. Form fields stay 16px; mobile sort changed from 11px to 16px. Form and directory screenshots show readable wrapping in inspected states. | No Safari/iOS zoom test. The 390px page also passed a separate 200% root-font enlargement check; this is not native browser zoom. |
| Colors | Existing forest/lime/sage semantic tokens retained. Measured five actual form foreground/background pairs below, all above 4.5:1. Error state also uses text and invalid-field semantics. | These selected measurements do not certify all artwork, gradient, hover, focus or disabled combinations. No dark theme exists. |
| UI | Reused native dialogs, card/details patterns, button states, empty/retry states and in-flow form actions. Removed obsolete authentication styling; kept 150ms opt-in transitions and reduced-motion behavior. Viewed final screenshots. | Motion reviewed in source and with reduced-motion emulation, not replayed at 10% speed; full hover/active-state screenshots not captured. |

### Findings and corrections

Locations below point to the final implementation; each row consolidates one root cause rather than counting every affected string separately.

| Priority / domain | Finding and impact | Fix and recheck |
| --- | --- | --- |
| High · UI / writing | Removing only the header login would leave submission actions blocked by the old Twitter gate and token-requiring endpoint. | Direct form in `src/App.tsx:102` and `src/components/Submission.tsx:7`; account provider removed from `src/main.tsx:6`; token-free transport in `src/lib/submissions.ts:79`; public validation/insert in `backend/supabase/functions/submit-project/core.ts:80`. Frontend, handler, Deno and browser tests passed. |
| Medium · writing | Existing verified-account copy and checkmarks would misrepresent self-reported handles after authentication removal. | Replaced claims in `src/App.tsx:17`, `src/App.tsx:33`, `src/App.tsx:38` and `src/App.tsx:86`; editable labeled handle/hint in `src/components/Submission.tsx:55`. Source search and production inspection found no Privy/verification badges. |
| Medium · layout / writing | Fictional seed records and category controls conflicted with the requested real-only, All projects directory. | Empty initialization in `src/App.tsx:44`, single view control in `src/App.tsx:90`, and search/sort-only logic in `src/lib/projects.ts:3`. Empty directory provides a submission action; mocked real records remain searchable. Rechecked empty/search/load-error and loaded states. |
| Medium · writing | A directly accessible form needs to disclose missing publishing service before users enter details. | Added the visible notice at `src/components/Submission.tsx:52` and retained explicit no-save feedback at line 28. Form tests and browser run confirmed no request or false success when unconfigured. |
| Low · typography / accessibility | The retained sort select used 11px text on narrow screens, below the guide's mobile-control guidance. | Added 16px type and 40px minimum height in `src/styles.css:358`; narrow-width checks and screenshots showed no resulting overflow. iOS behavior remains unverified. |

No known blocking defect remains in the tested local flows. Live publishing cannot work until the updated service is deployed and configured.

### Measured contrast

Measured in Chromium from computed text colors and the nearest opaque rendered background in the validated form; WCAG relative-luminance calculation. All five pairs are ordinary-sized text with a 4.5:1 threshold.

| Element | Foreground / background | Ratio |
| --- | --- | --- |
| Form introduction | `#5c685d` / `#ffffff` | 5.84:1 |
| Publishing availability notice | `#5c685d` / `#ffffff` | 5.84:1 |
| Field error | `#a72d29` / `#ffffff` | 6.88:1 |
| Input text | `#202d23` / `#ffffff` | 14.37:1 |
| Publish button text | `#11291d` / `#c3ee86` | 11.70:1 |

### Rendered evidence

Final images were opened and reviewed, not only generated:

- [Desktop directory, 1440px](../artifacts/directory-1440.jpeg)
- [Mobile directory, 390px](../artifacts/directory-390.jpeg)
- [Tablet directory, 768px](../artifacts/directory-768.jpeg)
- [Desktop validation and focus](../artifacts/submission-desktop.jpeg)
- [Mobile validation and focus](../artifacts/submission-mobile.jpeg)
- [Browser results](../artifacts/browser-validation.json)

Form screenshots show the top of its scrollable panel. The lower fields, consent and Publish action were reached during keyboard and submission checks. These screenshots show the actual unconfigured export, not test records presented as public submissions.

## Export and submission integrity

`dist/` contains 10 files totaling **493,957 bytes**: HTML, one JS chunk, one stylesheet, runtime config, favicon, local illustration, two fonts and two font licenses. Relative asset URLs were checked by serving the actual export at `/preview/`; there is no routing rewrite dependency. Obsolete chunks were removed, while all required runtime assets remain.

All deliverable files together are under 3 MiB uncompressed, comfortably below the 8,388,608-byte submission budget. Dependency/cache folders and dependency archives are outside the repository. No ignore-file edit or path budget was needed. The existing `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `backend/deno.json`, `backend/deno.lock` and `backend/supabase/config.toml` match the initial SHA-256 snapshot. No `.git/`, `.github/`, `.env`, root `lib/`, `node_modules/`, dependency manifest or lockfile was modified.

## Remaining limitations

No live Supabase deployment, SQL migration, real multi-user persistence, hosted CORS/RLS enforcement, domain mapping, DNS/HTTPS change or on-chain action was performed. Publish success was tested with mocked persistence only. The checked-in config is empty, so the shipped form clearly reports publishing unavailable. Deployment must replace the old Twitter-authenticated endpoint with the updated public one.

No screen reader, Firefox, Safari, physical mobile device, native 200% zoom, forced-colors rendering, RTL/localization or exhaustive contrast audit was performed. Authentication has intentionally been removed; account and address ownership are not verified. Moderation, rate limiting, editing and deletion remain absent. These boundaries are documented in the README and service notes rather than presented as completed features.
