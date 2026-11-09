# seros.dev — Marketing & Legal Site Source

[![Live Site](https://img.shields.io/badge/Live_Site-seros.dev-132a50?style=for-the-badge&labelColor=1b3b6f&color=c9a646)](https://seros.dev)
[![Architecture](https://img.shields.io/badge/Architecture-Frameworkless_HTML%2FCSS-132a50?style=for-the-badge&labelColor=1b3b6f&color=5e7f96)](https://seros.dev)
[![Legal Pipeline](https://img.shields.io/badge/Legal_Pipeline-Python_Rendered-132a50?style=for-the-badge&labelColor=1b3b6f&color=2f6b45)](https://seros.dev)

Static HTML source for [seros.dev](https://seros.dev), the public web presence for Seros, LLC (AI and agentic consulting). There is no framework, no runtime bundle, and no client-side build step for the marketing pages. The legal documentation pages are generated directly from Markdown sources in the private `legal` repository to maintain a single authoritative source of truth.
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

`tools/test_secondary_browser.mjs` uses the same browser environment variables for
166 focused checks on services, engagements, work and contact, including 320px
layouts, 200% root text scaling, buyer journeys and product-guidance preservation.

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

## Contact enquiry form

`contact.html` preserves the email option and adds a real, same-origin form.
`api/contact.mjs` is a dependency-free Vercel Node function with the documented
Web Standard `default { fetch(request) }` export; deploy from this website root,
not the parent repository. No package.json or marketing-page build is required.
Static-only previews cannot run the function.

Set `SEROS_WEBSITE_INGEST_SECRET` (random, at least 32 characters) in the website
Vercel project's server environment. The **same** scoped secret must be configured
on SerosOS and its Google-auth gateway. Never put it in HTML or assets. Optional
`SEROS_WEBSITE_INGEST_URL` defaults to
`https://os.seros.dev/api/webhooks/seros-website`; only HTTPS and that exact path
are accepted. See `.env.example`. The OS also needs its existing
`SEROS_CRM_DATABASE_URL`. Keep every other OS route authenticated; only the exact
POST webhook may bypass login, and only after checking the scoped secret.

Only `https://seros.dev` and `https://www.seros.dev` browser Origins are accepted.
The serverless endpoint validates and size-limits the JSON, checks a honeypot,
rate-limits attempts, strips browser credentials and forwards the approved Origin
and a server-generated client hash. No CAPTCHA provider is needed. The existing
CSP permits same-origin submission; no CORS or external browser connection is added.

The OS durably stores the enquiry in its `/enquiries` inbox (linked from Clients)
and transactionally creates/links a CRM contact plus an inbound activity. Browser
retries reuse a submission UUID; changed content with the same ID is rejected.
If CRM is unavailable, the accepted inbox entry remains visibly pending and can
be retried by a confirmed operator action. No automatic replies or marketing
subscriptions occur, and existing CRM contacts are not changed. Full deployment,
limits, recovery and privacy/retention notes are in FounderOS
`docs/WEBSITE-ENQUIRIES.md`.

Contact-only checks never submit real data:

```sh
node --test tools/test_contact.mjs tools/test_contact_form.mjs
```

They include a loopback HTTP harness for the real exported handler and a retry
behavior fixture, but do not replace a hosted Vercel adapter or browser rendering
check. The website and OS are not deployed by these checks.

# Roman ASCII local iteration

The FORVM direction keeps the existing layout and introduces marble, olive and bronze styling with a local ASCII engraving. Open `/` for the visual system and `/toolkit` for optional business planning helpers. Nothing is deployed automatically by editing locally. The existing preview is `http://localhost:8081`.

Design scope: `docs/roman-ascii-design.md`. Motion has an explicit pause control, reduced-motion support and an original-image fallback. Tool entries are not sent to a server or written to persistent storage.

Additional checks, using the same `PLAYWRIGHT_MODULE`, `CHROME_PATH` and `PREVIEW_URL` environment variables as the existing browser tests:

```bash
node --test tools/test_business_tools.mjs
node tools/test_roman_browser.mjs
node tools/test_toolkit_browser.mjs
```

### Mobile accessibility suite

`tools/test_mobile_browser.mjs` loads every route at 320x640, 375x812, 390x844,
412x915 and landscape 812x375 with touch emulation, plus 200% text at 375px. It
fails on horizontal overflow, touch targets under 44x44 (24px floor at 200% text),
form controls under 16px (iOS focus zoom), text under 12px, ASCII `pre` blocks
exposed to screen readers, a header taking more than 28% of the first screen,
axe WCAG 2.2 AA violations (when `AXE_PATH` is set), offerings filters that
are sticky or unusable by touch, motion under `prefers-reduced-motion`, and
primary navigation that is not reachable by keyboard and tap.

```bash
python3 tools/preview.py 8081 &
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
CHROME_PATH=~/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome \
AXE_PATH=/path/to/axe-core/axe.min.js \
node tools/test_mobile_browser.mjs
```

When changing `assets/styles.css`, bump `styles.css?v=` in every HTML page,
`tools/build.py`, `tools/build_offerings.py` and the pinned version in
`tools/test_business_tools.mjs` and `tools/test_package_builder.mjs`.

### Visual polish review — 2026-11-09

The before/after visual polish was approved for release. Review fixes preserve
form-focus outlines in forced colors and suppress button and package-option
hover/press movement with reduced motion, without changing the normal styling.
Verified in Chromium: focused package/toolkit fields retain a 3px outline with
forced colors, and package, navigation, primary, demo and toolkit controls do not
move on hover with reduced motion. Earlier local checks passed (build, links,
positioning, 34 Node tests; browser suites: 72 main, 1057 mobile, 158 secondary).
