# Pepe Collective design

## Overview

This implementation presents the community-organised Identity MD hackathon within the existing Pepe Collective website: a public directory for people building with AI, with a public submission form that opens without signing in. Its headline is “Small pepes. Big intelligence.” The hero adds the requested description, “Identity MD hackathon, organised by the community. Judged by IMD ai agents”. The original “pepes armed with AI working together” illustration, forest-green hero, lime actions, warm off-white page, white cards and green accents establish its visual character.

Only real submissions populate the directory; the unconfigured export starts empty. All projects is the sole directory view, alongside search and sorting. Twitter handles are self-reported.

The page has navigation, a split hero, three principles, a searchable directory, an invitation banner and a footer. That composition belongs to this landing page; reusable choices are its content alignment, typography, surface colors, buttons, fields, cards and native dialogs. There is one implemented theme and no theme switch.

The footer links to `https://hackathon.sites.imd.fun/`; `index.html` uses the same canonical and Open Graph URL, with a hackathon title and description. These source values identify the intended public address; hosting configuration and deployment status are documented separately in the README and validation record.

The source of truth is [src/styles.css](src/styles.css), with page patterns in [src/App.tsx](src/App.tsx) and shared components in [src/components/](src/components/). This document describes source declarations and behavior. Actual build, interaction and rendered-check results, including coverage limitations, are recorded in [docs/validation.md](docs/validation.md).

## Colors

Colors use hexadecimal CSS custom properties in `src/styles.css:4`. Keep the existing forest, lime, sage and warm-neutral palette and select tokens by role.

| Token | Value or resolved primitive | Implemented use |
| --- | --- | --- |
| `--surface-page` | `--neutral-50`: `#f7f8f4` | Page and header |
| `--surface-card` | `--neutral-0`: `#ffffff` | Cards, dialogs, editable fields and secondary actions |
| `--surface-subtle` | `--sage-50`: `#f5f7f1` | Callouts and address surfaces |
| `--surface-tint` | `--sage-100`: `#eaf0e5` | Invitation banner, hovered controls and icon discs |
| `--surface-dark` | `--forest-950`: `#11291d` | Hero, selected All projects control, dark action and toast |
| `--text-primary` | `--neutral-900`: `#202d23` | Headings, field values and primary text |
| `--text-secondary` | `--neutral-600`: `#5c685d` | Body copy, hints and navigation |
| `--text-muted` | `--neutral-500`: `#6a7569` | Placeholders and quiet metadata |
| `--text-on-dark` | `#f7f9f1` | Text on forest surfaces |
| `--text-on-dark-secondary` | `#c0cdbb` | Hero supporting copy and artwork caption |
| `--border-subtle` | `--neutral-200`: `#e1e6dc` | Structural dividers and card/dialog borders |
| `--border-control` | `#7f8b79` | Input outlines and secondary actions |
| `--accent-solid` | `--lime-400`: `#c3ee86` | Primary action fill and hero emphasis |
| `--accent-hover` | `--lime-300`: `#d5f5a7` | Primary action hover |
| `--accent-text` | `--forest-600`: `#42634b` | Green labels, links and icons on light surfaces |
| `--focus-ring` | `#47713c` | Focus outline on light surfaces |
| `--error-text` | `#a72d29` | Field error text and invalid border |
| `--error-surface` | `#fff1ed` | Form alert surface |

`--forest-800` (`#254632`) also supplies the dark invitation action's hover and checkbox accent. Component-specific decorative greens remain in the project marks, small frog tiles, illustration caption and invitation icon. These existing treatments do not define another action palette.

Focus uses a 3px solid outline with 4px offset. The hero uses lime focus over forest; the invitation banner overrides its focus back to `--focus-ring` on its light background. Forced-colors mode uses system `Highlight` and `ButtonText`. Errors pair color with written guidance and `aria-invalid`; the All projects control also exposes `aria-pressed`.

No contrast ratio is inferred from source here. Identified pairs and measurements belong to validation; illustration, transparency and hover backgrounds require their own rendered checks.

## Typography

Body text uses `Inter, Arial, sans-serif`; display text uses `--font-display: 'Space Grotesk', Inter, Arial, sans-serif`. Local files are [public/fonts/inter-latin.woff2](public/fonts/inter-latin.woff2) and [public/fonts/space-grotesk-latin.woff2](public/fonts/space-grotesk-latin.woff2), with their licenses beside them. Both `@font-face` declarations request normal styles at weights 400–700 and `font-display: swap`. Font synthesis is disabled. These are CSS declarations; loaded-face confirmation is a separate browser check.

