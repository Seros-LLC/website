# seros.dev — marketing site

Static HTML for Seros, LLC, an AI and agentic consulting firm. There is no framework and
no build step for the marketing pages. The legal pages are generated from the private
`legal` repository, so each policy has one source of truth.

## Layout

| Path | What it is |
|---|---|
| `index.html`, `services.html`, `pricing.html`, `work.html`, `contact.html` | Hand-written marketing pages |
| `assets/styles.css` | The whole design system: tokens, type, components. The canonical palette |
| `assets/site-tools.js` | Local approval demonstration and workflow-fit helper, no network or storage |
| `assets/seros-hero.png` | Discobolus engraving, ink on transparent, from the brand art |
| `assets/og-card-2026-09.jpg` | 1200x630 social card. Rename it on change, because assets are cached as immutable |
| `site.json` | Company facts used to fill `[[PLACEHOLDER]]` tokens in the legal pages |
| `tools/build.py` | Renders `../legal/*.md` into themed HTML pages |
| `privacy.html`, `terms.html`, … | **Generated. Do not edit by hand.** |
| `DESIGN.md`, `PRODUCT.md`, `.impeccable/` | Design-agent context. Not deployed (see `.vercelignore`) |

## Build and check

```bash
python3 tools/build.py              # render the legal pages (needs ../legal and `pip install markdown`)
python3 tools/build.py --check      # report unresolved placeholders, write nothing
python3 tools/check-links.py        # every href/src resolves; legacy app paths redirect to /work
python3 tools/check-positioning.py  # current positioning on the studio pages
node --test tools/test_package_builder.mjs tools/test_site_tools.mjs
```

For visual and browser regression checks, start `python3 tools/preview.py 8081`.
With an existing Playwright installation and Chromium binary, run:

```bash
PREVIEW_URL=http://127.0.0.1:8081 \
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
CHROME_PATH=/path/to/chrome \
node tools/test_browser.mjs
```

Optional `AXE_PATH=/path/to/axe.min.js` adds automated accessibility checks at phone
and desktop widths. `SCREENSHOT_DIR=/path/to/screenshots` saves full-page captures.
The browser suite covers all 16 HTML routes at four viewport sizes and exercises
keyboard access, approve/hold/restart, package selection, reduced motion and the
no-JavaScript fallback. It does not install browser dependencies automatically.

`tools/compare_browser.mjs` uses the same environment variables to compare the
pre-overhaul commit with the current preview. Measured results and tradeoffs are
recorded in `docs/verification-2026-10-27.md`. Accessibility and keyboard-task
improvements are verified, not conversion or visitor preference.

CI runs the renderer, links, positioning and unit checks on every push. Browser
checks are an additional local gate. CI also fails on stale generated pages, missing
`<title>`/viewport/description tags, and committed secrets.

`site.json` has `"draft": false`, because counsel has reviewed the published pack. With
draft off, the build refuses to run while any placeholder in a published page is unfilled.
Templates write `[[GA_COUNTY]] County, Georgia`, so `GA_COUNTY` holds only the county
name (`Murray`).

Bump `styles.css?v=N` in every HTML file **and** in `tools/build.py` together. Otherwise
the stale-generated-pages check fails.

## Design system

`assets/styles.css` (`:root`) is the source of truth, and `DESIGN.md` describes the
intent. In short: deep navy framing (`--seros-night #030620`), cobalt actions
(`--seros-blue #142c9e`), and warm paper (`#f8f7f3`) for reading. Headings use self-hosted
Source Serif 4, body text uses a system sans-serif, and labels use Courier New.
The only imagery is the real Seros engraving. No stock photography, invented client
proof or looping decorative animation. The header stays in document flow and keeps
every navigation route available on small screens.

## Deploy

A push to `main` auto-deploys to https://seros.dev, which is Vercel project `seros-website`.
`vercel.json` sets the security headers, asset caching and the legacy-path redirects.
`.vercelignore` keeps repository internals (`*.md`, `tools/`, `site.json`, `.impeccable/`)
off the public site.

If a deploy has to be run by hand:

```bash
npx vercel link --yes --project seros-website
npx vercel --prod --yes
```

Afterwards, check the live page: `curl -sS -o /dev/null -w '%{http_code}' https://seros.dev/`.
