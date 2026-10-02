#!/usr/bin/env python3
"""Render the Markdown legal pack in ../legal into themed HTML pages.

Usage:  python3 tools/build.py            # render every mapped document
        python3 tools/build.py --check    # render nothing, report unresolved placeholders

Placeholders written as [[TOKEN]] in the Markdown are substituted from site.json.
If site.json says draft=true, every generated page carries a visible draft banner.
The build FAILS if a placeholder has no value and draft mode is off, so an
unreviewed document can never be published silently.
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent      # .../seros/website
LEGAL = ROOT.parent / "legal"
CFG = json.loads((ROOT / "site.json").read_text())
DRAFT = bool(CFG.get("draft", True))

# markdown source -> output html file, page title, meta description
PAGES = [
    ("PRIVACY-POLICY.md",           "privacy.html",        "Privacy Policy",
     "How Seros, LLC collects, uses, shares, and protects personal data."),
    ("TERMS-OF-SERVICE.md",         "terms.html",          "Terms of Service",
     "The baseline agreement between Seros, LLC and its clients. Engagements are governed by a signed statement of work."),
    ("ACCEPTABLE-USE-POLICY.md",    "acceptable-use.html", "Acceptable Use Policy",
     "What you may and may not do with the Seros website and with systems Seros, LLC builds or hosts."),
    ("DPA.md",                      "dpa.html",            "Data Processing Addendum",
     "Seros, LLC data processing addendum for customers subject to GDPR, UK GDPR, or US state privacy laws."),
    ("SUBPROCESSORS.md",            "subprocessors.html",  "Subprocessors",
     "The third parties that process personal data on behalf of Seros, LLC, and how changes are announced."),
    ("COOKIE-POLICY.md",            "cookies.html",        "Cookie Policy",
     "Cookies and similar technologies used by Seros, LLC."),
    ("SECURITY.md",                 "security.html",       "Security",
     "How Seros, LLC protects client data and builds securely, and how to report a vulnerability."),
    ("REFUND-AND-BILLING-POLICY.md","billing.html",        "Billing and Payment",
     "How Seros, LLC quotes, invoices and is paid for consulting and build engagements."),
    ("AI-DISCLOSURE.md",            "ai.html",             "How Seros uses AI",
     "Plain-language explanation of how Seros, LLC uses AI models in its work and in what it builds."),
]

# Legal Markdown is the source of truth, but the source files are not deployed.
# Keep links between published legal pages pointing at the generated HTML files.
# This is intentionally limited to documents in PAGES: links to internal legal
# work product must not accidentally become public routes.
# Links use the clean, canonical route (/privacy), not the file name: Vercel's
# cleanUrls 308-redirects every *.html request, and canonical tags omit the suffix.
PUBLISHED_LINKS = {src: "/" + out.removesuffix(".html") for src, out, _title, _desc in PAGES}

NAV = [("Services", "/services"), ("Work", "/work"), ("Engagements", "/pricing"),
       ("Security", "/security")]

TOKEN = re.compile(r"\[\[([A-Z0-9_]+)\]\]")


def substitute(text):
    missing = set()

    def repl(m):
        key = m.group(1)
        val = CFG.get(key)
        if val in (None, "", "TBD", "TBD — fill before publishing"):
            missing.add(key)
            return f'<span class="todo">[{key}]</span>' if not DRAFT else f"[[{key}]]"
        return str(val)

    return TOKEN.sub(repl, text), missing


PAGE_TITLES = {src: title for src, _out, title, _desc in PAGES}


def rewrite_published_links(text):
    """Map links to published Markdown sources onto their deployed HTML pages.

    A link whose visible text is the source file name (``[SUBPROCESSORS.md](...)``)
    gets the page title instead, so readers never see repository file names.
    """
    for source, title in PAGE_TITLES.items():
        text = re.sub(rf"\[`?{re.escape(source)}`?\]\(", f"[{title}](", text, flags=re.IGNORECASE)
    for source, output in PUBLISHED_LINKS.items():
        text = re.sub(
            rf"(\]\()({re.escape(source)})(?=[)#\s])",
            rf"\g<1>{output}",
            text,
            flags=re.IGNORECASE,
        )
    return text


def shell(title, desc, canonical, body):
    nav = "\n        ".join(f'<a href="{h}">{t}</a>' for t, h in NAV)
    # The studio sells engagements, not seats: the primary action is an enquiry,
    # and it stays on this origin so no cross-host flow is implied.
    nav += '\n        <a class="btn-nav-app" href="/contact">Book a call &rarr;</a>'
    banner = ""
    if DRAFT:
        banner = ('<p class="banner"><strong>Draft.</strong> This document has not yet been '
                  'reviewed by counsel and is not in force. It is published here for review only. '
                  'Bracketed tokens mark facts that still have to be filled in.</p>')
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} — Seros, LLC</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{CFG['WEBSITE_URL']}{canonical}">
<meta name="robots" content="{'noindex' if DRAFT else 'index,follow'}">
<meta property="og:title" content="{title} — Seros, LLC">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{CFG['WEBSITE_URL']}/assets/og-card-2026-09.jpg">
<link rel="icon" href="/assets/icon-192.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#030620">
<link rel="stylesheet" href="/assets/styles.css?v=9">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site">
  <div class="wrap rail-header">
    <a class="brand" href="/"><img src="/assets/icon-192.png" alt=""><span>SEROS</span><small>AI consulting</small></a>
    <nav class="site" aria-label="Primary navigation">
        {nav}
    </nav>
  </div>
</header>
<main class="wrap doc" id="main">
{banner}
{body}
</main>
<footer class="site">
  <div class="wrap">
    <p class="fineprint">&copy; 2026 Seros, LLC &middot;
      <a href="/privacy">Privacy</a> &middot; <a href="/terms">Terms</a> &middot;
      <a href="/acceptable-use">Acceptable use</a> &middot; <a href="/dpa">DPA</a> &middot;
      <a href="/subprocessors">Subprocessors</a> &middot; <a href="/security">Security</a><br>
      Nothing on this site is legal, tax, or professional advice.</p>
  </div>
</footer>
</body>
</html>
"""


