"""
Many downloaded Digimon images (public/digimon/images/) carry a solid
white background baked in rather than being transparent, which looks
broken against the game's dark UI. This flood-fills near-white pixels
connected to each image's border to transparent, leaving any enclosed
white areas inside the character's own art untouched.

Covers every format either importer can produce (Importer.py: mostly
.png; InfoboxImageImporter.py: whatever the wiki serves, commonly
.jpg/.gif). JPEG/GIF can't hold a real alpha channel, so a non-PNG file
that actually needed its background removed is re-saved as .png (same
stem) and the original non-PNG file deleted - otherwise find_sprite() in
EvolutionGraphConverter.py would end up with two candidate files for the
same source image.
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
        r, g, b, a = img.getpixel(corner)
        if a == 0:
            continue  # already transparent here, nothing to do
        if r >= 235 and g >= 235 and b >= 235:
            ImageDraw.floodfill(img, corner, (255, 255, 255, 0), thresh=THRESHOLD)
            changed = True

    if not changed:
        return False

    if path.suffix.lower() == ".png":
        img.save(path)
        return True

    new_path = path.with_suffix(".png")
    if new_path.exists():
        print(f"  [skip-rename] {path.name} would collide with existing {new_path.name} - left as-is")
        return False

    img.save(new_path)
    path.unlink()
    return True


def main():
    image_paths = sorted(
        p for ext in ("*.png", "*.jpg", "*.jpeg", "*.gif") for p in IMAGES_DIR.glob(f"*/{ext}")
    )
    print(f"Scanning {len(image_paths)} images under {IMAGES_DIR}...")

    changed_count = 0
    for i, path in enumerate(image_paths, 1):
        try:
            if clean_background(path):
                changed_count += 1
        except Exception as e:
            print(f"  [error] {path.relative_to(ROOT)}: {e}")

        if i % 200 == 0 or i == len(image_paths):
            print(f"  {i}/{len(image_paths)} processed")

    print(f"Done. Cleaned backgrounds on {changed_count}/{len(image_paths)} images.")


if __name__ == "__main__":
    main()
