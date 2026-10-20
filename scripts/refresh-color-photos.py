"""Restore the existing credited images in color; preserve layouts and editorial sources.
Downloads only the URLs already in the project manifest. No font files are stored.
"""
from __future__ import annotations
import concurrent.futures
import hashlib
import io
import json
import re
import time
import urllib.request
from pathlib import Path
from urllib.parse import urlparse
from PIL import Image, ImageChops, ImageCms, ImageOps, ImageStat

VERSION = '0.6.4'
SIZES = (600, 1200, 1800)
ALLOWED = {'images.unsplash.com', 'upload.wikimedia.org'}
MANIFEST = Path('assets/photo-sources.json')
sources = json.loads(MANIFEST.read_text(encoding='utf-8'))
output = Path('assets/photos')
output.mkdir(exist_ok=True)


def color_measure(image: Image.Image) -> float:
    sample = image.convert('RGB')
    sample.thumbnail((120, 120))
    red, green, blue = sample.split()
    difference = ImageChops.lighter(ImageChops.difference(red, green), ImageChops.difference(green, blue))
    return round(ImageStat.Stat(difference).mean[0], 4)


def download(source: dict) -> bytes:
    assert urlparse(source['download']).hostname in ALLOWED
    # Local originals, when present, come from the same manifest inspection.
    cached = Path('originals') / (source['id'] + '.image')
    if cached.exists():
        return cached.read_bytes()
    for attempt in range(3):
        try:
            request = urllib.request.Request(source['download'], headers={'User-Agent': 'LuatVietDuc/0.6.4 (credited editorial photographs)'})
            with urllib.request.urlopen(request, timeout=40) as response:
                assert response.status == 200
                assert urlparse(response.geturl()).hostname in ALLOWED
                data = response.read(25_000_001)
            assert 1_000 < len(data) <= 25_000_000
            return data
        except Exception:
            if attempt == 2:
                raise
            time.sleep(3 * (attempt + 1))
    raise RuntimeError('Download failed')


def restore(source: dict) -> dict:
    assert re.fullmatch(r'[a-z-]+', source['id'])
    data = download(source)
    with Image.open(io.BytesIO(data)) as original:
        original.load()
        image = ImageOps.exif_transpose(original)
        profile = image.info.get('icc_profile')
        if profile:
            image = ImageCms.profileToProfile(image, ImageCms.ImageCmsProfile(io.BytesIO(profile)), ImageCms.createProfile('sRGB'), outputMode='RGB')
        else:
            image = image.convert('RGB')
        assert min(image.size) > 300
        assert color_measure(image) > 2, source['id']
        files = []
        for width in SIZES:
            resized = image.copy()
            resized.thumbnail((width, width * 2), Image.Resampling.LANCZOS)
            path = output / f"{source['id']}-{width}.webp"
            resized.save(path, quality=84, method=6)
            with Image.open(path) as encoded:
                assert encoded.size == resized.size
                chroma = color_measure(encoded)
                assert chroma > 2, str(path)
            files.append({'path': str(path), 'dimensions': list(resized.size), 'bytes': path.stat().st_size, 'mean_channel_difference': chroma, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
        print('Restored original color:', source['id'], flush=True)
        return {'id': source['id'], 'source': source['download'], 'source_dimensions': list(image.size), 'source_sha256': hashlib.sha256(data).hexdigest(), 'treatment': 'Original color, EXIF orientation, sRGB conversion when profiled, resized WebP. No recoloring.', 'files': files}


with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    reports = list(pool.map(restore, sources))
(output / 'import-report.json').write_text(json.dumps(reports, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# Remove photograph desaturation at source, including hover rules.
for name in ('assets/newsroom.css', 'assets/steel-ui.css'):
    path = Path(name)
    text = path.read_text(encoding='utf-8')
    text = re.sub(r'filter\s*:\s*grayscale\([^)]*\)[^;}]*', 'filter:none', text)
    path.write_text(text, encoding='utf-8')

# Keep attribution accurate without adding development notes to the website.
path = Path('assets/newsroom.js')
text = path.read_text(encoding='utf-8')
text = text.replace('Ảnh đã chuyển đen trắng và điều chỉnh kích thước.', 'Giữ màu ảnh gốc, điều chỉnh kích thước và định dạng cho website.')
text = text.replace('Ảnh đã chuyển đen trắng, điều chỉnh kích thước và định dạng.', 'Giữ màu ảnh gốc; ảnh được điều chỉnh kích thước và định dạng.')
text = re.sub(r'(assets/photos/\$\{id\}-\d+\.webp)(?:\?v=[0-9.]+)?', lambda match: match.group(1) + '?v=' + VERSION, text)
path.write_text(text, encoding='utf-8')
path = Path('assets/news-content.js')
text = path.read_text(encoding='utf-8').replace('Bản đen trắng, điều chỉnh kích thước theo giấy phép CC BY-SA 3.0.', 'Giữ màu ảnh gốc, điều chỉnh kích thước theo giấy phép CC BY-SA 3.0.').replace('đen trắng theo CC BY-SA 3.0.', 'màu gốc theo CC BY-SA 3.0.')
path.write_text(text, encoding='utf-8')
for source in sources:
    source['note'] = source['note'].replace('Bản chuyển đen trắng, thu nhỏ và đổi WebP', 'Bản giữ màu gốc, thu nhỏ và đổi WebP')
MANIFEST.write_text(json.dumps(sources, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

path = Path('index.html')
text = path.read_text(encoding='utf-8').replace('0.6.3', VERSION)
# The supplied ABC subsets do not cover Vietnamese. Do not preload them for the Vietnamese page.
text = re.sub(r'^\s*<link rel="preload" href="https://steel\.dev/[^\n]+\n', '\n', text, flags=re.M)
path.write_text(text, encoding='utf-8')
print('Color assets and cache keys updated. No layout, route, source article or font binary changed.')
