# Pepe Collective design

## Overview

Pepe Collective is a one-action website for people building with AI. The "pepes armed with AI" illustration fills the whole viewport, the entire interface is green, and the only visible control is a lime **Submit a project** button. Everything else happens in a dark-green native dialog: Twitter verification, the five-field submission form, and a confirmation. There is no navigation, directory, footer or secondary copy on the page; a visually hidden `<h1>` keeps a document outline for assistive technology.

`src/styles.css` is the source of truth for tokens and component classes. `src/App.tsx` owns the page; `src/components/` holds the shared dialog, the submission flow and the two marks. Future surfaces should keep this restraint: one filled action per view, generous space, dark-green surfaces, light-green text, lime only for actions and emphasis. There is one dark theme and no theme switch (`color-scheme: dark`).

## Colors

All values are implemented in `src/styles.css` as hex primitives (one green ramp plus a lime accent). Components reference only the semantic tokens.

| Semantic token | Primitive and value | Use |
| --- | --- | --- |
| `--surface-page` | `--green-950` `#061a0f` | Page/canvas behind the artwork, backdrop fallback |
| `--surface-dialog` | `--green-800` `#123520` | Dialog panel |
| `--surface-field` | `--green-900` `#0b2416` | Text inputs, textarea, verification art tiles |
| `--surface-subtle` | `--green-700` `#1a472c` | Public callout, read-only field, success icon, error surface |
| `--surface-backdrop` | `rgb(6 26 15 / .72)` | Dialog backdrop (with 6px blur) |
| `--text-primary` | `--green-100` `#e2f5d4` | Headings, labels, field values |
| `--text-secondary` | `--green-200` `#b9e2a8` | Body copy, hints, read-only value, icon button |
| `--text-muted` | `--green-300` `#8fc984` | Placeholders, the "+" between marks |
| `--text-on-accent` | `--green-950` `#061a0f` | Text on lime buttons |
| `--border-subtle` | `--green-600` `#2a6a3c` | Dialog border, dividers, read-only field border |
| `--border-control` | `--green-500` `#4f9158` | Input borders |
| `--accent-solid` / `--accent-hover` | `--lime-400` `#c3ee86` / `--lime-300` `#d5f5a7` | Primary buttons, invalid-field border, checkbox accent, verification art |
| `--accent-text` | `--lime-400` `#c3ee86` | "Verified" label, link-style button, callout icon, success icon |
| `--focus-ring` | `--lime-100` `#eeffd2` | 3px focus outline, 3px offset |
| `--error-text` / `--error-surface` | `--lime-100` `#eeffd2` / `--green-700` `#1a472c` | Field errors and the form alert |

Errors stay inside the green system by design; they are distinguished by bold weight, an alert-circle icon, `aria-invalid` and a 2px lime border, never by hue alone. The page overlay is a fixed gradient `rgb(6 26 15 / .28) → .12 at 45% → .82` over the artwork so the button area reads darker.

Measured WCAG contrast (test/scratch script, relative luminance): primary text on dialog **11.73:1**; secondary text on dialog **9.32:1**; placeholder on field **8.49:1**; secondary text on subtle **7.32:1**; accent text on dialog **10.22:1**; error text on error surface **10.03:1**; button text on lime **13.67:1** and on hover **15.01:1**; input border on field **4.32:1**; focus ring on dialog **12.77:1** and on page **17.09:1**. The `--border-subtle` divider measures 2.07:1 and is decorative only. The focus ring sits 3px outside the lime button over the page or dialog surface, not on the lime itself.

## Typography

Body stack `Inter, Arial, sans-serif`; `--font-display` is `'Space Grotesk', Inter, Arial, sans-serif`. Both are self-hosted WOFF2 files in `public/fonts/` (variable weight 400–700, normal style only, `font-display: swap`); the browser check confirmed both loaded. Font synthesis is off; no italics are used.

| Role | Implemented |
| --- | --- |
| Page action (`.submit-button`) | Display, 600, `--text-cta` 1.25rem (1.125rem ≤ 40rem), letter-spacing −0.3px |
| Dialog heading (`.modal-heading h2`) | Display, 600, `--text-title` 1.3125rem, −0.4px |
| Step headings (`.auth-gate h3`, `.success-state h3`) | Display, 1.75rem (1.5rem ≤ 40rem), line-height 1.15, −0.8px |
| Body / dialog copy | `--text-ui` .875rem, line-height 1.6, `text-wrap: pretty` |
| Field values | `--text-body` 1rem (16px, avoids iOS zoom) |
| Labels, consent, errors, callout | `--text-sm` .75rem; labels and errors 600 |
| Hints and the Verified label | `--text-xs` .6875rem |

Headings use `text-wrap: balance`; dialog copy is capped at 38ch; the character counter and handles use `tabular-nums`/`overflow-wrap: anywhere` where values change or can be long.

## Layout

