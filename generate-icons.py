#!/usr/bin/env python3
"""Generate PNG icons for the Marginal extension — no dependencies needed."""
import struct, zlib, math, os

def write_png(path, pixels, w, h):
    def chunk(tag, data):
        payload = tag + data
        return struct.pack('>I', len(data)) + payload + struct.pack('>I', zlib.crc32(payload) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    rows = b''.join(b'\x00' + bytes(v for px in pixels[y*w:(y+1)*w] for v in px) for y in range(h))
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', zlib.compress(rows, 9)))
        f.write(chunk(b'IEND', b''))

def aa(dist, radius, feather=1.0):
    return max(0.0, min(1.0, (radius - dist) / feather + 0.5))

def blend(fg, bg, a):
    return tuple(int(fg[i] * a + bg[i] * (1 - a)) for i in range(4))

def draw_icon(size):
    BG       = (0, 0, 0, 0)              # transparent outside
    PANEL_BG = (10, 10, 20, 255)         # dark base
    ACCENT   = (129, 140, 248, 255)      # indigo accent
    MARK     = (220, 224, 255, 240)      # near-white bookmark

    px = [BG] * (size * size)
    cx = cy = size / 2 - 0.5
    outer_r = size / 2 - 0.5
    feather = max(0.8, size * 0.012)

    for y in range(size):
        for x in range(size):
            dist = math.hypot(x - cx, y - cy)

            # Outer circle (dark base)
            a_outer = aa(dist, outer_r, feather)
            if a_outer <= 0:
                continue
            base = blend(PANEL_BG, BG, a_outer)

            # Accent ring (thin band just inside the edge)
            ring_w = max(1.5, size * 0.07)
            a_ring = aa(dist, outer_r, feather) - aa(dist, outer_r - ring_w, feather)
            a_ring = max(0.0, a_ring)
            base = blend(ACCENT, base, a_ring * 0.85)

            # Bookmark shape (inner white mark)
            bm_l = cx - size * 0.20
            bm_r = cx + size * 0.20
            bm_t = cy - size * 0.24
            bm_b = cy + size * 0.26
            notch_y = bm_b - size * 0.14

            if bm_l <= x <= bm_r and bm_t <= y <= bm_b:
                if y <= notch_y:
                    inside = True
                else:
                    prog = (y - notch_y) / (bm_b - notch_y)
                    half = (bm_r - bm_l) / 2 * (1 - prog)
                    inside = abs(x - cx) <= half
                if inside:
                    base = blend(MARK, base, 0.92)

            px[y * size + x] = base

    return px

os.makedirs('icons', exist_ok=True)
for sz in [16, 48, 128]:
    write_png(f'icons/icon{sz}.png', draw_icon(sz), sz, sz)
    print(f'  icons/icon{sz}.png')
