# Bundles deck.src.html into one self-contained, offline-capable HTML file.
# Fonts and photographs are inlined as data URIs; photos are re-encoded to
# 1600px JPEG first, which takes the bundle from ~9 MB to ~2 MB.
import base64, io, os, re
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(HERE, 'deck.src.html')
OUT  = os.path.join(HERE, 'PMR-AdBlue-DEF-Deck.html')

def encode_photo(path, width=1600, quality=82):
    im = Image.open(path).convert('RGB')
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=quality, optimize=True, progressive=True)
    return base64.b64encode(buf.getvalue()).decode(), buf.tell()

html = io.open(SRC, encoding='utf-8').read()

# 1. fonts
fonts = io.open(os.path.join(HERE, 'fonts.css'), encoding='utf-8').read()
html = html.replace('<link rel="stylesheet" href="fonts.css">',
                    '<style>\n' + fonts + '\n</style>')

# 2. photographs
total = 0
for name in re.findall(r'src="assets/([^"]+)"', html):
    b64, size = encode_photo(os.path.join(HERE, 'assets', name))
    html = html.replace('src="assets/%s"' % name, 'src="data:image/jpeg;base64,%s"' % b64)
    total += size
    print('  inlined %-14s %6.0f KB' % (name, size / 1024))

io.open(OUT, 'w', encoding='utf-8').write(html)
print('\n%s  —  %.1f MB (photos %.1f MB, fonts %.0f KB)'
      % (os.path.basename(OUT), os.path.getsize(OUT) / 1e6, total / 1e6, len(fonts) / 1024))
