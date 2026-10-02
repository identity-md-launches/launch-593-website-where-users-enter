# Pepe Collective design

## Overview

Pepe Collective is a public project directory for people building with AI. The green visual direction combines a quiet, light directory with a forest-green hero and a group of Pepe frogs carrying AI tools. The hero composition belongs to this landing page; the shared surface, type, control, and spacing rules belong to the wider product.

`src/styles.css` is the source of truth for tokens and component classes. `src/App.tsx` owns the page and directory patterns; `src/components/` contains the shared dialog, submission flow, and marks. Maintain clear section headings, compact metadata, generous space around primary actions, and consistent card alignment. There is one light theme with dark accent surfaces; there is no theme switch.

## Colors

All values below are implemented in `src/styles.css`. Prefer semantic tokens when adding UI.

| Semantic token | Value or canonical token | Use |
| --- | --- | --- |
| `--surface-page` | `--neutral-50`: `#f7f8f4` | Page and header |
| `--surface-card` | `--neutral-0`: `#ffffff` | Cards, dialogs, fields |
| `--surface-subtle` | `--sage-50`: `#f5f7f1` | Read-only fields, category labels, notices |
| `--surface-tint` | `--sage-100`: `#eaf0e5` | Join banner, callouts, hover surfaces |
| `--surface-dark` | `--forest-950`: `#11291d` | Hero, selected filter, toast, dark action |
| `--text-primary` | `--neutral-900`: `#202d23` | Headings and main text |
| `--text-secondary` | `--neutral-600`: `#5c685d` | Body copy and metadata |
| `--text-muted` | `--neutral-500`: `#6a7569` | Placeholders and quieter metadata |
| `--text-on-dark` / `--text-on-dark-secondary` | `#f7f9f1` / `#c0cdbb` | Text on forest surfaces |
| `--border-subtle` / `--border-control` | `--neutral-200`: `#e1e6dc` / `#7f8b79` | Dividers and cards / input boundaries |
| `--accent-solid` / `--accent-hover` | `--lime-400`: `#c3ee86` / `--lime-300`: `#d5f5a7` | Primary actions and hero highlights |
| `--accent-text` | `--forest-600`: `#42634b` | Green text, category labels, success icon |
| `--focus-ring` | `#47713c` | Focus on light surfaces |
| `--error-text` / `--error-surface` | `#a72d29` / `#fff1ed` | Field errors and failure alerts |

`--forest-800` (`#254632`) supplies the dark-action hover and checkbox accent. The hero eyebrow uses `#c3ee86` on `#1d3925`, with a `#345031` border. Project mark variants use local green pairs in `.project-mark` and `.mark-1` through `.mark-5`; they identify illustrations, not status. Success uses green plus an icon and written confirmation; errors have text and an invalid state as well as color.

Measured foreground/background contrast pairs: secondary text on white **5.84:1**; muted text on white **4.82:1**; category `#42634b` on `#f5f7f1` **6.24:1**; CTA `#11291d` on `#c3ee86` **11.70:1**; hero secondary text on forest **9.34:1**; hero eyebrow text on its background **9.55:1**. These measurements describe those pairs, not a complete accessibility certification.

## Typography

The body stack is `Inter, Arial, sans-serif`; `--font-display` is `'Space Grotesk', Inter, Arial, sans-serif`. Local `public/fonts/inter-latin.woff2` and `public/fonts/space-grotesk-latin.woff2` are declared as normal, weights 400–700, with `font-display: swap`; no italic face is declared. Font synthesis is disabled. Both intended families were confirmed loaded in browser inspection. License files accompany the fonts.

