"""Source-logo carousel interaction checks, independent of remote image availability."""
from pathlib import Path
import functools, http.server, threading
from playwright.sync_api import sync_playwright, expect


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = http.server.ThreadingHTTPServer(
    ('127.0.0.1', 0), functools.partial(Quiet, directory=str(Path.cwd()))
)
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}/'
sample_ms = 600
checks = 0


def passed(label):
    global checks
    checks += 1
    print('PASS', label, flush=True)


def local_assets_only(route):
    # Logos have fixed layout dimensions. Their servers and font servers need
    # not be online to verify scrolling, focus, or reduced-motion behavior.
    if route.request.url.startswith(base):
        route.continue_()
    else:
        route.abort()


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='no-preference')
    context.route('**/*', local_assets_only)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))

    def mount():
        slider = page.locator('[data-logo-slider]')
        track = slider.locator('.lvd-partner-track')
        expect(track).to_have_attribute('data-autoplay', 'true')
        slider.scroll_into_view_if_needed()
        page.mouse.move(1, 1)
        page.evaluate('document.activeElement?.blur()')
        return slider, track

    def offset(track):
        return track.evaluate('(el) => el.scrollLeft')

    def movement(track):
        before = offset(track)
        page.wait_for_timeout(sample_ms)
        return offset(track) - before

    page.goto(base + '#/', wait_until='load')
    slider, track = mount()
    sources = track.locator('img').evaluate_all('(images) => images.map(image => image.getAttribute("src"))')
    assert len(sources) == len(set(sources)) == 13
    assert track.locator('figcaption').count() == 0
    assert page.evaluate('document.documentElement.scrollWidth') <= 391
    assert track.evaluate('(el) => el.scrollWidth > el.clientWidth')
    rect = track.bounding_box()
    assert rect['x'] >= 0 and rect['x'] + rect['width'] <= 391
    passed('13 unique logo assets, logos only, horizontal overflow contained on mobile')

    delta = movement(track)
    assert 0 < delta < 35, ('slow autoplay', delta)
    passed('Autoplay advances gently without a pointer or keyboard focus inside')

    track.hover()
    assert abs(movement(track)) <= 1, 'Hover must pause autoplay'
    page.mouse.move(1, 1)
    assert movement(track) > 0, 'Autoplay must resume after hover ends'
    passed('Hover pause and resume')

    slider.focus()
    page.mouse.move(1, 1)
    assert abs(movement(track)) <= 1, 'Keyboard focus must pause autoplay after pointer leaves'
    page.evaluate('document.activeElement.blur()')
    assert movement(track) > 0, 'Autoplay must resume after focus leaves'
    passed('Keyboard focus pause and resume')

    pause = slider.locator('[data-slider-pause]')
    pause.click()
    expect(pause).to_have_attribute('aria-pressed', 'true')
    page.mouse.move(1, 1)
    page.evaluate('document.activeElement.blur()')
    assert abs(movement(track)) <= 1, 'Explicit pause must persist outside hover and focus'
    pause.click()
    expect(pause).to_have_attribute('aria-pressed', 'false')
    page.mouse.move(1, 1)
    page.evaluate('document.activeElement.blur()')
    assert movement(track) > 0
    passed('Explicit pause control persists and resumes')

    track.scroll_into_view_if_needed()
    rect = track.bounding_box()
    start_x = rect['x'] + min(rect['width'] - 25, 280)
    y = rect['y'] + rect['height'] / 2
    page.mouse.move(start_x, y)
    before = offset(track)
    page.mouse.down()
    page.mouse.move(start_x - 150, y, steps=8)
    page.mouse.up()
    assert offset(track) - before > 100, 'Mouse drag should reveal more logos'
    passed('Mouse dragging scrolls the track')

    # Navigate through the existing app instead of reloading the document, so
    # this catches initialization that runs only once on DOMContentLoaded.
    page.evaluate("location.hash = '/tra-cuu'")
    expect(page.locator('.catalog-group')).to_have_count(16)
    page.locator('.site-header .brand').click()
    slider, track = mount()
    assert movement(track) > 0, 'Returning home must initialize its new slider'
    passed('Autoplay initializes again after leaving and reentering home')

    # Change the OS preference while the same slider is alive as well as
    # opening a fresh reduced-motion page.
    page.emulate_media(reduced_motion='reduce')
    assert abs(movement(track)) <= 1
    passed('Runtime reduced-motion preference stops autoplay')
    context.close()

    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    context.route('**/*', local_assets_only)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(base + '#/', wait_until='load')
    slider, track = mount()
    assert abs(movement(track)) <= 1, 'Reduced-motion page must not autoplay'
    before = offset(track)
    slider.locator('[data-slider-dir="1"]').click()
    assert offset(track) > before + 100, 'Next button must work with reduced motion'
    before = offset(track)
    slider.focus()
    slider.press('ArrowLeft')
    assert offset(track) < before - 100, 'Arrow key must work with reduced motion'
    passed('Reduced-motion keeps manual buttons and keyboard navigation available')

    assert not errors, errors
    context.close()
    browser.close()

server.shutdown()
print(f'PASS: {checks} carousel behavior checks')
