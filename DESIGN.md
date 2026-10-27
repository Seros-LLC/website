---
name: Seros Practical Intelligence
description: An independent consulting studio. Written advice, useful systems, human control.
colors:
  night: "#030620"
  blue-deep: "#080e38"
  blue: "#142c9e"
  ink: "#151b35"
  vellum: "#f1f0eb"
  paper: "#f8f7f3"
  ice: "#dce3fa"
  prism: "#afc1ff"
  muted: "#565c6c"
  on-dark-muted: "#bdc7e0"
  focus-dark: "#ffd166"
  focus-light: "#142c9e"
typography:
  display: "Source Serif 4, Georgia, serif (600)"
  body: "Arial, Helvetica, sans-serif"
  label: "Courier New, Courier, monospace"
---

# Seros / Practical Intelligence

## Intent

Seros is an AI and agentic consulting firm, not a SaaS sign-up page. The site should help a business owner understand the offer, inspect the approach and start a free discovery conversation by email. Read `PRODUCT.md` before changing claims.

The October 2026 overhaul replaces the accumulated Oath Gate/glass effects with a restrained editorial system. The existing cobalt identity and actual Seros engraving remain. The visual direction is a builder's decision made under the user's instruction to take the lead.

## Visual language

- Deep navy framing, cobalt action surfaces and warm paper reading sections.
- Left-aligned serif headlines contrasted with practical sans-serif body copy.
- Small monospace section numbers and record labels, never dashboard ornament.
- Fine rules and square-to-subtly-rounded surfaces. No glass blur, ambient loops, floating cards or decorative star icons.
- The real engraving is the only illustrative image. A framed grid and static orbital rules give it context without covering the copy.
- No stock imagery, invented customer logos, fabricated metrics or testimonials.

`assets/styles.css` is the token source of truth. Supporting aliases remain for the package builder. Do not reintroduce cascades of historical overrides.

## Layout and hierarchy

- Main frame: 1320px maximum. Document frame: 1120px maximum. Fluid gutters.
- Desktop hero: promise on the left, engraving on the right. Narrow screens place the copy and action before the illustration.
- Homepage sequence: offer, service paths, human approval demonstration, engagement process, engineering evidence, discovery invitation.
- Service paths map to real anchors on `/services`: `#strategy`, `#automation`, `#care`.
- Documents use measured prose, clear section headings, ruled service entries and scrollable tables.
- Header stays in normal document flow. All five navigation links remain visible at every width. No JavaScript-dependent mobile menu.

## Type and interaction

- Self-hosted Source Serif 4, 600, with `font-display: swap` for headings. No external font requests.
- Body line-height 1.65. Use 16px or larger for main mobile prose. Supporting metadata may be smaller, but remains high contrast.
- Semantic links for navigation and native buttons for state changes.
- One primary action per local context. The email CTA opens the visitor's mail client, it does not submit or schedule anything automatically.
- Motion is limited to short hover color changes. Respect reduced motion including smooth scrolling.
- Focus is cobalt on paper and amber on dark surfaces. Never remove outlines.

## Demonstration

The homepage model is explicitly illustrative. It makes no network requests and stores nothing. Visitors send a draft to review, then approve or hold, then restart. Current stage is exposed through `aria-current`; changes are announced by the record's polite live region. Focus moves to the next available control before a hidden control can strand the visitor.

The package builder remains a local email-draft helper. No lead form, CRM submission or new analytics was introduced.

## Trust and generated documents

Legal Markdown in `../legal` remains authoritative. Do not edit generated policies manually. Use `tools/build.py` to regenerate after changing the stylesheet cache pin in its template. Regeneration can expose pre-existing source/output drift, so inspect the resulting diff rather than assuming it contains only style links.

No new certifications, security guarantees, client outcomes or product availability claims are permitted. The in-house application is paused and appears only as engineering evidence on `/work`.

## Validation

Run:

```sh
python3 tools/build.py --check
python3 tools/build.py
python3 tools/check-links.py
python3 tools/check-positioning.py
node --test tools/test_package_builder.mjs tools/test_site_tools.mjs
```

`tools/test_browser.mjs` accepts an existing Playwright installation and Chromium executable. It checks all HTML routes at 375x812, 812x375, 768x1024 and 1440x1000, navigation hit areas, horizontal overflow, the approval state machine, keyboard skip link, package summary, no-JavaScript fallback and reduced motion. Optional `AXE_PATH` runs axe on every route at phone and desktop widths. These automated checks support, but do not certify, WCAG conformance.

Keep deployment separate from local verification. Pushing `main` publishes the site.