| Role | Source declaration |
| --- | --- |
| Hero heading | Space Grotesk, 600, `clamp(2.65rem, 4.55vw, 3.75rem)`, line-height 1.06, tracking −2.8px before breakpoint overrides |
| Hero supporting and hackathon copy | Inter, `--text-ui: .875rem`, line-height 1.75, `--text-on-dark-secondary`; 12px up to 55rem and 13px up to 42rem |
| Directory heading | `--text-section: 2.25rem`, display face, 500, line-height 1.2, tracking −1.5px |
| Project card heading | `--text-title: 1.25rem`, display face, 600, tracking −0.55px; 22px on mobile |
| Dialog title | 21px display face, 600, tracking −0.5px; 19px on mobile |
| Body and ordinary actions | `--text-ui: .875rem`; default paragraph line-height 1.6 and button line-height 1.4 |
| Supporting copy | `--text-sm: .8125rem`; project descriptions use 13px and line-height 1.8 |
| Fields | 16px; textarea line-height 1.5; search rises from 12px to 16px and the sort select from 11px to 16px on mobile |
| Labels and metadata | Component-specific 8–12px in the original compact design; field labels are 12px/600 and hints are 11px/1.6 |

The root also declares `--text-xs: .75rem` and `--text-body: 1rem`. Not all component sizes consume these tokens: the restored stylesheet retains local values rather than a completely tokenized type scale.

Headings use `text-wrap: balance`; paragraphs use `text-wrap: pretty`. Long handles, descriptions, project names and addresses use `overflow-wrap: anywhere`. Card descriptions clamp to three lines and builder handles can ellipsize; the detail dialog exposes complete information. Addresses remain selectable, and copy failure offers manual selection. Directory/filter counts and the description character count use tabular numerals. Dialog copy is constrained by panel width, with success paragraphs capped at 380px.

The hero's `.hackathon-description` is a separate paragraph with `max-width: 44ch`. It uses natural wrapping without a forced line break, preserving the existing hierarchy between headline, supporting copy and submission action.

## Layout

The shared `.container` is centered at `min(100%, 1304px)` with 32px inline padding. The header shares its maximum width and alignment. The body declares `min-width: 320px`. Logical inline/block properties carry most directional spacing; the current English interface does not implement locale or direction switching.

Spacing tokens `--space-1/2/3/4/6/8/12` are 4/8/12/16/24/32/48px. Components also retain direct spacing values. Reuse the existing layout relationships rather than assuming every dimension derives from a token.

The hero starts 32px below the header, uses `1.05fr 1fr` columns and a 425px minimum height. Copy has 40px top and 44px leading padding. The hackathon paragraph follows the existing supporting copy with `margin-block-start: var(--space-3)` (12px), before the action row. Minimum height allows the panel to grow with its content. Artwork fills the second column with `object-fit: cover` and a mask fading into the dark surface. Mobile moves artwork below the copy at a 3:2 aspect ratio.

The directory separates its heading, All projects/search toolbar, results/sort row and card grid. Cards begin in three equal `minmax(0, 1fr)` columns with 18px gaps. Filters and results wrap; search has a 180px minimum width. Card footers use `margin-block-start: auto` to align metadata. Form fields use two columns with 20px row/16px column gaps; description and wallet span the width.

| Breakpoint | Implemented adaptation |
| --- | --- |
| Up to 70rem (1120px at a 16px base) | Tighter header/hero spacing, smaller hero type, compact principle/card spacing |
| Up to 55rem (880px) | Desktop navigation replaced by a menu button and expandable native links/buttons, preserving every destination; two card columns, wrapping directory toolbar, smaller two-column hero and two visible principle columns |
| Up to 42rem (672px) | 20px page margins; tighter compact header; single-column hero, principles, cards and form; full-row search; directory submit duplicate hidden; stacked invitation/footer |
| Up to 23rem (368px) | 14px page margins, smaller brand/control spacing, 2.35rem hero heading and compact All projects control |

Dialogs use `width: min(540px, calc(100% - 32px))`; the submission form's `.modal-wide` uses 660px instead. `max-height: min(90dvh, 900px)` permits vertical scrolling. Content padding is 24px 28px 28px, becoming 18px 20px 24px at 42rem. The publish action fills its row on mobile. Full addresses wrap in their detail rows.

Chromium checks found no page overflow at 320, 390, 672, 673, 768, 880, 1024 and 1440 CSS pixels, and no form overflow at 320, 390 and 768px. Screenshots cover mobile, tablet, desktop and form validation. This does not cover every possible width or physical-device behavior; see validation for limitations.

## Elevation & Depth

Most content uses flat surfaces and 1px structural borders. The hero is a dark inset panel with clipped artwork; its mask blends from transparent to opaque over the first 15%, horizontally on desktop and vertically on mobile.

The native dialog occupies the browser top layer. Its shadow is `0 12px 50px #11291d26`; the backdrop is `#0b201c9e` with a 4px blur. Opening locks body scrolling; closing restores prior focus. A toast uses fixed positioning, `z-index: 9`, a forest border and `0 6px 25px #11291d30`. The skip link has `z-index: 100`. Hovered cards receive `0 4px 16px #11291d05` shadow and a `#b2c6a6` border.

## Shapes