The page is a single `main.stage` grid filling `100dvh` (with a `100vh` fallback) that places the button at the bottom centre, inset by `max(10vh, safe-area + 24px)` vertically and `max(20px, safe-area)` horizontally. The artwork lives in `.backdrop`, a fixed full-viewport layer with `object-fit: cover` and `object-position: 60% 50%` (58% below 40rem) so the central frog stays in frame on portrait phones.

Spacing tokens `--space-1/2/3/4/5/6/8` are 4, 8, 12, 16, 20, 24 and 32px. The dialog is `min(560px, 100% − 24px)` wide with 20/24px padding (16px below 40rem), a 16px heading gap and 24px section gaps. `.form-grid` is two columns with 20×16px gaps; the description and wallet rows span both.

| Breakpoint | Adaptation |
| --- | --- |
| ≤ 40rem (640px) | Button becomes full width up to 420px with smaller type; single-column form; full-width submit; tighter dialog padding |
| ≤ 30rem height | Button centres vertically (landscape phones) |

Inspected at 1440×900, 390×844 and 320×568: no horizontal overflow, the dialog fits at 320 with 19px margins, and at 320 with the root font at 200% the button and dialog wrap without overflow while the dialog scrolls vertically (`max-height: min(92dvh, 900px)`, `overscroll-behavior: contain`).

## Elevation & Depth

Flat surfaces separated by 1px `--border-subtle` lines. The page button carries `0 12px 32px rgb(6 26 15 / .55)` plus a 1px inset highlight and a 1px dark outline; the dialog uses `0 24px 64px rgb(6 26 15 / .6)` and a blurred backdrop. Native `<dialog>` occupies the top layer; `.backdrop` is the lowest layer and `pointer-events: none`.

## Shapes

`--radius-control` 8px (buttons, callout, alert, icon button), `--radius-field` 7px (inputs), `--radius-cta` 16px (page button), `--radius-panel` 20px (dialog). The verification art tiles use 17px; the success icon is a circle. Keep the dialog rounder than its contents and the fields squarer than the buttons.

## Components

| Source / pattern | Reuse and behaviour |
| --- | --- |
| `src/styles.css` `.button` + `.button-primary` | Inline-flex action, ≥46px high, lime fill, dark text. Hover is gated by `hover: hover`; press scales to 0.96 and 150ms colour transitions apply only under `prefers-reduced-motion: no-preference`. Disabled lowers opacity and shows a wait cursor. |
| `.submit-button` | The page action variant: larger display type, 64px tall, 16px radius, shadow. There should be exactly one on the page. |
| `.link-button` | Inline text action (used for "Not you? Sign out"): underlined lime text, 24px minimum height. |
| `src/components/Modal.tsx` `Modal` | Props `title`, `children`, `onClose`. Uses `showModal()`; Escape, the labelled close button and backdrop click dismiss; focus returns to the opener and background scroll is locked. |
| `src/components/Submission.tsx` `Submission` | Prop `onClose`. Three states: verification gate (`.auth-gate`, button **Verify with Twitter**, `role="alert"` message), form (`.project-form`: read-only verified Twitter field with sign-out, four editable fields with hints, consent checkbox, submit), and success (`.success-state`, **Done**). Validation runs on submit, marks `aria-invalid`, links errors with `aria-describedby` and focuses the first invalid control. Saving disables the fieldset and the submit button keeps its label with "…". |
| `src/components/Marks.tsx` | `FrogMark` and `XMark`, decorative SVGs (`aria-hidden`). Other icons are lucide-react at 1.5–2px stroke. |
| `src/auth.tsx` `AuthProvider` / `useAuth` | `ready`, `authenticated`, `twitterUsername`, `error`, `login()`, `logout()`, `getAccessToken()`; `RESUME_KEY` tells the page to reopen the dialog after the OAuth redirect. |
| `public/images/pepe-squad.webp` | 1536×1024 background artwork, `alt=""` inside an `aria-hidden` layer. |

Forced-colors mode adds system borders to controls, a `Highlight` focus outline, and removes the gradient overlay.

## Do's and Don'ts

- Start a new surface from `main.stage` or a `Modal`; keep the artwork layer and `--surface-page` behind it.
- One lime `.button-primary` per view. Secondary actions are `.link-button` text or the icon close button, never a second filled colour.
- Put new colours through the semantic tokens; stay within the green ramp and lime accent. Do not add red, yellow or a light theme: status is carried by icon, text and weight.
- Keep text in the dialog, not on the page. The request removed all page text and controls except **Submit a project**; the hidden `<h1>` is the only exception.
- Keep every field labelled, hints before errors, and the public-visibility callout and consent ahead of the submit action.
- Recipe for another dialog: `Modal` + a content block using `.public-callout`, `.form-field`, `.field-hint`, `.field-error`, `.form-alert` and `.form-footer`, with the primary action last.
