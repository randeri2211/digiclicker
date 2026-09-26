"""
Downloads the element and attribute icons and builds the shipped copies.

Sources (chosen from the comparison in art/icon-candidates/):
- Elements: the Fandom wiki's element icons (Digimon Story: Time Stranger
  style, 48px) for Fire, Water, Plant, Electric, Earth, Wind, Metal
  (Steel), Ice - their baked-in dark gradient tile is removed here. That
  set has no Light / Dark, so those two are the Frontier Spirit Marks.
  Neutral has no icon (the game shows a coloured dot).
- Attributes: Wikimon's Digimon Story: Time Stranger attribute icons.

Raw downloads go to art/icons/ (source art, git-ignored); the game ships
public/sprites/icons/elements/<Element>.webp and
public/sprites/icons/attributes/<Attribute>.webp (committed), read by
ElementIcon.svelte / AttributeIcon.svelte.

  python import_type_icons.py            # download (if missing) + build
  python import_type_icons.py --force    # re-download everything
  python import_type_icons.py --check    # CI: every icon present
"""
import json
import sys
import time
import urllib.parse
import urllib.request
from collections import deque
from pathlib import Path

# Pillow is imported where images are processed, so --check (CI) runs
# without it.

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "art" / "icons"
OUT = ROOT / "public" / "sprites" / "icons"
FANDOM = "https://digimon.fandom.com/api.php"
WIKIMON = "https://wikimon.net/api.php"
USER_AGENT = "DigiClicker asset import (personal project)"

# (kind, name) -> (api, wiki file, has a baked background to remove)
ICONS = {
    **{("elements", element): (FANDOM, wiki, True) for element, wiki in {
        "Fire": "Fire.png", "Water": "Water.png", "Plant": "Plant.png", "Electric": "Electricity.png",
        "Earth": "Earth.png", "Wind": "Wind.png", "Metal": "Steel.png", "Ice": "Ice.png",
    }.items()},
    ("elements", "Light"): (FANDOM, "Light_Spirit_Mark_dm.png", False),
    ("elements", "Dark"): (FANDOM, "Darkness_Spirit_Mark_dm.png", False),
    **{("attributes", attribute): (WIKIMON, f"DSTS_Icon_Attribute_{attribute}.png", False)
       for attribute in ["Vaccine", "Data", "Virus", "Free", "Variable", "Unknown", "NoData"]},
}
MAX_SIZE = 64  # shown at ~16-24 CSS px; 64 covers high-DPI screens


def fetch(api, wiki_name, target):
    params = {"action": "query", "prop": "imageinfo", "iiprop": "url", "titles": f"File:{wiki_name}", "format": "json"}
    request = urllib.request.Request(f"{api}?{urllib.parse.urlencode(params)}", headers={"User-Agent": USER_AGENT})
    pages = json.load(urllib.request.urlopen(request, timeout=30))["query"]["pages"]
    info = next(iter(pages.values())).get("imageinfo")
    if not info:
        raise RuntimeError(f"{wiki_name} not found on {api}")
    request = urllib.request.Request(info[0]["url"], headers={"User-Agent": USER_AGENT})
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(urllib.request.urlopen(request, timeout=30).read())
    time.sleep(0.2)  # be gentle with the wikis


# ---- Background removal (the Fandom element icons' dark gradient tile) ----
STEP = 22        # max colour change between neighbouring background pixels
DARK = 110       # background pixels never have a channel above this
ENCLOSED = 26    # enclosed pixels this close to the mean background colour count too
EDGE_RANGE = 70  # colour distance over which an edge pixel fades from bg to icon


def _dist(a, b):
    return max(abs(a[0] - b[0]), abs(a[1] - b[1]), abs(a[2] - b[2]))


def remove_background(image):
    from PIL import Image

    """Flood-fills the tile from the border (following its gradient), adds
    enclosed pockets of the same colour, then un-blends edge pixels so no
    dark fringe is left."""
    img = image.convert("RGB")
    w, h = img.size
    px = img.load()
    is_bg = [[False] * w for _ in range(h)]
    border = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
    queue = deque()
    for x, y in border:
        if max(px[x, y]) <= DARK and not is_bg[y][x]:
            is_bg[y][x] = True
            queue.append((x, y))
    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not is_bg[ny][nx]:
                c = px[nx, ny]
                if max(c) <= DARK and _dist(c, px[x, y]) <= STEP:
                    is_bg[ny][nx] = True
                    queue.append((nx, ny))

    bg_pixels = [px[x, y] for y in range(h) for x in range(w) if is_bg[y][x]]
    mean = tuple(sum(c[i] for c in bg_pixels) / len(bg_pixels) for i in range(3))
    for y in range(h):
        for x in range(w):
            if not is_bg[y][x] and max(px[x, y]) <= DARK and _dist(px[x, y], mean) <= ENCLOSED:
                is_bg[y][x] = True

    out = Image.new("RGBA", (w, h))
    op = out.load()
    for y in range(h):
        for x in range(w):
            c = px[x, y]
            if is_bg[y][x]:
                op[x, y] = (0, 0, 0, 0)
                continue
            neighbours = [px[nx, ny] for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))
                          if 0 <= nx < w and 0 <= ny < h and is_bg[ny][nx]]
            if not neighbours:
                op[x, y] = c + (255,)
                continue
            bg = tuple(sum(n[i] for n in neighbours) / len(neighbours) for i in range(3))
            alpha = min(1.0, _dist(c, bg) / EDGE_RANGE)
            if alpha < 0.08:
                op[x, y] = (0, 0, 0, 0)
                continue
            fg = tuple(max(0, min(255, round((c[i] - (1 - alpha) * bg[i]) / alpha))) for i in range(3))
            op[x, y] = fg + (round(alpha * 255),)
    return out


def build(source, has_background, target):
    from PIL import Image

    image = Image.open(source)
    image = remove_background(image) if has_background else image.convert("RGBA")
    bbox = image.getchannel("A").getbbox()
    if bbox:
        image = image.crop(bbox)
    image.thumbnail((MAX_SIZE, MAX_SIZE))  # never upscales
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, "WEBP", quality=90, method=6)


def check():
    """CI: every shipped icon exists (the wiki downloads aren't in git)."""
    from ci_report import report
    missing = [f"{kind}/{name}.webp" for kind, name in ICONS if not (OUT / kind / f"{name}.webp").exists()]
    report("Type icons", [f"public/sprites/icons/{m} is missing - run import_type_icons.py" for m in missing],
           f"All {len(ICONS)} element and attribute icons present.")
    if missing:
        print(f"{len(missing)} icon(s) missing: {', '.join(missing)}")
        return 1
    print(f"OK - all {len(ICONS)} icons present.")
    return 0


def main():
    if "--check" in sys.argv:
        return check()
    force = "--force" in sys.argv
    for (kind, name), (api, wiki_name, has_background) in ICONS.items():
        raw = RAW / kind / f"{name}{Path(wiki_name).suffix}"
        if force or not raw.exists():
            fetch(api, wiki_name, raw)
        build(raw, has_background, OUT / kind / f"{name}.webp")
    total = sum(f.stat().st_size for f in OUT.rglob("*.webp"))
    print(f"built {len(ICONS)} icons into public/sprites/icons/ ({total / 1024:.0f} KB)")


if __name__ == "__main__":
    sys.exit(main())
