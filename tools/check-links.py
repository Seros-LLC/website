#!/usr/bin/env python3
"""Fail when an HTML reference cannot be resolved locally or as an approved app link.

The marketing site owns static pages. The Slack-to-tracker application is paused
(its host returns DEPLOYMENT_PAUSED), so no page may link to it, and old bookmarks to
its former ``seros.dev`` paths redirect to ``/work``, which explains the paused
product, instead of to a dead host. Redirects are never transparent rewrites.

An internal link must resolve to a site page. A link to the paused app host is a
failure. Every legacy redirect must land on a page that exists on this site.
"""
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent


class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.values = []

    def handle_starttag(self, _tag, attrs):
        for name, value in attrs:
            if name in ("href", "src") and value:
                self.values.append(value)


PAUSED_APP_HOST = "app.seros.dev"
LEGACY_DESTINATION = "/work"


def route_matchers(config):
    """Compile legacy redirect sources; /connect/(.*) covers callback paths too."""
    matchers = []
    for rule in config.get("redirects", []):
        source = rule.get("source", "")
        destination = rule.get("destination", "")
        if source and destination:
            matchers.append((source, destination, re.compile("^" + source + "$")))
    return matchers


def is_paused_app_link(reference):
    return urlparse(reference).netloc == PAUSED_APP_HOST


def main():
    failures = []
    checked = 0

    config = json.loads((ROOT / "vercel.json").read_text(encoding="utf8"))
    if config.get("rewrites"):
        failures.append("vercel.json: app paths must redirect, not transparently rewrite")
    matchers = route_matchers(config)

    demo_routes = [r for r in config.get("redirects", []) if r.get("source") == "/demo"]
    if demo_routes:
        failures.append("vercel.json: obsolete /demo redirect is configured")

    used_redirects = set()

    for page in sorted(ROOT.glob("*.html")):
        parser = References()
        parser.feed(page.read_text(encoding="utf8"))
        for reference in parser.values:
            parsed = urlparse(reference)
            if reference.startswith(("#", "data:")):
                continue
            if is_paused_app_link(reference):
                checked += 1
                failures.append(f"{page.name}: {reference} links to the paused app host")
                continue
            if parsed.scheme:
                continue
            path = parsed.path
            if not path:
                continue
            checked += 1

            if path.startswith("/"):
                # An absolute internal link belongs to the static marketing site.
                target = ROOT / path.lstrip("/")
                if target.exists() or target.with_suffix(".html").exists():
                    continue
                failures.append(f"{page.name}: {reference} is not a site page")
                continue

            target = (page.parent / path).resolve()
            if not target.exists():
                failures.append(f"{page.name}: {reference}")

    # Old bookmarks may still use the paused app's seros.dev routes. Send them to the
    # page that explains the paused product, never to the paused host.
    work_page = ROOT / (LEGACY_DESTINATION.lstrip("/") + ".html")
    if matchers and not work_page.exists():
        failures.append(f"{LEGACY_DESTINATION} does not exist but legacy redirects target it")
    for source, destination, _rx in matchers:
        if destination != LEGACY_DESTINATION:
            failures.append(f"vercel.json: {source} must redirect to {LEGACY_DESTINATION}, got {destination}")

    print(f"checked {checked} HTML href/src references")
    if matchers:
        print(f"legacy app paths redirect to {LEGACY_DESTINATION}: "
              + ", ".join(src for src, _dest, _rx in matchers))
    if failures:
        print("BROKEN REFERENCES:")
        for failure in failures:
            print(f"  {failure}")
        raise SystemExit(1)
    print("every reference resolves to a site page")


if __name__ == "__main__":
    main()
