"""
Fallback image importer: Importer.py only downloads images tagged into the
wiki's Category:Digimon Images (a separate, incomplete curation from
Category:Digimon species, which is what the 1660-species evolution graph
comes from) - species never tagged into that category get no sprite at
all. This covers the gap: for every species EvolutionGraphConverter.py
couldn't resolve a sprite for (spriteUrl: null in the generated JSON),
fetches that species' own wiki page and downloads its infobox |image=
directly (e.g. Seasarmon's page has |image=[[File:Seasarmon b.jpg]]).

Only works for species with an actual standalone wiki page - variant
labels like "Agumon (Black)" are usually just a section on the base
page, not their own page, and are correctly skipped (no-page).

Run this, then rerun EvolutionGraphConverter.py to pick up the newly
downloaded images (find_sprite() re-scans art/digimon/images/ fresh
each time it runs).
"""
import json
import os
import re
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

API_URL = "https://digimon.fandom.com/api.php"
ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(ROOT, "art", "digimon", "images")
EVOLUTION_JSON = os.path.join(ROOT, "src", "lib", "data", "digimon-evolution.json")
HEADERS = {"User-Agent": "DigiClicker-ImageImporter/1.0 (randerikatom@gmail.com)"}
# Gentler than Importer.py's 16 - this hits individual pages one at a time
# (two API calls per species) rather than one batched category listing.
MAX_WORKERS = 8

INVALID_CHARS = re.compile(r'[<>:"/\\|?*]')
INFOBOX_IMAGE_RE = re.compile(r'\|\s*image\s*=\s*\[\[File:([^\]|]+)', re.IGNORECASE)

_progress_lock = threading.Lock()


def sanitize(name):
    return INVALID_CHARS.sub("_", name).strip()


def make_session():
    session = requests.Session()
    session.headers.update(HEADERS)
    adapter = requests.adapters.HTTPAdapter(pool_connections=MAX_WORKERS, pool_maxsize=MAX_WORKERS)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def get_species_missing_sprites():
    with open(EVOLUTION_JSON, encoding="utf-8") as f:
        data = json.load(f)
    return sorted({s["name"] for s in data["species"].values() if not s["spriteUrl"]})


def get_wikitext(session, title):
    resp = session.get(API_URL, params={
        "action": "query",
        "titles": title,
        "prop": "revisions",
        "rvprop": "content",
        "rvslots": "main",
        "format": "json",
    }, timeout=30)
    resp.raise_for_status()
    pages = resp.json().get("query", {}).get("pages", {})
    for page in pages.values():
        revisions = page.get("revisions")
        if revisions:
            return revisions[0]["slots"]["main"]["*"]
    return None


def get_image_url(session, file_title):
    resp = session.get(API_URL, params={
        "action": "query",
        "titles": f"File:{file_title}",
        "prop": "imageinfo",
        "iiprop": "url",
        "format": "json",
    }, timeout=30)
    resp.raise_for_status()
    pages = resp.json().get("query", {}).get("pages", {})
    for page in pages.values():
        info = page.get("imageinfo")
        if info:
            return info[0]["url"]
    return None


def download_one(session, name):
    wikitext = get_wikitext(session, name)
    if not wikitext:
        return "no-page"

    match = INFOBOX_IMAGE_RE.search(wikitext)
    if not match:
        return "no-infobox-image"

    file_title = match.group(1).strip()
    url = get_image_url(session, file_title)
    if not url:
        return "no-url"

    # Same folder convention as Importer.py (first token of the name) so
    # EvolutionGraphConverter.py's find_sprite() picks these up automatically.
    first_token = sanitize(name.split(" ")[0])
    folder = os.path.join(OUTPUT_DIR, first_token)
    os.makedirs(folder, exist_ok=True)
    dest = os.path.join(folder, sanitize(file_title))

    if os.path.exists(dest):
        return "skipped"

    r = session.get(url, timeout=30)
    r.raise_for_status()
    with open(dest, "wb") as f:
        f.write(r.content)
    return "downloaded"


def main():
    session = make_session()
    names = get_species_missing_sprites()
    print(f"{len(names)} species have no resolved sprite - fetching infobox images...")

    counts = {}
    completed = 0
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(download_one, session, name): name for name in names}
        for future in as_completed(futures):
            name = futures[future]
            try:
                result = future.result()
            except requests.RequestException as e:
                result = "error"
                print(f"  [error] {name}: {e}")

            with _progress_lock:
                counts[result] = counts.get(result, 0) + 1
                completed += 1
                if completed % 50 == 0 or completed == len(names):
                    print(f"  {completed}/{len(names)} processed")

    print(f"Done. {counts}")


if __name__ == "__main__":
    main()
