# Website overhaul: observed acceptance results

Date: October 27, 2026. Redesign implementation: `10685e9`.
Baseline: `0272ca2f21b63d48be0ba75b696b16fa0b1c3193`.

## Method

`tools/compare_browser.mjs` serves original committed assets through Playwright request interception, then runs the same homepage checks against the local redesigned site. Both use real Chromium with the same three viewports, the same axe rules and the same keyboard sequence. It does not substitute a copied component or a mocked state machine for the actual pages.

Reproduce with an existing browser/tool installation:

```sh
PREVIEW_URL=http://127.0.0.1:8081 \
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
CHROME_PATH=/path/to/chrome \
AXE_PATH=/path/to/axe.min.js \
node tools/compare_browser.mjs
```

## Better, with measured evidence

| Requirement | Original observation | Redesign observation |
|---|---|---|
| Operable human-review demonstration | At all three sizes, focus was lost when the review button hid. The sequence focus initial button, Enter, Enter did not approve. | At all three sizes, focus reached the approval control and the same keyboard sequence completed approval. The browser suite also completed hold and restart. |
| Usable footer links | axe reported `target-size` failures affecting 11 footer links at both 1366x768 and 1440x1000. | No axe violations for the tested A/AA rule tags at either desktop size or 375x812. |
| Less decorative processing | 8 running animations on mobile and 11 on desktop at the measurement point. | 0 running animations at all three sizes. This is an animation-count observation, not a measured CPU or battery improvement. |
| Simpler, smaller shared styling | 52,163 bytes of shared CSS. | 21,839 bytes, 58.1% smaller before compression. This is not a claim of faster real-world loading. |
| Keep the primary action available immediately | Hero CTA fully visible at all three sizes. | Still fully visible at all three sizes. At 1366x768, its bottom is at 710px. |
| Avoid horizontal page clipping | No horizontal overflow in these three homepage checks. | Still none. Separate all-route suite verified 64 page/viewport combinations. |

## Tradeoff observed

The new primary CTA sits lower on the page, not higher. Its bottom changed from approximately 548px to 630px at 375x812, 545px to 710px at 1366x768, and 698px to 738px at 1440x1000. It remains within the first viewport in all three cases. The design spends more space on the proposition and separates the engraving from the text. Do not claim improved CTA prominence or conversion from this test.

## Full-site acceptance gate

- All 16 HTML routes render at 375x812, 812x375, 768x1024 and 1440x1000 without horizontal page overflow: 64 checks.
- Every primary navigation link remains present, with a hit-area height of at least 44 CSS pixels.
- axe scans of all 16 routes at 375px and 1440px found no violations in the tested WCAG A/AA tags. Automated scans do not certify complete WCAG conformance.
- Keyboard skip link, approval, hold, restart, service deep links, package selection, mailto generation, reduced motion and no-JavaScript fallback passed against actual pages.
- All 21 existing unit tests passed. Links, positioning and legal placeholder checks passed.
- Regenerating policy pages after the implementation commit left the working tree clean.

## Boundaries

These observations establish concrete accessibility, keyboard-task and styling improvements, while preserving the immediate email discovery path. They do not establish visitor preference, comprehension, higher conversion, revenue, production performance or a successful live deployment. The user delegated visual direction, but has not reviewed the redesign. No push or deployment was performed.

Policy pages were regenerated from their existing authoritative Markdown. Besides style links, the pre-existing DPA source/output drift restored the source's phrases “integration OAuth tokens” and “the OAuth flows”. No legal source was edited as part of the redesign. This source synchronization should be noted during any pre-deployment review.
