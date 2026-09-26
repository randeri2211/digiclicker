<script lang="ts">
  import {
    ACTS,
    actScreen,
    closeActScreen,
    playStats,
    roster,
    partners,
    getRegion,
    getArea,
    getResidents,
    hasJoined,
    exportSlotToFile,
    activeSlot,
  } from '../game/state/game.svelte';
  import { getSpecies, getSpriteUrl, getSpeciesName, getSpeciesIdsByStage } from '../game/images';
  import { levelForXp } from '../game/combat/levelCurve';
  import { IN_GAME_STAGES } from '../game/constants';
  import { CRESTS } from '../game/evolution/crests';

  const act = $derived(ACTS.find((a) => a.id === actScreen.actId));
  const region = $derived(act ? getRegion(act.regionId) : undefined);
  const nextRegion = $derived(act ? getRegion(act.next.regionId) : undefined);
  let step = $state(0);
  const STEPS = 4;

  // The act's bosses, in map order.
  const bosses = $derived(
    (region?.areas ?? []).flatMap((mapArea) =>
      Object.values(getArea(mapArea.id)?.paths ?? {})
        .filter((path) => path.boss)
        .map((path) => path.boss!.speciesId),
    ),
  );
  const residents = $derived(
    getResidents().filter((npc) => hasJoined(npc) && region?.areas.some((area) => area.id === npc.homeAreaId)),
  );
  const stages = [...IN_GAME_STAGES];
  const collection = $derived(
    stages.map((stage) => ({
      stage,
      owned: Object.values(roster).filter((e) => getSpecies(e.speciesId)?.stage === stage).length,
      total: getSpeciesIdsByStage(stage).length,
    })),
  );
  const collected = $derived(Object.keys(roster).length);
  const collectable = $derived(collection.reduce((sum, c) => sum + c.total, 0));

  function duration(ms: number): string {
    const minutes = Math.floor(ms / 60_000);
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
  }

  function close() {
    step = 0;
    closeActScreen();
  }

  $effect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (!act) return;
      if (e.key === 'ArrowRight' && step < STEPS - 1) step += 1;
      if (e.key === 'ArrowLeft' && step > 0) step -= 1;
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if act}
  <div class="backdrop" role="dialog" aria-label="Act {act.number} complete">
    <div class="panel">
      <div class="act-label">Act {act.number} · {act.title}</div>

      {#if step === 0}
        <!-- The victory beat -->
        <div class="beat">
          <svg class="gear" viewBox="-60 -60 120 120" aria-hidden="true">
            <g class="gear-body">
              <circle r="30" fill="none" stroke="currentColor" stroke-width="10" />
              {#each Array.from({ length: 8 }) as _, i (i)}
                <rect x="-6" y="-46" width="12" height="16" fill="currentColor" transform="rotate({i * 45})" />
              {/each}
            </g>
            {#each Array.from({ length: 6 }) as _, i (i)}
              <polygon class="shard" style="--a: {i * 60}deg" points="0,-8 7,4 -6,6" fill="currentColor" />
            {/each}
          </svg>
          <div class="headline">Act {act.number} complete</div>
          {#if getSpriteUrl(act.villain)}<img class="villain" src={getSpriteUrl(act.villain)} alt="" />{/if}
          <p class="quote">{act.closingQuote}</p>
          <p class="line">{act.closingLine}</p>
        </div>
      {:else if step === 1}
        <!-- Your journey -->
        <div class="heading">Your {act.title} journey</div>
        <div class="stats">
          <div class="stat"><span class="value">{duration(playStats.onlineMs)}</span><span class="label">played</span></div>
          <div class="stat"><span class="value">{duration(playStats.offlineMs)}</span><span class="label">fought while away</span></div>
          <div class="stat"><span class="value">{playStats.wildKills.toLocaleString()}</span><span class="label">wild Digimon defeated</span></div>
          <div class="stat"><span class="value">{playStats.eggsHatched}</span><span class="label">eggs hatched</span></div>
        </div>
        {#if playStats.partial}<div class="note">Times and counts since {new Date(playStats.trackedSince).toLocaleDateString()} - this save began before they were tracked.</div>{/if}

        <div class="section">Bosses defeated</div>
        <div class="row">
          {#each bosses as id (id)}
            <div class="mon" title={getSpeciesName(id)}>{#if getSpriteUrl(id)}<img src={getSpriteUrl(id)} alt="" />{/if}<span>{getSpeciesName(id)}</span></div>
          {/each}
        </div>

        <div class="section">Collection · {collected} / {collectable}</div>
        <div class="collection">
          {#each collection as c (c.stage)}
            <span class="stage">{c.stage} <b>{c.owned}</b>/{c.total}</span>
          {/each}
        </div>

        <div class="split">
          <div>
            <div class="section">Your partners</div>
            <div class="row">
              {#each partners.ids.filter((id) => roster[id]) as id (id)}
                <div class="mon partner">{#if getSpriteUrl(id)}<img src={getSpriteUrl(id)} alt="" />{/if}<span>{getSpeciesName(id)} {levelForXp(roster[id].xp)}</span></div>
              {:else}
                <span class="note">No partners chosen</span>
              {/each}
            </div>
          </div>
          <div>
            <div class="section">The village</div>
            <div class="row">
              {#each residents as npc (npc.id)}
                <div class="mon" title={npc.name}>{#if getSpriteUrl(npc.speciesId)}<img src={getSpriteUrl(npc.speciesId)} alt="" />{/if}<span>{npc.name}</span></div>
              {/each}
            </div>
          </div>
        </div>
      {:else if step === 2}
        <!-- The map and what's next -->
        <div class="heading">{region?.name} - every area cleared</div>
        <div class="cleared">
          {#each region?.areas ?? [] as area (area.id)}
            <span class="area">✓ {getArea(area.id)?.name ?? area.name}</span>
          {/each}
        </div>
        <div class="next">
          {#if getSpriteUrl('whamon')}<img class="whamon" src={getSpriteUrl('whamon')} alt="" />{/if}
          <div>
            <div class="next-label">Act {act.number + 1} · coming soon</div>
            <div class="next-title">{act.next.title}</div>
            <p class="line">{act.next.teaser}</p>
            <div class="cleared">
              {#each nextRegion?.areas ?? [] as area (area.id)}<span class="area unknown">???</span>{/each}
            </div>
          </div>
        </div>
      {:else}
        <!-- Reward and what to do now -->
        <div class="heading">{act.reward.name}</div>
        <p class="line">{act.reward.text}</p>
        <div class="crests">
          {#each Object.values(CRESTS) as crest (crest.id)}
            <div class="crest"><span class="crest-mark">◆</span>{crest.name.replace('Crest of ', '')}</div>
          {/each}
        </div>
        <p class="line">
          The story continues in Act {act.number + 1}. Until then, File Island is yours: keep collecting, raise your partners, fill
          the Compendium.
        </p>
        <div class="finale-actions">
          <button class="primary" onclick={close}>Keep exploring</button>
          <button onclick={() => activeSlot.id && exportSlotToFile(activeSlot.id)}>Export your save</button>
        </div>
        <div class="note">Your save carries into Act {act.number + 1} - an export keeps it safe until then.</div>
      {/if}

      <div class="nav">
        <button class="quiet" onclick={close}>Skip</button>
        <div class="dots">
          {#each Array.from({ length: STEPS }) as _, i (i)}<span class="dot" class:on={i === step}></span>{/each}
        </div>
        <div class="nav-buttons">
          {#if step > 0}<button onclick={() => (step -= 1)}>Back</button>{/if}
          {#if step < STEPS - 1}<button class="primary" onclick={() => (step += 1)}>Next</button>{/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(3, 5, 8, 0.88);
  }
  .panel {
    width: 92%;
    max-width: 760px;
    max-height: 92%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 24px 28px;
    background: var(--panel);
    border: 1px solid var(--warn);
  }
  .act-label,
  .section,
  .next-label {
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  .heading,
  .headline,
  .next-title {
    font-family: var(--head);
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: var(--text-h);
  }
  .headline {
    font-size: 26px;
    color: var(--warn);
    text-transform: uppercase;
  }
  .line,
  .quote {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--text);
  }
  .quote {
    font-style: italic;
    color: var(--text-h);
  }
  .note {
    font-size: 11px;
    color: var(--text-dim);
  }

  /* Victory beat */
  .beat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
    padding: 8px 0;
  }
  .gear {
    width: 110px;
    height: 110px;
    color: #6b7680;
  }
  .gear-body {
    animation: gear-break 1.4s ease-in forwards;
    transform-origin: center;
  }
  .shard {
    opacity: 0;
    animation: shard-fly 1s ease-out 1.1s forwards;
  }
  @keyframes gear-break {
    0% { transform: rotate(0deg); opacity: 1; }
    70% { transform: rotate(40deg) scale(1.05); opacity: 1; }
    100% { transform: rotate(50deg) scale(0.4); opacity: 0; }
  }
  @keyframes shard-fly {
    0% { opacity: 1; transform: rotate(var(--a)) translateY(0); }
    100% { opacity: 0; transform: rotate(var(--a)) translateY(-55px); }
  }
  .villain {
    width: 96px;
    height: 96px;
    object-fit: contain;
    filter: grayscale(0.8) brightness(0.7);
  }

  /* Journey */
  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
  }
  .value {
    font-family: var(--head);
    font-size: 17px;
    color: var(--pos);
  }
  .label {
    font-size: 11px;
    color: var(--text-dim);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .mon {
    width: 70px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 4px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    font-size: 9px;
    color: var(--text-h);
    text-align: center;
  }
  .mon.partner {
    border-color: var(--warn);
  }
  .mon img {
    width: 44px;
    height: 44px;
    object-fit: contain;
  }
  .collection {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    font-size: 12px;
    color: var(--text);
  }
  .collection b {
    color: var(--text-h);
  }
  .split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  /* Map / next */
  .cleared {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .area {
    font-size: 11px;
    padding: 2px 8px;
    color: var(--pos);
    border: 1px solid var(--pos);
  }
  .area.unknown {
    color: var(--text-dim);
    border-color: var(--panel-border);
  }
  .next {
    display: flex;
    gap: 16px;
    align-items: center;
    margin-top: 8px;
    padding: 14px;
    background: var(--panel-2);
    border: 1px dashed var(--panel-border-strong);
  }
  .whamon {
    width: 110px;
    height: 110px;
    object-fit: contain;
    flex-shrink: 0;
  }

  /* Reward */
  .crests {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 6px;
  }
  .crest {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    font-size: 11px;
    color: var(--text-dim);
    border: 1px solid var(--panel-border);
  }
  .crest-mark {
    color: #3a4550;
  }
  .finale-actions {
    display: flex;
    gap: 8px;
  }

  /* Navigation */
  .nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 6px;
    padding-top: 12px;
    border-top: 1px solid var(--panel-border);
  }
  .dots {
    display: flex;
    gap: 6px;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--panel-border);
  }
  .dot.on {
    background: var(--warn);
  }
  .nav-buttons {
    display: flex;
    gap: 6px;
  }
  button {
    appearance: none;
    font: inherit;
    font-size: 12px;
    padding: 6px 14px;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text);
    cursor: pointer;
  }
  button.primary {
    border-color: var(--warn);
    color: var(--text-h);
  }
  button.quiet {
    border-color: transparent;
    color: var(--text-dim);
  }
</style>
