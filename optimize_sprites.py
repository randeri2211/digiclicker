"""
Builds the sprites the game actually ships, from the scraped originals.

art/digimon/images/ (scraped by Importer.py, ~340MB, git-ignored) and
art/digimon/eggs/ (hand-sourced egg art, git-ignored) are SOURCE
material only - kept out of public/ so they can never be deployed. This script turns them into small, uniformly named WebP
files under public/sprites/ - committed, so any build (CI, GitHub Pages,
Docker) has them:

  public/sprites/<speciesId>.webp       every in-game species with a sprite
  public/sprites/eggs/<EggType>.webp    one per egg type

Per image: trim empty transparent borders (so every Digimon fills its frame
the same way), fit within MAX_SIZE px without upscaling, save as WebP with
alpha. Animated GIFs become animated WebP. Outputs newer than their source
are skipped, so reruns are quick; --force rebuilds everything.

  python optimize_sprites.py            # build / update
  python optimize_sprites.py --check    # CI: fail if any sprite is missing

Needs Pillow (in requirements.txt). The game reads these paths via
getSpriteUrl / getEggSpriteUrl in src/lib/game/images.ts.
"""
import json
import sys
from pathlib import Path

from ci_report import report

ROOT = Path(__file__).resolve().parent
SPECIES_PATH = ROOT / "src" / "lib" / "data" / "digimon-evolution.json"
PUBLIC = ROOT / "public"
SOURCE = ROOT / "art"  # spriteUrl in the data is relative to this
EGG_SOURCE_DIR = SOURCE / "digimon" / "eggs"
OUT_DIR = PUBLIC / "sprites"
EGG_OUT_DIR = OUT_DIR / "eggs"

# Mirrors IN_GAME_STAGES in src/lib/game/constants.ts.
IN_GAME_STAGES = {"Fresh", "In-Training", "Rookie", "Champion", "Ultimate", "Mega"}
# The arena shows sprites at up to 220 CSS px; 256 leaves a little headroom.
MAX_SIZE = 256
QUALITY = 82


def wanted_species():
    species = json.loads(SPECIES_PATH.read_text(encoding="utf-8"))["species"]
    return {
        sid: s["spriteUrl"]
        for sid, s in species.items()
        if s["stage"] in IN_GAME_STAGES and s.get("spriteUrl")
    }


def egg_sources():
    return {path.name: path / "egg-base.png" for path in sorted(EGG_SOURCE_DIR.iterdir()) if path.is_dir()}


def fit(frame, box):
    """Crop to `box` (shared across frames), then shrink to MAX_SIZE."""
    frame = frame.crop(box) if box else frame
    frame.thumbnail((MAX_SIZE, MAX_SIZE))  # keeps aspect ratio, never upscales
    return frame


def convert(source, target):
    from PIL import Image, ImageSequence

    with Image.open(source) as image:
        animated = getattr(image, "is_animated", False) and image.n_frames > 1
        frames = [f.convert("RGBA") for f in ImageSequence.Iterator(image)] if animated else [image.convert("RGBA")]
        durations = [f.info.get("duration", 100) for f in ImageSequence.Iterator(image)] if animated else []

    # One crop box for all frames (their union), so an animation doesn't wobble.
    boxes = [f.getchannel("A").getbbox() for f in frames]
    boxes = [b for b in boxes if b]
    box = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)) if boxes else None
    frames = [fit(f, box) for f in frames]

    target.parent.mkdir(parents=True, exist_ok=True)
    if animated:
        frames[0].save(target, "WEBP", save_all=True, append_images=frames[1:], duration=durations, loop=0,
                       quality=QUALITY, method=6)
    else:
        frames[0].save(target, "WEBP", quality=QUALITY, method=6)


def jobs():
    for sid, rel in wanted_species().items():
        yield SOURCE / rel, OUT_DIR / f"{sid}.webp"
    for egg_type, source in egg_sources().items():
        yield source, EGG_OUT_DIR / f"{egg_type}.webp"


def check():
    missing = [target.relative_to(ROOT) for _, target in jobs() if not target.exists()]
    if missing:
        print(f"{len(missing)} sprite(s) missing - run: python optimize_sprites.py")
        for path in missing[:20]:
            print(f"  - {path}")
        return 1
    print(f"OK - all {sum(1 for _ in jobs())} sprites present.")
    return 0


def main():
    if "--check" in sys.argv:
        # In CI the sources don't exist - only the committed outputs matter.
        species = wanted_species()
        missing = [sid for sid in species if not (OUT_DIR / f"{sid}.webp").exists()]
        report(
            "Sprites",
            [f"{sid}: no public/sprites/{sid}.webp - run optimize_sprites.py" for sid in missing],
            f"All {len(species)} in-game species have a sprite.",
        )
        if missing:
            print(f"{len(missing)} in-game species have no sprite in public/sprites/ - run optimize_sprites.py:")
            for sid in missing[:20]:
                print(f"  - {sid}")
            return 1
        print(f"OK - all {len(species)} in-game species have a sprite.")
        return 0

    force = "--force" in sys.argv
    built = skipped = failed = 0
    for source, target in jobs():
        if not source.exists():
            print(f"  source missing: {source.relative_to(ROOT)}")
            failed += 1
            continue
        if not force and target.exists() and target.stat().st_mtime >= source.stat().st_mtime:
            skipped += 1
            continue
        try:
            convert(source, target)
            built += 1
        except Exception as error:  # a broken source image shouldn't stop the batch
            print(f"  failed: {source.relative_to(ROOT)} ({error})")
            failed += 1

    total = sum(f.stat().st_size for f in OUT_DIR.rglob("*.webp"))
    print(f"built {built}, up to date {skipped}, failed {failed} - public/sprites/ is {total / 1e6:.1f} MB")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
