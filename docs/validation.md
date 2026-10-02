# Validation record (Better Interface review and checks)

Date: 2026-10-02. Worker-side record; not an independent certification.

## 1. Scope and assumptions

- Reviewed: the single page (`src/App.tsx`), the dialog (`src/components/Modal.tsx`) and the submission flow (`src/components/Submission.tsx`) in its three states; the production export in `dist/`.
- Request applied literally: Privy removed; Twitter verification via Supabase Auth's Twitter provider; whole site green; the "pepes armed with AI" artwork as the full-page background; all page text and controls removed except **Submit a project**. A visually hidden `<h1>` and the dialog's own labels/buttons were kept because the flow cannot be operated or announced without them.
- No directory listing remains; stored submissions stay publicly readable through the API.
- Not in scope: a live Supabase project, a Twitter developer app, package manifest/lockfile edits (forbidden by the assignment), themes, localisation.

## 2. Coverage

| Domain | Status | Inspected / evidence |
| --- | --- | --- |
| Accessibility | Checked | Native `<button>`, `<dialog>`, `<label for>`, `aria-invalid` + `aria-describedby`, `role="alert"`/`role="status"`, visible 3px focus ring viewed on the page button and dialog close button, Escape/close/backdrop paths, focus return verified in Chromium, hidden `<h1>` + `<main>`, decorative image `alt=""` in an `aria-hidden` layer, reduced-motion gate, 320px reflow and 200% root font size. **Not performed:** screen-reader session, browser-native zoom, automated audit (axe not available offline in this session), physical device. |
| Layout | Checked | Viewports 1440×900, 390×844, 320×568; no horizontal overflow; button inset with safe-area padding; dialog margins 19px at 320; landscape rule (≤30rem height) from source only. **Not performed:** RTL mirror, intermediate tablet widths (layout has one breakpoint at 40rem). |
| Writing | Checked | Verb-first labels (Submit a project, Verify with Twitter, Submit project, Done, Not you? Sign out), sentence case, errors state the fix beside the field, hints before errors, public-visibility consequence stated before consent and submit, one vocabulary ("verify", "submit"). |
| Typography | Checked | Two self-hosted WOFF2 families confirmed loaded; 16px inputs; `balance` on headings, `pretty` on copy, 38ch measure, tabular counter, `overflow-wrap: anywhere` on long values; wrapping observed at 320 and at 200% root font. |
| Colors | Checked | One green ramp + lime accent, semantic tokens only in components; 18 foreground/background pairs measured (see DESIGN.md); gradient overlay assessed by viewing the rendered page, button has an opaque fill so its contrast does not depend on the artwork. |
| UI | Checked | Concentric radii (dialog 20 > controls 8 > fields 7), shadows for the floating button and dialog, press scale 0.96 and 150ms transitions under reduced-motion gate, lucide icons `currentColor`, icon-only button labelled, error icon + text. |

## 3. Findings and fixes

| # | Severity | Location | Evidence | Change | Recheck |
| --- | --- | --- | --- | --- | --- |
| 1 | MEDIUM | `src/components/Submission.tsx:66` (sign-out button) | In the browser fixture, after a failed submit then **Not you? Sign out**, the verification step still showed "Unable to reach the submission service…", an error unrelated to verification. | Clear the form status before signing out. | Rebuilt; repeated the sequence at 320px: verification step shows no alert. |
| 2 | MEDIUM | `src/auth.tsx` callback cleanup | Unit test showed the hash fragment `#join` was rewritten to `#join=` when cleaning OAuth parameters. | Only rewrite the fragment when it carries `error` parameters. | `tests/auth.test.tsx` passes (URL becomes `?keep=1#join`). |
| 3 | LOW | `vite.config.ts` | `vitest` picked up `backend/tests/*.test.*` (Node and Deno suites) and reported false failures. | Restrict Vitest to `tests/**/*.test.{ts,tsx}`. | `npm test`: 3 files, 18 tests. |
| 4 | LOW | `src/styles.css` `.form-field [aria-invalid=true]` | Design intent: errors must not rely on a red hue in an all-green site. | Invalid fields get a 2px lime border, errors carry an icon and bold text, alerts use `role="alert"`. | Viewed at 1440 and 320 after an empty submit. |

Previous-version findings (directory, navigation, hero) are moot: those surfaces were removed by the request.

## 4. Verification

| Command / action | Outcome |
| --- | --- |
| `npm ci` | 203 packages from the lockfile (temporary npm cache). |
| `npm run typecheck` | exit 0 |
| `npm test` | 18 passed / 0 failed (3 files) |
| `npm run test:backend` | 9 passed / 0 failed |
| `npm run build` | exit 0; `dist/` regenerated after the last source change (`index-BfTjotc5.js`, `index-BnDr6NIR.css`); the final export was reloaded in Chromium with no console errors |
| Deno `check`/`test` | not run (Deno not installed) |
| Chromium, `http://127.0.0.1:8899/dist/index.html` | 1440×900: page, Tab focus ring, Enter opens dialog, preview message on **Verify with Twitter**, Escape closes, focus back on the button, console 0 errors/0 warnings, 8/8 static resources 200. 390×844 and 320×568: page and dialog without overflow. 320 + root font 200%: button 280×139px wraps inside the viewport; dialog scrolls internally. |
| Form fixture (temporary `dist/config.js` → `http://localhost:1`, seeded session) | Dialog resumed on the form; empty submit → 5 invalid controls, 5 inline errors, focus on the first; valid submit → network failure alert, all values and consent retained, submit re-enabled; sign out → verification step. Config restored and export rebuilt from `public/config.js`. Console errors during the fixture were the intended failed `localhost:1` requests. |
| Screenshots | Viewed inline; the browser tool could not write files into this workspace (read-only for that process), so none are committed. |

## 5. Completion

**Complete for the stated scope**, with these limitations: no live Twitter OAuth or Supabase deployment, Deno suites not executed, no screen reader, no native zoom, no physical device, no screenshot files. The package manifest and lockfile still list the unused Privy and viem packages because the assignment forbids editing them; nothing imports them and the bundle contains neither.
