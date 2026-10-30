"""Build the browser icon and subset local fonts from their TTF masters.

Run with Python packages fonttools[woff] and Pillow installed.
"""
from io import BytesIO
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
from PIL import Image

root = Path(__file__).resolve().parents[2]
fonts = root / 'frontend/src/assets/fonts'
masters = root / 'asset/shared/fonts'


def write_changed(path, data):
    previous = path.read_bytes() if path.exists() else b''
    if previous != data:
        path.write_bytes(data)
    return len(previous), len(data)


# Keep western European text, combining accents, punctuation, currency, arrows,
# symbols and every OpenType alternate/ligature used by these retained characters.
ranges = [(0x0, 0x24f), (0x300, 0x36f), (0x1e00, 0x1eff), (0x2000, 0x214f), (0x2190, 0x21ff)]
codepoints = {n for start, end in ranges for n in range(start, end + 1)} | {0x2212, 0x2665, 0x2764}
for name in ['lato-medium', 'great-vibes-regular']:
    font = TTFont(masters / f'{name}.ttf', recalcTimestamp=False)
    options = subset.Options()
    options.layout_features = ['*']
    options.recalc_timestamp = False
    sub = subset.Subsetter(options=options)
    sub.populate(unicodes=codepoints)
    sub.subset(font)
    for flavor in ['woff2']:
        font.flavor = flavor
        output = BytesIO()
        font.save(output)
        before, after = write_changed(fonts / f'{name}.{flavor}', output.getvalue())
        print(f'{name}.{flavor}: {before} -> {after} bytes')

icon = root / 'asset/shared/branding/favicon.ico'
with Image.open(icon) as source:
    rgba = source.convert('RGBA')
    output = BytesIO()
    rgba.save(output, format='ICO', sizes=[rgba.size], bitmap_format='png')
    encoded = output.getvalue()
    with Image.open(BytesIO(encoded)) as rebuilt:
        if rebuilt.convert('RGBA').tobytes() != rgba.tobytes():
            raise ValueError('Icon pixels changed')
    before, after = write_changed(icon, encoded)
    print(f'favicon.ico: {before} -> {after} bytes; identical pixels')
    browser_icon = BytesIO()
    rgba.resize((32, 32), Image.Resampling.LANCZOS).save(browser_icon, format='PNG', optimize=True)
    before, after = write_changed(icon.with_name('favicon-32.png'), browser_icon.getvalue())
    print(f'favicon-32.png: {after} bytes; browser-sized derivative')
