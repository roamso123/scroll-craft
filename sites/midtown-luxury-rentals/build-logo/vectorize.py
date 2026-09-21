"""Vectorise the Midtown Luxury Rentals mark.

Input:  build-logo/source.png, a soft screen grab on a black card. Its "white"
        tops out at a luminance of 150 and its red sits around #751810, so the
        colour fields are normalised before anything is thresholded.

Output: assets/logo.svg       full stacked mark, brand colours, transparent
        assets/mark.svg       arc and car glyph, for the bar lockup
        assets/favicon.svg    the car knocked out of an accent tile, for 16px
        *-currentcolor.svg    the same art with the ink left inheritable
        assets/logo.png, mark.png, apple-touch-icon.png  via build-logo/raster.mjs

Method: two colour fields (ink, accent), upscaled 4x, gaussian-smoothed and
then thresholded. The smoothing is what makes this usable: tracing the raw
mask of a blurry source fits hundreds of tiny curves to its ragged edge, which
is both ugly at size and most of the file weight.

    pip install pillow numpy scipy && apt-get install potrace
    python3 build-logo/vectorize.py
"""
from PIL import Image
import numpy as np, subprocess, pathlib, re
from scipy import ndimage

OUT   = pathlib.Path('build-logo')
SRC   = OUT / 'source.png'
ASSET = pathlib.Path('assets')
UP    = 4
INK, ACCENT = '#F4F4F6', '#D13622'

OUT.mkdir(exist_ok=True)

a = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
R, G, B = a[..., 0], a[..., 1], a[..., 2]
lum     = 0.2126 * R + 0.7152 * G + 0.0722 * B
accent  = np.clip((R - np.maximum(G, B)) / 70.0, 0, 1)
light   = np.clip(lum / 110.0, 0, 1)
ink     = np.clip(light - accent * 1.35, 0, 1)   # the accent wins any pixel it owns
H, W = ink.shape


def mask(field, thresh=0.45, sigma=3.2):
    """Upscale the continuous field, smooth it, then threshold."""
    img = Image.fromarray((field * 255).astype(np.uint8), 'L')
    big = np.asarray(img.resize((W * UP, H * UP), Image.LANCZOS)).astype(np.float32) / 255.0
    return ndimage.gaussian_filter(big, sigma) > thresh


def components(m, want):
    """Keep whole connected components by where they sit vertically."""
    lab, _ = ndimage.label(m)
    out = np.zeros_like(m)
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        if sl is not None and want(sl[0].start / m.shape[0], sl[0].stop / m.shape[0]):
            out |= (lab == i)
    return out


def trace(m, name, alphamax='1.0', opttolerance='0.6', turd='40', unit='4'):
    h, w = m.shape
    pbm = OUT / (name + '.pbm')
    with open(pbm, 'wb') as f:
        f.write(b'P4\n%d %d\n' % (w, h))
        f.write(np.packbits(m.astype(np.uint8), axis=1).tobytes())
    svg = OUT / (name + '.svg')
    subprocess.run(['potrace', str(pbm), '-s', '-o', str(svg), '-a', alphamax,
                    '-O', opttolerance, '-t', turd, '-u', unit], check=True)
    text = svg.read_text()
    g = re.search(r'<g([^>]*transform="[^"]+")', text)
    return re.findall(r'<path[^>]*d="([^"]+)"', text), (g.group(1) if g else '')


def compose(layers, box, label=None):
    x0, y0, w, h = box
    d = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="%d %d %d %d"%s>'
         % (x0, y0, w, h, ' role="img" aria-label="%s"' % label if label else '')]
    if label:
        d.append('<title>%s</title>' % label)
    for paths, g, fill in layers:
        d.append('<g fill="%s"%s>' % (fill, g.replace('transform=', ' transform=')))
        d += ['<path d="%s"/>' % p for p in paths]
        d.append('</g>')
    d.append('</svg>')
    return '\n'.join(d)


