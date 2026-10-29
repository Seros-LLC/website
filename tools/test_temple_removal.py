#!/usr/bin/env python3
"""Regression checks for decorative temple removal."""
import pathlib
import unittest
from tools import build, build_offerings

ROOT = pathlib.Path(__file__).resolve().parent.parent


class TempleRemovalTest(unittest.TestCase):
    def test_pages_and_generators_do_not_contain_temples(self):
        files = list(ROOT.rglob('*.html')) + [ROOT / 'tools/build.py', ROOT / 'tools/build_offerings.py']
        self.assertTrue(files)
        for path in files:
            with self.subTest(path=path.relative_to(ROOT)):
                self.assertNotIn('page-temple', path.read_text())

    def test_homepage_other_ascii_art_remains(self):
        homepage = (ROOT / 'index.html').read_text()
        self.assertIn('data-ascii aria-hidden', homepage)
        self.assertIn('data-ascii-field="wave"', homepage)

    def test_generators_render_without_temples(self):
        legal = build.shell('Privacy', 'Description', '/privacy', '<h1 id="privacy">Privacy</h1><p>Content</p>')
        offerings = build_offerings.render([], {})
        for page in (legal, offerings):
            self.assertNotIn('page-temple', page)
        self.assertIn('<p>Content</p>', legal)
        self.assertIn('ways we can help', offerings)


if __name__ == '__main__':
    unittest.main()
