---
name: Seros Oath Gate
description: AI and agentic consulting. Agents do the work; a person opens the final threshold.
colors:
  night: "#030620"
  blue-deep: "#050a31"
  blue: "#0b155d"
  ink: "#080d4a"
  vellum: "#e9eafa"
  paper: "#eef0ff"
  ice: "#e2e5ff"
  accent-dark: "#ffffff"   # Signal White, accent on dark surfaces
  accent-light: "#1230b8"  # Signal Ink, accent on light surfaces
  lilac: "#dbe6ff"
  prism: "#a8c4ff"
  steel: "#608acd"
  amber: "#ffd166"         # focus and review only
  white: "#fff"
typography:
  display:
    fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif"
    fontSize: "clamp(3.4rem, min(5.6vw, 8vh), 6.6rem)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif"
    fontSize: "clamp(3rem, 6vw, 6.5rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "clamp(1.05rem, 1.5vw, 1.32rem)"
    lineHeight: 1.35
  label:
    fontFamily: "'Courier New', Courier, monospace"
    fontSize: "0.72rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.07em"
rounded:
  artifact: "0.2rem"
  round: "50%"
spacing:
  page-gutter: "clamp(2rem, 8vw, 11rem)"
  section: "clamp(5rem, 10vw, 10rem)"
  control: "1.3rem"
components:
  button-primary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.blue-deep}"
    rounded: "{rounded.artifact}"
    padding: "1rem 1.3rem"
  button-primary-hover:
    backgroundColor: "transparent"
    textColor: "{colors.white}"
  button-nav:
    backgroundColor: "{colors.white}"
    textColor: "{colors.blue-deep}"
    rounded: "{rounded.artifact}"
    padding: "0.62rem 0.85rem"
---

# Design System: Seros Oath Gate

> Token values in the front matter mirror `assets/styles.css` `:root`, which is the source of truth. If they disagree, the CSS wins. Fix this file.

## Overview

**Creative North Star: "The Oath Gate"**

Seros presents an accountable hand-off as a modern myth: a classical messenger carries a commitment along a celestial route, while a human witness opens the final threshold. The system borrows monumentality from editorial publishing, not fantasy-product decoration. Its most important visual contrast is between the charged cobalt signal field and calm vellum record.

The experience is direct, sober, and operational. Monumental serif declarations make the promise memorable; clear reading copy and mono record labels make the control path inspectable. Tidal glass uses translucent aqua layers and slow liquid refraction only for meaningful surfaces; the many motions explain passage, record arrival, and a held human threshold rather than hiding the workflow. The real Seros engraving is the sole literal mythological figure. Route lines, seals, ruled records, and threshold language are functional framing devices, never evidence of autonomous action or an extra product claim.

**Key Characteristics:**
- Cobalt authority, vellum records, and electric-aqua seals establish the core material vocabulary.
- Large uppercase serif declarations meet compact mono evidence labels.
- Full-bleed editorial fields alternate with document-first reading surfaces.
- Human confirmation has a distinct, persistent visual meaning.
- Literal mythology is limited to real brand art; geometric routes carry the rest of the system.

## Colors

The palette separates signal, record, review, and confirmation instead of using color as generic decoration.

### Primary
- **Cobalt Field** (`#0b155d`, `--seros-blue`): The page background on marketing surfaces and the brand field.
- **Deep Cobalt** (`#050a31`, `--seros-blue-deep`): Text on white buttons, closing actions, deep bands.
- **Night** (`#030620`, `--seros-night`): Site frame and the darkest bands.

### Secondary
- **Paper** (`#eef0ff`, `--seros-paper`) and **Vellum** (`#e9eafa`): Document and workflow surfaces.
- **Ink** (`#080d4a`, `--seros-ink`): Copy and rules on paper.
- **Ice** (`#e2e5ff`): Secondary copy on dark fields.
- **Steel** (`#608acd`): Supporting marks and secondary signal details.

### Accent
- **Signal White** (`#ffffff`, `--seros-gold`): The accent on dark fields: rules, seals, the navigation action, the human-witness marker.
  Because it is a *value* rather than a hue it cannot be read on light surfaces; use **Signal Ink** (`#1230b8`, `--seros-ink-accent`) there
  (doc banners, inline code, the close band CTA). Picking the wrong one of the pair makes the accent vanish.
- **Lilac** (`#dbe6ff`) and **Prism** (`#a8c4ff`): Dimmed accent for large areas, route strokes and gradient stops.
- **Review Amber** (`#ffd166`): Keyboard focus and cautious review state only.

**The State Is Not Ornament Rule.** Amber means focus or review. White on dark and Signal Ink on light mark the single most important element. Do not use them as interchangeable decorative accents. (The former mint confirmation colour is retired; `--seros-green` is an alias of lilac.)

## Typography

**Display Font:** Source Serif 4, weight 600, self-hosted at `/assets/fonts/` (SIL OFL 1.1; the CSP forbids font CDNs), Georgia fallback. Sentence case. Since 2026-10-03, replacing 800-weight uppercase Georgia at .78 line-height, which read as crammed on phones.
**Body Font:** Georgia (with `'Times New Roman', serif` fallback)
**Label/Mono Font:** `'Courier New', Courier, monospace`

**Character:** The display serif is large, open, and declarative. The mono face is reserved for signals, state, timestamps, labels, and record-like metadata; it must not take over reading copy.

