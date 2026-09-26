<script lang="ts">
  import { tips, dismissTip, skipAllTips } from '../game/state/tips.svelte';

  // Onboarding coach mark (state/tips.svelte.ts): the screen dims and blocks
  // clicks, the element the tip is about (data-tip="<target>") stays lit,
  // and the bubble sits beside it - below if it fits, else above, right or
  // left, always inside the window; centred when the target isn't on screen.
  // App hides it while a menu screen is open (the tip waits).

  const GAP = 14; // between target and bubble
  const PAD = 6; // spotlight padding around the target
  const MARGIN = 12; // keep the bubble this far from the window edge

  let rect: DOMRect | null = $state(null);
  let bubbleW = $state(340);
  let bubbleH = $state(160);
  let viewport = $state({ w: 0, h: 0 });
  // Another dialog or menu is open (any screen - not only the ones App
  // knows about, e.g. a Stats window or a right-click menu): wait.
  let blockedByOverlay = $state(false);

  // Follow the target every frame while a tip shows - layouts shift
  // (resizes, panels growing), and it's one getBoundingClientRect.
  $effect(() => {
    const target = tips.current?.target;
    if (!tips.current) return;
    let frame = 0;
    const track = () => {
      viewport = { w: window.innerWidth, h: window.innerHeight };
      blockedByOverlay = document.querySelector('[role="dialog"]:not([data-coach]), [role="menu"]') !== null;
      const el = target ? document.querySelector(`[data-tip="${target}"]`) : null;
      const r = el?.getBoundingClientRect();
      rect = r && r.width > 0 && r.height > 0 ? r : null;
      frame = requestAnimationFrame(track);
    };
    track();
    return () => cancelAnimationFrame(frame);
  });

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const position = $derived.by(() => {
    const { w, h } = viewport;
    if (!rect) return { left: (w - bubbleW) / 2, top: (h - bubbleH) / 2, side: 'center' };
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const fits = {
      below: rect.bottom + PAD + GAP + bubbleH <= h - MARGIN,
      above: rect.top - PAD - GAP - bubbleH >= MARGIN,
      right: rect.right + PAD + GAP + bubbleW <= w - MARGIN,
      left: rect.left - PAD - GAP - bubbleW >= MARGIN,
    };
    const hx = clamp(cx - bubbleW / 2, MARGIN, w - bubbleW - MARGIN);
    const vy = clamp(cy - bubbleH / 2, MARGIN, h - bubbleH - MARGIN);
    if (fits.below) return { left: hx, top: rect.bottom + PAD + GAP, side: 'below' };
    if (fits.above) return { left: hx, top: rect.top - PAD - GAP - bubbleH, side: 'above' };
    if (fits.right) return { left: rect.right + PAD + GAP, top: vy, side: 'right' };
    if (fits.left) return { left: rect.left - PAD - GAP - bubbleW, top: vy, side: 'left' };
    // Nothing fits beside a huge target: over it, near its top.
    return { left: hx, top: clamp(rect.top + GAP, MARGIN, h - bubbleH - MARGIN), side: 'inside' };
  });

  $effect(() => {
    if (!tips.current || blockedByOverlay) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') dismissTip();
      else if (e.key === 'Escape') skipAllTips();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
</script>

{#if tips.current && !blockedByOverlay}
  <!-- Blocks the game until the tip is dismissed. -->
  <div class="blocker" aria-hidden="true"></div>
  {#if rect}
    <div
      class="spotlight"
      style:left="{rect.left - PAD}px"
      style:top="{rect.top - PAD}px"
      style:width="{rect.width + PAD * 2}px"
      style:height="{rect.height + PAD * 2}px"
    ></div>
  {:else}
    <div class="dim"></div>
  {/if}
  <div
    class="bubble {position.side}"
    role="dialog"
    data-coach
    aria-label={tips.current.title}
    bind:offsetWidth={bubbleW}
    bind:offsetHeight={bubbleH}
    style:left="{position.left}px"
    style:top="{position.top}px"
  >
    <div class="title"><span class="bulb">💡</span>{tips.current.title}</div>
    <div class="text">{tips.current.text}</div>
    <div class="actions">
      <button class="primary" onclick={dismissTip}>Got it</button>
      <button class="quiet" onclick={skipAllTips} title="Settings can turn them back on">Skip all tips</button>
    </div>
  </div>
{/if}

<style>
  .blocker {
    position: fixed;
    inset: 0;
    z-index: 40;
  }
  /* The lit cutout: everything outside it is dimmed by the huge shadow. */
  .spotlight {
    position: fixed;
    z-index: 41;
    pointer-events: none;
    border: 1px solid var(--accent);
    box-shadow:
      0 0 0 9999px rgba(3, 5, 8, 0.72),
      0 0 18px rgba(34, 211, 238, 0.35);
    transition:
      left 0.2s,
      top 0.2s,
      width 0.2s,
      height 0.2s;
  }
  .dim {
    position: fixed;
    inset: 0;
    z-index: 41;
    pointer-events: none;
    background: rgba(3, 5, 8, 0.72);
  }
  .bubble {
    position: fixed;
    z-index: 42;
    width: 340px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 16px;
    background: var(--panel);
    border: 1px solid var(--accent);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.6);
  }
  .title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--head);
    font-size: 13px;
    letter-spacing: 1px;
    color: var(--text-h);
  }
  .bulb {
    font-size: 14px;
  }
  .text {
    font-size: 12px;
    line-height: 1.5;
    color: var(--text);
  }
  .actions {
    display: flex;
    gap: 6px;
  }
  button {
    appearance: none;
    font: inherit;
    font-size: 11px;
    padding: 5px 12px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text);
    cursor: pointer;
  }
  button.primary {
    border-color: var(--accent);
    color: var(--text-h);
  }
  button.quiet {
    border-color: transparent;
    color: var(--text-dim);
  }
</style>