Declared radii are `--radius-sm: 6px`, `--radius-control: 8px`, `--radius-card: 12px` and `--radius-panel: 20px`. Buttons use 8px; cards/invitation banners 12px; hero/dialogs 20px, with the mobile hero reduced to 16px. Inputs/address rows use 7px, icon buttons 6px, badges 5px. Status dots, principle discs and the success mark are circular.

Keep fields recognizable through their borders. Preserve the existing panel/card hierarchy; a decorative icon disc does not determine the shape of a text action.

## Components

| Component or source pattern | Reuse and states |
| --- | --- |
| `.button`, `.button-primary`, `.button-secondary` in `src/styles.css` | Inline-flex actions, generally at least 46px high; lime primary and bordered light secondary variants. Hero action is at least 48px. Native disabled actions use opacity .65 and a wait cursor. |
| Header/navigation in `src/App.tsx` | Hash links navigate to the page/directory; buttons open information dialogs. Mobile toggle exposes `aria-expanded` and an open/close name. `openInfo` focuses `menuToggle` before collapsing the mobile menu, so dialog cleanup returns focus to the persistent menu button. No authentication or account controls are displayed. |
| Footer in `src/App.tsx` | Retains the brand, “Small pepes. Big things.” tagline and information-dialog buttons. The underlined `hackathon.sites.imd.fun` anchor uses the public HTTPS address and opens in the same tab; footer groups stack at 42rem. |
| `ProjectCard` in `src/App.tsx` | Local page pattern, not an exported library component. Props `project`, `index`, `open`; title opens full details. A Public project badge and the self-reported Twitter handle identify each record. There are no inferred categories or verification badges. |
| `ProjectDetail` in `src/App.tsx` | Local full-record pattern: description, Twitter identity, username, contract and wallet. Copy controls show a check and announce feedback; account links identify new-tab behavior. Copy explicitly states that accounts and addresses are not verified. |
| Directory toolbar in `src/App.tsx` | The sole All projects button uses `aria-pressed="true"` and clears the search; labeled search supports clearing; native select changes newest/alphabetical sorting. Counts use `role="status"`. Empty search offers Clear search; load failure offers Try again; no-data state offers submission. |
| `Modal` in `src/components/Modal.tsx` | Exported props `title`, `children`, `onClose`, optional `wide`. Uses `showModal()`, accessible title, explicit non-submit close button, Escape/cancel handling and backdrop-click dismissal. Native modality supplies background inertness and focus containment; cleanup restores the element focused before opening. For mobile information dialogs, `openInfo` makes that element the persistent menu toggle. |
| `Submission` in `src/components/Submission.tsx` | Exported callbacks `onPublished`, `onClose`. The form opens directly with editable Twitter username, project username, EVM contract, description and public EVM wallet. Consent precedes publishing. |
| Form field pattern in `Submission` | Persistent labels/hints; errors linked with `aria-describedby`; `aria-invalid`; first invalid field receives focus. Fieldset/publish action disable during requests. Failed save retains input; success follows a stored record returned by the server. |
| `FrogMark`, `XMark`, `ProjectMark` in `src/components/Marks.tsx` | Shared inline SVG marks with six `.mark-*` project treatments. Lucide React supplies interface icons. `public/images/pepe-squad.webp` is the locally bundled original hero artwork. |
| Notices in `src/App.tsx` and `Submission` | Stable status region announces copy feedback; visible toasts are dismissible. Form errors use alerts. Unconfigured publishing explains unavailability before data entry and after submission without pretending to succeed. |

Hover styling is gated by `@media (hover: hover)`. Under `prefers-reduced-motion: no-preference`, buttons transition background/scale over 150ms with `ease-out`, pressed buttons scale to .96, and cards transition border/shadow over 150ms. Smooth scrolling is also opt-in. No autoplay media or staged page-load animation is implemented. Written state feedback remains independent of motion.

## Do's and Don'ts

- Start another surface from `.container`, the existing heading hierarchy and semantic surface/text tokens; preserve header alignment.
- Use lime for the principal submission action and the bordered treatment for adjacent secondary actions. The selected All projects control is a separate state.
- Reuse `Modal` and the existing label/hint/error structure. Keep complete addresses and descriptions reachable beyond abbreviated cards.
- Preserve the first version's forest/lime hero and light directory instead of reintroducing the later full-screen, all-green single-button layout.
- Keep the directory free of fictional entries and category filters. Twitter accounts, contracts and wallets are self-reported; never show them as verified. Show publication success only after server confirmation.
- Preserve local fonts, artwork and relative production asset URLs; avoid remote visual dependencies for otherwise static content.

For another page, reuse the content container, Space Grotesk heading/Inter text pairing and button variants; assemble cards or labeled fields from these patterns. Use hash navigation or explicitly exported static files so hosting needs no server rewrite. Add responsive rules where new content requires them, validate against established breakpoints and update this document when implemented tokens/components change.