| Role | Implemented size, weight, and rhythm |
| --- | --- |
| Hero heading | Display, 600, desktop `clamp(2.65rem, 4.55vw, 3.75rem)`, line-height 1.06, letter-spacing −2.8px; responsive overrides below |
| Section heading | `--text-section`: 2.25rem, display 500, line-height 1.2, tracking −1.5px |
| Card title | `--text-title`: 1.25rem, display 600, tracking −.55px; 22px on mobile |
| Dialog heading | Display 600, 21px, tracking −.5px; 19px on mobile |
| General UI / body | `--text-ui`: .875rem; `--text-body`: 1rem; paragraphs default to line-height 1.6 |
| Card description | 13px, line-height 1.8, three-line preview; full text in detail dialog |
| Smaller UI | `--text-sm`: .8125rem; `--text-xs`: .75rem; individual metadata uses 10–12px |
| Fields and labels | Input/textarea 16px; labels 12px/600; hints 11px; errors 12px |

Eyebrows use uppercase with 1.3–1.8px tracking. Counts use tabular numbers. Headings balance wrapping; paragraphs use `text-wrap: pretty`. The hero heading, project handles, detail text, and addresses can break long words. `.hero-copy` has `min-width: 0` so enlarged heading text can remain inside its grid cell. Authentication copy is limited to 360px; success copy to 380px; empty-state copy to 500px.

## Layout

`.container` centers content at a maximum outer width of 1304px, with 32px inline padding. `body` supports a minimum width of 320px. Spacing tokens `--space-1`, `-2`, `-3`, `-4`, `-6`, `-8`, and `-12` define 4, 8, 12, 16, 24, 32, and 48px; existing component rules also use explicit values such as the 18px card gap and 20px form row gap.

The landing page uses a two-column hero, a three-item principles row, a directory heading and toolbar, then `.project-grid`. Cards use `minmax(0, 1fr)`, flexible vertical layout, and bottom-aligned metadata. The toolbar wraps rather than scrolling horizontally. `.form-grid` is two columns with description and wallet rows spanning both columns.

| Breakpoint | Active adaptations |
| --- | --- |
| Above 70rem | 92px header, full navigation, three directory columns; hero copy/art columns 1.05fr/1fr |
| At most 70rem | Tighter navigation and cards, short sign-in label, hero heading 3.15rem |
| At most 55rem | Two directory columns; 80px header; last desktop nav item hidden; two principles shown; hero heading 2.7rem; hero actions stack |
| At most 42rem | 20px page padding; mobile menu; single-column hero with 3:2 art below copy; all three principles stacked; single-column cards and form; full-width search; footer and join banner stack |
| At most 23rem | 14px page padding, smaller brand and controls; hero heading 2.35rem and narrower copy padding |

At 42rem and below the hero heading uses `clamp(2.55rem, 8vw, 3.4rem)` until the 23rem override. Hero artwork is cropped with `object-fit: cover`; its edge mask fades horizontally on desktop and vertically on mobile. The duplicate directory submit action is hidden on mobile; hero and join actions remain available.

The final page was inspected at 320, 390, 768, 1024, and 1440px with no horizontal page overflow: one card column at 320/390, two at 768, and three at 1024/1440. Intermediate widths are governed by the CSS rules above. Native dialogs have `max-height: min(90dvh, 900px)` and scroll when content exceeds a short viewport.

At 320px with root font size enlarged to 200%, the repaired hero heading wrapped completely within its 250px content width. This root-font check is distinct from browser-native zoom and does not establish enlargement of every pixel-sized label. Final input boundaries measured 3.58:1 on white; the light-surface focus ring measured 5.68:1 on white.

## Elevation & Depth

Most surfaces are flat, separated by subtle 1px borders. Hovered cards use border `#b2c6a6` and shadow `0 4px 16px #11291d05`. Dialogs use `0 12px 50px #11291d26`; their backdrop is `#0b201c9e` with 4px blur. Toasts use `0 6px 25px #11291d30` and `z-index: 9`. The keyboard skip link has `z-index: 100`; native modal dialogs occupy the browser's top layer. Hero art is isolated beneath its copy.

## Shapes

