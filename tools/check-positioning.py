#!/usr/bin/env python3
"""Fail when a studio page still sells the paused Slack product.

Seros, LLC moved from selling one SaaS product to selling solution development
engagements. That decision is easy to undo by accident: a leftover "Create an
account" button or a missing /services page quietly puts the old product back in
front of a buyer. This check pins the decision. It asserts three things:

  1. Every studio page exists.
  2. No studio page carries product sign-up language. /work is allowed to name
     the product because that page is the honest record of what was built.
  3. The sitemap lists the studio pages, so they are discoverable.

Run it next to tools/check-links.py. Both are wired into CI.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

STUDIO_PAGES = ["index.html", "services.html", "work.html", "pricing.html", "contact.html", "packages.html"]

# Sign-up and product-status language has no place on a services site.
BANNED_EVERYWHERE = [
    # Retired headline positioning (2026-09-25: consulting leads, see DECISION-AI-CONSULTING.md).
    "solution development company",
    "we build the software your business is missing",
    "launch app",
    "create an account",
    "early access",
    "app.seros.dev",
    "commitment control",
]

# Product positioning language. /work may describe the product as delivered work.
BANNED_EXCEPT_WORK = [
    "slack commitment",
    "turn slack",
    "linear issue",
]

REQUIRED = {
    "index.html": ["AI and agentic consulting", "/services", "/work", "/pricing", "/contact"],
    "services.html": ["AI strategy and readiness assessment", "Advisory retainer",
                      "Agentic workflow automation", "AI-native custom CRM",
                      "Custom builds and integrations", "Care plan", "/contact"],
    "work.html": ["Slack-to-Linear", "in-house product"],
    "pricing.html": ["$150 per hour", "fixed-fee", "Readiness assessment", "Advisory retainer", "/contact"],
    "contact.html": ["mailto:team@seros.dev"],
    "packages.html": ["AI strategy and readiness assessment", "Advisory retainer",
                      "Agentic workflow automation", "AI-native custom CRM",
                      "Custom builds and integrations", "Care plan", "$150 per hour",
                      "discovery call", "/contact"],
}

SITEMAP_URLS = [
    "https://seros.dev/",
    "https://seros.dev/services",
    "https://seros.dev/work",
    "https://seros.dev/pricing",
    "https://seros.dev/contact",
    "https://seros.dev/packages",
]


def main():
    failures = []

    for name in STUDIO_PAGES + ["404.html"]:
        page = ROOT / name
        if not page.exists():
            failures.append(f"{name}: page is missing")
            continue
        text = page.read_text(encoding="utf8")
        lowered = text.lower()
        for phrase in BANNED_EVERYWHERE:
            if phrase in lowered:
                failures.append(f"{name}: still contains product phrase {phrase!r}")
        if name != "work.html":
            for phrase in BANNED_EXCEPT_WORK:
                if phrase in lowered:
                    failures.append(f"{name}: still contains product phrase {phrase!r}")
        for marker in REQUIRED.get(name, []):
            if marker not in text:
                failures.append(f"{name}: missing required text {marker!r}")

    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf8")
    for url in SITEMAP_URLS:
        if f"<loc>{url}</loc>" not in sitemap:
            failures.append(f"sitemap.xml: missing {url}")

    for failure in failures:
        print(f"FAIL {failure}")
    print(f"positioning check: {len(failures)} failure(s)")
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