def box_of(*masks, pad=16):
    both = np.zeros_like(masks[0])
    for m in masks:
        both |= m
    ys, xs = np.where(both)
    x0, x1 = max(0, xs.min() - pad), min(both.shape[1], xs.max() + 1 + pad)
    y0, y1 = max(0, ys.min() - pad), min(both.shape[0], ys.max() + 1 + pad)
    return (x0, y0, x1 - x0, y1 - y0)


def write(path, text):
    pathlib.Path(path).write_text(text)
    print('  %-42s %6d bytes' % (path, len(text)))


ink_m, acc_m = mask(ink, 0.45), mask(accent, 0.45)

# --- the full stacked mark -------------------------------------------------
ip, ig = trace(ink_m, 'ink')
rp, rg = trace(acc_m, 'accent')
full_box = box_of(ink_m, acc_m)
print('full mark: ink=%d accent=%d paths' % (len(ip), len(rp)))
write(ASSET / 'logo.svg',
      compose([(ip, ig, INK), (rp, rg, ACCENT)], full_box, 'Midtown Luxury Rentals'))
write(ASSET / 'logo-currentcolor.svg',
      compose([(ip, ig, 'currentColor'), (rp, rg, 'var(--mark-accent, %s)' % ACCENT)],
              full_box, 'Midtown Luxury Rentals'))

# --- the glyph: the arc and the car ---------------------------------------
# The stacked lockup is unreadable at bar height and repeats the wordmark set
# beside it. The set text is dropped by component, not by cropping, so nothing
# is clipped: MIDTOWN sits above the car, LUXURY and RENTALS below it, and the
# X belongs to LUXURY. The shield's bottom chevron goes too, because the empty
# middle of the shield is most of the glyph's height and at 42px that gap is
# all the reader gets. Arc plus car is dense and stays legible.
car = components(ink_m, lambda y0, y1: y0 > 0.225 and y1 < 0.52)
arc = components(acc_m, lambda y0, y1: y1 < 0.45)
gp, gg = trace(car, 'glyph-ink')
sp, sg = trace(arc, 'glyph-accent')
glyph_box = box_of(car, arc)
print('glyph: ink=%d accent=%d paths, box %dx%d' % (len(gp), len(sp), glyph_box[2], glyph_box[3]))
write(ASSET / 'mark.svg',
      compose([(gp, gg, INK), (sp, sg, ACCENT)], glyph_box, 'Midtown Luxury Rentals'))
write(ASSET / 'mark-currentcolor.svg',
      compose([(gp, gg, 'currentColor'), (sp, sg, 'var(--mark-accent, %s)' % ACCENT)],
              glyph_box, 'Midtown Luxury Rentals'))

# --- the favicon: the car knocked out of a red tile ------------------------
# Line art does not survive 16px. A solid accent tile with the car reversed out
# of it holds its shape in a tab strip and is still only two brand colours.
fav_car = components(mask(ink, 0.45, sigma=7.0), lambda y0, y1: y0 > 0.225 and y1 < 0.52)
fp, fg = trace(fav_car, 'favicon', alphamax='1.3', opttolerance='2.0', turd='900', unit='2')
cx0, cy0, cw, ch = box_of(fav_car, pad=0)
print('favicon: %d paths' % len(fp))
inner = ['<g fill="%s"%s>' % (INK, fg.replace('transform=', ' transform='))]
inner += ['<path d="%s"/>' % q for q in fp]
inner.append('</g>')
write(ASSET / 'favicon.svg', '\n'.join([
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Midtown Luxury Rentals">',
    '<rect width="100" height="100" rx="20" fill="%s"/>' % ACCENT,
    '<svg x="13" y="%.1f" width="74" height="%.1f" viewBox="%d %d %d %d" preserveAspectRatio="xMidYMid meet">'
    % (50 - 74 * ch / cw / 2, 74 * ch / cw, cx0, cy0, cw, ch),
    *inner, '</svg>', '</svg>']))
