"""
One-off cleanup: many downloaded Digimon PNGs (public/digimon/images/) carry
a solid white background baked in rather than being transparent, which looks
broken against the game's dark UI. This flood-fills near-white pixels
connected to each image's border to transparent, in place, leaving any
enclosed white areas inside the character's own art untouched.
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
IMAGES_DIR = ROOT / "public" / "digimon" / "images"
THRESHOLD = 24  # per-channel color-distance tolerance for the flood fill


def clean_background(path):
    img = Image.open(path).convert("RGBA")
    width, height = img.size
    corners = [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]

    changed = False
    for corner in corners:
        pixel = img.getpixel(corner)
        r, g, b, a = pixel
        if a == 0:
            continue  # already transparent here, nothing to do
        if r >= 235 and g >= 235 and b >= 235:
            ImageDraw.floodfill(img, corner, (255, 255, 255, 0), thresh=THRESHOLD)
            changed = True

    if changed:
        img.save(path)
    return changed


def main():
    png_paths = sorted(IMAGES_DIR.glob("*/*.png"))
    print(f"Scanning {len(png_paths)} images under {IMAGES_DIR}...")

    changed_count = 0
    for i, path in enumerate(png_paths, 1):
        try:
            if clean_background(path):
                changed_count += 1
        except Exception as e:
            print(f"  [error] {path.relative_to(ROOT)}: {e}")

        if i % 200 == 0 or i == len(png_paths):
            print(f"  {i}/{len(png_paths)} processed")

    print(f"Done. Cleaned backgrounds on {changed_count}/{len(png_paths)} images.")


if __name__ == "__main__":
    main()
