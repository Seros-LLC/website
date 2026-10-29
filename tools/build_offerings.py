#!/usr/bin/env python3
"""Generate offerings.html from the internal offer catalog.

Only public-safe fields are published: ID, category, offer name, engagement type.
Internal prices, scores, risk notes and market sources are deliberately excluded,
because the catalog prices assume a rate that has not been adopted. Public pricing
stays on /pricing ($150/h, fixed fees quoted after discovery).

Usage: python3 tools/build_offerings.py [path/to/offers.csv]
"""
import csv
import html
import re
import sys
from collections import OrderedDict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CSV = ROOT.parent / 'business/strategy/offer-catalog-2026-10/offers.csv'
UNIT = {
    'fixed fee': 'Fixed-scope project',
    'per month': 'Monthly engagement',
    'per customer / month': 'Subscription product',
    'one-time purchase': 'One-time product',
}
CATEGORY_ORDER = [
    'AI strategy and advisory', 'Agentic operations automation', 'Integrations and data',
    'Documents and knowledge (RAG)', 'Custom CRM and internal tools', 'Customer support AI',
    'Sales and marketing automation', 'Finance and accounting automation', 'HR and recruiting',
    'Web, portals and MVPs', 'AI engineering and ops services', 'Managed services and retainers',
    'Training and digital products', 'Micro-SaaS products',
    'Vertical: healthcare and dental', 'Vertical: legal and accounting firms',
    'Vertical: home services and trades', 'Vertical: real estate and property',
    'Vertical: e-commerce and retail', 'Vertical: hospitality and fitness',
]


def slug(text):
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')


def load(path):
    rows = list(csv.DictReader(open(path, newline='', encoding='utf-8')))
    groups = OrderedDict((c, []) for c in CATEGORY_ORDER)
    for r in rows:
        groups.setdefault(r['Category'], []).append(r)
    for items in groups.values():
        items.sort(key=lambda r: r['Offer'].lower())
    return rows, groups


def render(rows, groups):
    e = html.escape
    filters = ''.join(
        f'<option value="{e(slug(c))}">{e(c)} ({len(items)})</option>' for c, items in groups.items() if items)
    sections = []
    for cat, items in groups.items():
        if not items:
            continue
        lis = ''.join(
            f'<li class="offer" data-offer data-unit="{e(slug(UNIT.get(r["Price unit"], r["Price unit"])))}">'
            f'<span class="offer-id">{e(r["ID"])}</span><span class="offer-name">{e(r["Offer"])}</span>'
            f'<span class="offer-unit">{e(UNIT.get(r["Price unit"], r["Price unit"]))}</span></li>'
            for r in items)
        sections.append(
            f'<section class="offer-group" data-group="{e(slug(cat))}" aria-labelledby="g-{e(slug(cat))}">'
            f'<h2 id="g-{e(slug(cat))}">{e(cat)} <span class="offer-count" data-group-count>{len(items)}</span></h2>'
            f'<ul class="offer-list">{lis}</ul></section>')
    return TEMPLATE.format(total=len(rows), filters=filters, sections='\n'.join(sections))


TEMPLATE = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offerings — Seros, LLC</title>
<meta name="description" content="The full Seros catalog: {total} AI consulting services, automations, integrations, vertical solutions and products. Search and filter by area.">
<link rel="canonical" href="https://seros.dev/offerings">
<meta property="og:title" content="Offerings — Seros, LLC">
<meta property="og:description" content="{total} services and products, from advisory to agentic automation.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://seros.dev/offerings">
<meta property="og:image" content="https://seros.dev/assets/og-card-2026-09.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/icon-192.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#1b3b6f">
<link rel="stylesheet" href="/assets/styles.css?v=18">
<script src="/assets/offerings.js?v=2" defer></script>
<script src="/assets/roman-interact.js?v=3" defer></script>
</head>
<body class="marketing-page">
<a class="skip" href="#main">Skip to content</a>
<header class="site">
  <div class="wrap rail-header">
    <a class="brand" href="/"><img src="/assets/icon-192.png" alt="" width="32" height="32"><span>SEROS</span><small>AI consulting</small></a>
    <nav class="site" aria-label="Primary navigation">
      <a href="/services">Services</a>
      <a href="/work">Work</a>
      <a href="/pricing">Engagements</a>
      <a href="/security">Security</a>
      <a class="btn-nav-app" href="/contact">Book a call <span aria-hidden="true">&rarr;</span></a>
    </nav>
  </div>
