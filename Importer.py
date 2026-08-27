"""
Downloads every image from https://digimon.fandom.com/wiki/Category:Digimon_Images
and saves it into digimon/images/<DigimonName>/<original filename>, grouping
images by the Digimon name each file is prefixed with.
"""
import os
import re
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

API_URL = "https://digimon.fandom.com/api.php"
CATEGORY = "Category:Digimon Images"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", "digimon", "images")
HEADERS = {"User-Agent": "DigiClicker-ImageImporter/1.0 (randerikatom@gmail.com)"}
MAX_WORKERS = 16

INVALID_CHARS = re.compile(r'[<>:"/\\|?*]')
_progress_lock = threading.Lock()
_made_dirs = set()


def sanitize(name):
    return INVALID_CHARS.sub("_", name).strip()


def make_session():
    session = requests.Session()
    session.headers.update(HEADERS)
    adapter = requests.adapters.HTTPAdapter(pool_connections=MAX_WORKERS, pool_maxsize=MAX_WORKERS)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def get_all_file_titles(session):
    """Return every File: title in the category, following pagination."""
    titles = []
    params = {
        "action": "query",
        "list": "categorymembers",
        "cmtitle": CATEGORY,
        "cmtype": "file",
        "cmlimit": "500",
        "format": "json",
    }
    while True:
        resp = session.get(API_URL, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        titles.extend(m["title"] for m in data["query"]["categorymembers"])
        if "continue" in data:
            params["cmcontinue"] = data["continue"]["cmcontinue"]
        else:
            break
    return titles


def _fetch_url_batch(session, batch):
    params = {
        "action": "query",
        "titles": "|".join(batch),
        "prop": "imageinfo",
        "iiprop": "url",
        "format": "json",
    }
    resp = session.get(API_URL, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    result = {}
    for page in data["query"]["pages"].values():
        info = page.get("imageinfo")
        if info:
            result[page["title"]] = info[0]["url"]
    return result


def get_image_urls(session, titles):
    """Resolve File: titles to direct image URLs, batching 50 titles per request
    and running batches concurrently."""
    urls = {}
    batches = [titles[i:i + 50] for i in range(0, len(titles), 50)]
    with ThreadPoolExecutor(max_workers=min(8, len(batches) or 1)) as executor:
        futures = [executor.submit(_fetch_url_batch, session, batch) for batch in batches]
        for future in as_completed(futures):
            urls.update(future.result())
    return urls


def digimon_name_from_title(title):
    """'File:Agumon (Black) dwds.png' -> 'Agumon'"""
    filename = title[len("File:"):]
    base, _ext = os.path.splitext(filename)
    name = base.split(" ")[0]
    return sanitize(name) or "Unknown"


def ensure_dir(folder):
    if folder not in _made_dirs:
        os.makedirs(folder, exist_ok=True)
        _made_dirs.add(folder)


def download_one(session, title, url):
    filename = sanitize(title[len("File:"):])
    digimon = digimon_name_from_title(title)
    folder = os.path.join(OUTPUT_DIR, digimon)
    ensure_dir(folder)
    dest = os.path.join(folder, filename)

    if os.path.exists(dest):
        return "skipped"

    r = session.get(url, timeout=30)
    r.raise_for_status()
    with open(dest, "wb") as f:
        f.write(r.content)
    return "downloaded"


def main():
    session = make_session()

    print("Fetching file list from category...")
    titles = get_all_file_titles(session)
    print(f"Found {len(titles)} images.")

    print("Resolving image URLs...")
    url_map = get_image_urls(session, titles)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    downloaded = 0
    skipped = 0
    errored = 0
    completed = 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_title = {}
        for title in titles:
            url = url_map.get(title)
            if not url:
                skipped += 1
                completed += 1
                continue
            future_to_title[executor.submit(download_one, session, title, url)] = title

        for future in as_completed(future_to_title):
            title = future_to_title[future]
            try:
                result = future.result()
                if result == "downloaded":
                    downloaded += 1
                else:
                    skipped += 1
            except requests.RequestException as e:
                errored += 1
                print(f"  [error] {title}: {e}")

            completed += 1
            with _progress_lock:
                if completed % 25 == 0 or completed == len(titles):
                    print(f"  {completed}/{len(titles)} processed")

    print(f"Done. Downloaded {downloaded}, skipped {skipped}, errored {errored}, total {len(titles)}.")


if __name__ == "__main__":
    main()
