# seros.dev — marketing site

Static HTML for Seros, LLC, an AI and agentic consulting firm. There is no framework and
no build step for the marketing pages. The legal pages are generated from the private
`legal` repository, so each policy has one source of truth.

## Layout

| Path | What it is |
|---|---|
| `index.html`, `services.html`, `pricing.html`, `work.html`, `contact.html` | Hand-written marketing pages |
| `assets/styles.css` | The whole design system: tokens, type, components. The canonical palette |
| `assets/studio-motion.js` | Scroll and entrance motion (respects `prefers-reduced-motion`) |
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
```

CI runs all of these on every push. It also fails on stale generated pages, missing
`<title>`/viewport/description tags, and committed secrets.

`site.json` has `"draft": false`, because counsel has reviewed the published pack. With
draft off, the build refuses to run while any placeholder in a published page is unfilled.
Templates write `[[GA_COUNTY]] County, Georgia`, so `GA_COUNTY` holds only the county
name (`Murray`).

Bump `styles.css?v=N` in every HTML file **and** in `tools/build.py` together. Otherwise
the stale-generated-pages check fails.

## Design system

`assets/styles.css` (`:root`) is the source of truth, and `DESIGN.md` describes the
intent. In short: a deep cobalt field (`--seros-blue #0b155d`, `--seros-night #030620`),
white as the accent on dark surfaces, `--seros-ink-accent #1230b8` as the accent on light
surfaces, and paper (`#eef0ff`) for document pages. Headings and body are Georgia; labels
and record metadata are Courier New. The only imagery is the real Seros engraving. No
stock photography and no emoji.

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