</header>
<main class="offerings" id="main">
<section class="page-hero" aria-labelledby="page-title">
  <div class="wrap page-hero-grid">
    <div class="page-hero-copy">
    <p class="page-kicker">Offerings / The full catalog</p>
    <h1 id="page-title">{total} ways we can help.</h1>
  <p class="lede">Explore 300 potential services, workflows and product concepts, grouped by area. Availability, feasibility and scope are confirmed in a conversation. Product concepts are not necessarily available off the shelf. Professional services are $150 per hour, and fixed-fee builds are quoted after a free discovery call. See <a href="/pricing">engagements</a> for how pricing works.</p>
    </div>
  </div>
</section>
<div class="wrap doc doc-body">
  <div class="offer-controls" role="search" hidden data-offer-controls>
    <div class="tool-field"><label for="offer-search">Search offerings</label><input id="offer-search" type="search" autocomplete="off" placeholder="Try: invoices, intake, dental, CRM"></div>
    <div class="tool-field"><label for="offer-area">Area</label><select id="offer-area"><option value="">All areas</option>{filters}</select></div>
    <div class="tool-field"><label for="offer-type">Engagement type</label><select id="offer-type"><option value="">All types</option><option value="fixed-scope-project">Fixed-scope project</option><option value="monthly-engagement">Monthly engagement</option><option value="subscription-product">Subscription product</option><option value="one-time-product">One-time product</option></select></div>
    <button class="btn primary" type="button" data-offer-clear>Clear filters</button>
  </div>
  <p class="offer-status" aria-live="polite" data-offer-status>Showing all {total} offerings.</p>
  {sections}
  <p class="offer-empty" hidden data-offer-empty>No offerings match. Try a broader word, or <a href="/contact">describe the problem</a> and we will tell you plainly whether we can help.</p>
  <aside class="tool-invitation"><span class="inscription" aria-hidden="true">[ CCC ]</span><div><h2>Not sure which one fits?</h2><p>Most engagements start with one process and one clear outcome. Tell us what is taking too much work and we will point you to the right starting place.</p></div><a class="btn primary" href="/contact">Book a free discovery call <span aria-hidden="true">&nearr;</span></a></aside>
</div>
</main>
<footer class="site"><div class="wrap footer-grid">
  <div><a class="brand foot-brand" href="/"><img src="/assets/icon-192.png" alt="" width="32" height="32"><span>SEROS</span></a><p class="foot-blurb">AI and agentic consulting for businesses.</p></div>
  <div><p class="footer-label">Company</p><a href="/services">Services</a><a href="/offerings">All offerings</a><a href="/work">Work</a><a href="/pricing">Engagements</a><a href="/packages">Build a package</a><a href="/toolkit">Business toolkit</a><a href="/contact">Contact</a></div>
  <div><p class="footer-label">Trust</p><a href="/security">Security</a><a href="/privacy">Privacy</a><a href="/subprocessors">Subprocessors</a></div>
  <div><p class="footer-label">Legal</p><a href="/terms">Terms</a><a href="/dpa">DPA</a><a href="/cookies">Cookies</a></div>
</div><div class="wrap fineprint">&copy; 2026 Seros, LLC. Nothing on this site is legal, tax, or professional advice.</div></footer>
</body>
</html>
'''

if __name__ == '__main__':
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CSV
    rows, groups = load(src)
    assert len(rows) == 300, f'expected 300 offers, got {len(rows)}'
    (ROOT / 'offerings.html').write_text(render(rows, groups), encoding='utf-8')
    print(f'wrote offerings.html with {len(rows)} offers in {sum(1 for g in groups.values() if g)} areas')