### Hierarchy
- **Display** (800, `clamp(3.8rem, 7.2vw, 8.2rem)`, 0.78 line-height): Hero declarations in uppercase, at a maximum of roughly 12 characters per line.
- **Headline** (800, `clamp(3rem, 6vw, 6.5rem)`, 0.84 line-height): Section and document headings in uppercase.
- **Title** (800, `1.05rem–1.4rem`, 1 line-height): Workflow and control-item titles in uppercase.
- **Body** (regular, `clamp(1.05rem, 1.5vw, 1.32rem)`, 1.35 line-height): Lead copy. Document reading copy is held to 70ch.
- **Label** (700, `0.72rem`, 0.07em tracking): Uppercase field names, state labels, nav labels, and timestamps.

**The Declaration / Evidence Rule.** Let a display declaration carry the emotional weight. Put the proof, source detail, and state in a smaller mono or ordinary reading line beneath it.

## Layout

The system uses a `1440px` maximum frame with a fluid page gutter of `clamp(2rem, 8vw, 11rem)`. Marketing pages assemble as large, full-bleed editorial bands: a full-height hero, a vellum workflow record, a dark controls broadside, and a closing threshold. A two-column hero gives the proposition and action a left-hand anchor while the review artifact inhabits the right.

Legal and trust pages use the same frame but remain document-first: a roughly `900px` reading column, optional `180px` sticky table of contents, generous top offset under the rail, and the messenger engraving only as a low-opacity contextual field. At `900px`, large grids collapse to one column. At `650px`, the navigation simplifies, review rows stack, and the engraved figure becomes secondary to headline and action.

Spacing uses close internal record groups and long field-to-field intervals. Typical control gaps are `1.3rem`; major bands use `clamp(5rem, 10vw, 10rem)` plus a smaller Oath Gate inset when necessary.

## Elevation & Depth

The system is structurally flat by default. Ruled lines, tonal field changes, oversized type, and the messenger silhouette provide most of the depth. Important, singular surfaces may receive a soft ambient lift, never a colored halo: the review artifact uses `0 24px 44px rgba(0,0,0,.27)` because it is the active decision object, not a generic card.

**The Witness Lift Rule.** Use an ambient shadow only when a surface represents a consequential human decision or momentary physical artifact. Other sections stay flat and are separated by material, color, and rules.

## Shapes

Forms are nearly square and editorial. The review artifact uses a restrained `0.2rem` radius; borders are thin ruled lines rather than round card containers. Dots and brand marks may be circular. The system’s distinctive geometry is the route: a dotted line with mapped points, crossings, and a deliberate stop at the human threshold.

Do not replace the real Seros engraving with generic gods, wings, laurel clip art, cartoon symbols, or AI-made fantasy imagery.

## Components

### Buttons
- **Character:** Clear hand-off controls, not soft SaaS pills.
- **Shape:** Nearly square (`0.2rem`) with a 1px border and uppercase serif label.
- **Primary:** White on the cobalt field in the hero; Signal Ink on paper in the closing band. Base padding is `1rem 1.3rem` with a `3.45rem` minimum height.
- **Launch navigation:** Gold on midnight, padding `0.62rem 0.85rem`.
- **Hover / Focus:** Hover moves an action upward by 2–3px and inverts to a transparent field where context allows. Keyboard focus is a 3px amber outline offset by 5px.

### Navigation
- **Style:** An absolute editorial rail, a SEROS wordmark, thin electric-aqua structural rule, and uppercase serif links.
- **Mobile:** Keep the brand and the Book-a-call action; the nav drops to its own row below `650px`.

### Review Artifact — Oath Gate
- **Character:** A field log, not a dashboard card.
- **Surface:** Paper white with a singular neutral ambient shadow, compact ruled rows, mono headings, and a slight desktop rotation.
- **States:** Detected uses cobalt; needs-review uses amber; confirmed uses green; the final confirmation stamp remains visibly human.
- **Motion:** The artifact enters once on load. The celestial route resolves toward it with `2.4s cubic-bezier(.2,.8,.2,1)`. Reduced-motion mode renders all motion complete or absent.

### Workflow Records
- **Style:** Long ruled rows with a mono sequence label, uppercase serif title, explanatory detail, and a state marker. They become a two-column, then stacked, reading order at narrow widths.

### Document Surfaces
- **Style:** Vellum background, record-ink type, controlled underlines, quiet tables, and a low-opacity engraving in the frame. Legal copy always outranks decoration.

## Do's and Don'ts

### Do:
- **Do** use the cobalt field, paper records, and white seals as the primary material conversation.
- **Do** make human approval of consequential steps, written advice, and the discovery-call action easy to find without relying on imagery.
- **Do** use the real Seros engraving with enough presence to read as an intentional figure, while preserving copy contrast.
- **Do** let route motion resolve once toward a visible stop, and honor `prefers-reduced-motion`.
- **Do** keep legal and trust pages readable first, using the system in the frame rather than theatrically inside dense copy.

### Don't:
- **Don't** portray agents Seros builds as autonomous or magical, or as acting on consequential steps without a human decision.
- **Don't** use generic SaaS card grids, rounded pills, stock mythology, cartoon iconography, or colored glow shadows.
- **Don't** use amber or the accent pair without their established state or structural meaning.
- **Don't** make mono the default reading voice or hide product proof inside decorative route graphics.
- **Don't** turn legal pages into marketing compositions at the cost of scannability.
