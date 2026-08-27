// Timeout so one slow/failed image can't block the game from ever starting.
const PRELOAD_TIMEOUT_MS = 5000;

function preloadOne(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    const done = () => resolve();
    img.onload = done;
    img.onerror = done;
    img.src = url;
  });
}

export async function preloadImages(urls: string[], onProgress?: (fraction: number) => void): Promise<void> {
  if (urls.length === 0) {
    onProgress?.(1);
    return;
  }

  let loaded = 0;
  const loadAll = Promise.all(
    urls.map((url) =>
      preloadOne(url).then(() => {
        loaded += 1;
        onProgress?.(loaded / urls.length);
      })
    )
  );
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, PRELOAD_TIMEOUT_MS));
  await Promise.race([loadAll, timeout]);
  onProgress?.(1);
}
