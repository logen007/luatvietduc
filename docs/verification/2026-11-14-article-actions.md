# Article action toolbar — 2026-11-14

## Reproduced

The real CMS browser measurement showed the native publish button at 40px with
8px corners, versus 44px / 4px for the other actions. The publish button is
nested in `.form-submit`, so the previous direct-child selector missed it.
The menu trigger contained a second bordered 32px dots wrapper. Desktop header
padding was 60px while sidebar content used 20px, leaving a 40px alignment gap.
Native mobile control overflow, padding and flex direction also created unequal
gaps and a tall header at the intermediate breakpoint.

## Changes

Use one wrapping action layout across native form/portal wrappers. All actions
are 44px high, corners 4px, gaps 8px; preview/menu are 44px square. Keep publish
as the primary action and native enabled/disabled/publish behavior. Remove the
inner dots border and align the right edge with settings content. At <=380px,
place language/translation above preview/publish/menu. Remove the native hidden
horizontal action scroller and its gradient spacer; header stays pinned while
the page scrolls.

Prepend the language portal container before native actions so DOM and keyboard
order match the visual order. Remove that container on unmount and give the
otherwise unnamed menu trigger the accessible name “Thao tác khác”.

## Observed verification

- Production Next build and its TypeScript pass completed successfully.
- All 15 focused translation/client/concurrency unit tests passed.
- `scripts/test-article-actions-browser.mjs` passed at 320, 390, 768, 1024,
  1280 and 1642px in Chrome. The two narrow sizes use touch/mobile emulation.
- Measured actual boxes: height 44px, radius 4px, gaps 8px, square icon actions,
  one menu border, matching right edge, predictable one/two rows, no horizontal
  page overflow, and controls contained in the header and visible after scrolling.
- Tab order follows the five visible controls; menu opens by pointer and Enter,
  closes by Escape, and fits inside the viewport.
- At 390/1280px, mocked translation/manual-language failures exercised pending,
  disabled and recovery states without resizing controls or changing the draft.
  An unavailable translation provider keeps its disabled button size.
- Preview opens the expected URL in a new tab. Native publishing succeeded for
  a synthetic article and a subsequent read confirmed `_status: published`.
- No browser page errors. Reviewed generated screenshots at 320/390/1280px.
- All data and accounts were synthetic in localhost `lvd_test`; browser egress
  was limited to localhost. No real translation provider or customer data used.
  Fixtures are deleted by the runner. Measurements/screenshots are ignored under
  `apps/cms/test-results/article-actions/`.

This is local Chrome verification, not a physical iPhone/Safari test or evidence
of production activation.