The radius tokens are `--radius-sm: 6px`, `--radius-control: 8px`, `--radius-card: 12px`, and `--radius-panel: 20px`. Buttons use the control token; cards use the card token; the desktop hero uses the panel token. Fields/filter controls use 7px, badges 5px, dialogs 20px, and the mobile hero 16px. Status dots, success marks, and principle icons are circular. Keep these distinctions instead of rounding every surface into a pill.

## Components

| Source / pattern | Reuse and behavior |
| --- | --- |
| `src/styles.css`: `.button` | Shared inline-flex action, normally at least 46px high. `.button-primary` is lime, `.button-secondary` is bordered white, `.button-signin` is compact. Join-banner primary is forest. Hover is gated by `hover: hover`; disabled controls lower opacity and show a wait cursor. |
| `src/App.tsx`: navigation | Hash links for home/projects; buttons open informational dialogs. Mobile toggle exposes `aria-expanded` and `aria-controls`; selecting a destination closes it. A visible-on-focus skip link targets the main content. |
| `src/App.tsx`: directory | Category buttons use `aria-pressed`, search has a programmatic label and clear control, sort is a native select. Result counts use a status region. Loading, retryable load failure, no matches, and an empty live directory have explicit states. |
| `src/App.tsx`: `ProjectCard` / `ProjectDetail` | Local patterns, not exported library components. Title button opens details; description preview is clamped. Details expose all five fields and copy-address buttons with an announced result or manual-copy fallback. Examples are explicitly labeled. |
| `src/components/Modal.tsx`: `Modal` | Props: `title`, `children`, `onClose`, optional `wide`. Native `showModal()` supplies modal interaction; Escape, close button, and backdrop click dismiss. Captures/restores prior focus and locks background scrolling. Width 540px, or 660px with `wide`, constrained to viewport minus 32px. |
| `src/components/Submission.tsx`: `Submission` | Props: `onPublished`, `onClose`. Shows the Twitter authentication gate before fields. Authenticated Twitter is read-only; username, EVM contract, description, and EVM wallet are editable. Public disclosure and consent precede publishing. Validation associates errors with fields and focuses the first invalid field. Saving disables the fieldset and submit button; success appears after a server response. |
| `src/components/Marks.tsx` | `FrogMark({className})`, `XMark()`, and `ProjectMark({index})`; decorative SVGs use `aria-hidden`. Project marks cycle through six Lucide icons and color treatments. Other interface icons come from `lucide-react`. |
| `public/images/pepe-squad.webp` | Local 1536×1024 hero image, with descriptive alt text in `App.tsx`. Generation prompt and provenance are in `artifacts/hero-prompt.md`. |

Global focus uses a 3px outline with 4px offset; hero controls use lime, while the join banner explicitly uses `--focus-ring` on its light background. Forced-colors mode adds control borders and a system-color focus outline. Smooth scrolling, 150ms action/card transitions, and active button scaling only apply when reduced motion is not requested. Toast text has a parallel status announcement and a dismiss button.

The committed preview has no configured production authentication or publication service; it shows labeled examples and keeps submission fields behind authentication. Form rendering was exercised through test fixtures, not a live Twitter session. No screen-reader or complete accessibility compliance claim is made here.

## Do's and Don'ts

- Start another page with `.container`, the semantic colors, Inter body copy, and display headings. Keep the shared header/footer and use hash navigation unless separate static pages are deliberately exported.
- Reuse `.button-primary` for the main action, secondary buttons for supporting actions, and `Modal` for focused detail or form tasks. Preserve labels, focus handling, loading feedback, and clear recoverable errors.
- Keep public-submission language explicit and fictional examples labeled. Do not present sign-in as verification of contract or wallet ownership.
- Reuse local marks, hero assets, and fonts. Keep status meaning in text and icons; decorative project colors are not a status system.
- Preserve the light directory and forest accent hierarchy. Avoid introducing a dark theme, unrelated accent palette, or stronger card shadows without an intentional broader design change.