def main():
    check_only = "--check" in sys.argv
    try:
        import markdown
    except ImportError:
        sys.exit("markdown package required: pip install markdown")

    all_missing, built = {}, []
    for src, out, title, desc in PAGES:
        p = LEGAL / src
        if not p.exists():
            print(f"skip (missing source): {src}")
            continue
        raw = p.read_text()
        # Drop the source file's own DRAFT blockquote: the rendered page states its
        # status in the banner instead, and the blockquote mentions [[DOUBLE_BRACKETS]]
        # literally, which is documentation rather than a real placeholder.
        lines = raw.splitlines()
        while lines and (lines[0].startswith(">") or not lines[0].strip()):
            lines.pop(0)
        text, missing = substitute("\n".join(lines) + "\n")
        text = rewrite_published_links(text)
        if missing:
            all_missing[src] = sorted(missing)
        html = markdown.markdown(text, extensions=["tables", "toc", "sane_lists", "attr_list"])
        # A page keeps exactly one <h1>. Sources with further top-level headings (the DPA's
        # Annexes) are nested one level down from that point on, so the outline stays
        # valid without editing counsel-reviewed text.
        second = html.find("<h1", html.find("<h1") + 1)
        if second != -1:
            head, tail = html[:second], html[second:]
            for n in range(5, 0, -1):
                tail = tail.replace(f"<h{n}", f"<h{n + 1}").replace(f"</h{n}>", f"</h{n + 1}>")
            html = head + tail
        # Wide tables scroll inside their own focusable region on phones.
        html = html.replace("<table>", '<div class="table-scroll" role="region" aria-label="Scrollable table" tabindex="0"><table>')
        html = html.replace("</table>", "</table></div>")
        if not check_only:
            (ROOT / out).write_text(shell(title, desc, "/" + out.removesuffix(".html"), html))
        built.append(out)

    print(("checked: " if check_only else "built: ") + ", ".join(built))
    if all_missing:
        print("\nunresolved placeholders (fill these in site.json):")
        for src, keys in all_missing.items():
            print(f"  {src}: {', '.join(keys)}")
        if not DRAFT:
            sys.exit("refusing to publish with unresolved placeholders while draft=false")


if __name__ == "__main__":
    main()
