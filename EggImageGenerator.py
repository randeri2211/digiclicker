"""
Recolors a single official Digi-Egg base image (Zurumon's egg, sourced from
wikimon.net) into a shell/stripe color variant per Digi-Egg flavor type.

Colors are entirely data-driven from egg_assets/egg_type_colors.json - each
type maps to color1 (the egg shell's base color) and color2 (the stripe
pattern's color). Edit that file to retune any type's palette; no code
changes needed.

The base image's stripe pattern is isolated with a simple color-key mask
(red channel dominance - the source stripes are a fairly pure red). Each
pixel keeps its own original brightness (HSV value), so the base image's
shading/gloss gradient carries over untouched - only hue/saturation are
remapped to whichever of the two target colors that pixel's region
(stripe vs shell) belongs to.
"""
import colorsys
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
BASE_IMAGE = ROOT / "egg_assets" / "base_egg_zurumon.jpg"
COLORS_JSON = ROOT / "egg_assets" / "egg_type_colors.json"
OUTPUT_DIR = ROOT / "public" / "digimon" / "eggs"
MONTAGE_PATH = ROOT / "egg_assets" / "montage.png"

# Montage layout - a dark backdrop matches the game's actual UI, so
# near-white/pale colors that'd wash out on a white page (and any two
# types that read as near-identical) are easy to spot at a glance.
MONTAGE_BG = (13, 19, 25)
MONTAGE_TEXT = (230, 230, 230)
MONTAGE_COLS = 4
MONTAGE_CELL = 200
MONTAGE_PAD = 10
MONTAGE_LABEL_H = 24

# R - max(G,B) above this = "stripe pixel" in the source image.
REDNESS_THRESHOLD = 40

# Same flood-fill background-knockout technique as RemoveSpriteBackgrounds.py.
BG_THRESHOLD = 24


def hex_to_hsv(hex_color):
    hex_color = hex_color.lstrip("#")
    r, g, b = (int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return colorsys.rgb_to_hsv(r, g, b)


def knock_out_background(image):
    """Flood-fills the near-white background (connected to the image
    border) to transparent, once, on the shared base - so every per-type
    recolor below inherits a transparent background for free instead of
    each one needing its own pass."""
    rgba = image.convert("RGBA")
    width, height = rgba.size
    for corner in [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]:
        r, g, b, a = rgba.getpixel(corner)
        if a != 0 and r >= 235 and g >= 235 and b >= 235:
            ImageDraw.floodfill(rgba, corner, (255, 255, 255, 0), thresh=BG_THRESHOLD)
    return rgba


def recolor(image, shell_hsv, stripe_hsv):
    rgba = image.convert("RGBA")
    width, height = rgba.size
    src = rgba.load()
    out = Image.new("RGBA", (width, height))
    dst = out.load()

    for y in range(height):
        for x in range(width):
            r, g, b, a = src[x, y]
            if a == 0:
                dst[x, y] = (0, 0, 0, 0)
                continue
            _, _, value = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            is_stripe = r - max(g, b) > REDNESS_THRESHOLD
            target_h, target_s, _ = stripe_hsv if is_stripe else shell_hsv
            nr, ng, nb = colorsys.hsv_to_rgb(target_h, target_s, value)
            dst[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)

    return out


def build_montage(egg_types):
    """One grid image, all types side by side on a dark backdrop (matching
    the actual game UI) with labels - the fast way to spot two types that
    ended up reading as near-identical, without opening 11 separate files."""
    rows = -(-len(egg_types) // MONTAGE_COLS)  # ceil
    cell_h = MONTAGE_CELL + MONTAGE_LABEL_H
    sheet = Image.new(
        "RGB",
        (MONTAGE_COLS * (MONTAGE_CELL + MONTAGE_PAD) + MONTAGE_PAD, rows * (cell_h + MONTAGE_PAD) + MONTAGE_PAD),
        MONTAGE_BG,
    )
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("arial.ttf", 14)
    except OSError:
        font = ImageFont.load_default()

    for i, egg_type in enumerate(egg_types):
        img = Image.open(OUTPUT_DIR / egg_type / "egg-base.png").convert("RGBA")
        img.thumbnail((MONTAGE_CELL, MONTAGE_CELL))
        col, row = i % MONTAGE_COLS, i // MONTAGE_COLS
        x = MONTAGE_PAD + col * (MONTAGE_CELL + MONTAGE_PAD)
        y = MONTAGE_PAD + row * (cell_h + MONTAGE_PAD)
        sheet.paste(img, (x + (MONTAGE_CELL - img.width) // 2, y), img)
        draw.text((x, y + MONTAGE_CELL + 4), egg_type, fill=MONTAGE_TEXT, font=font)

    sheet.save(MONTAGE_PATH)
    return MONTAGE_PATH


def main():
    with open(COLORS_JSON, encoding="utf-8") as f:
        colors = json.load(f)

    base = knock_out_background(Image.open(BASE_IMAGE))

    for egg_type, spec in colors.items():
        shell_hsv = hex_to_hsv(spec["color1"])
        stripe_hsv = hex_to_hsv(spec["color2"])

        out_dir = OUTPUT_DIR / egg_type
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / "egg-base.png"

        recolor(base, shell_hsv, stripe_hsv).save(out_path)
        print(f"Wrote {out_path}")

    montage_path = build_montage(list(colors.keys()))
    print(f"Wrote {montage_path}")


if __name__ == "__main__":
    main()
