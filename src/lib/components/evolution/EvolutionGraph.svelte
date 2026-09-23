<script lang="ts">
  import type { RosterEntry, StatBlock, StatRangeBlock } from '../../game/types';
  import { getSpecies, getSpriteUrl, getSpeciesName } from '../../game/images';
  import { levelForXp } from '../../game/combat/levelCurve';
  import {
    roster,
    getDigivolveOptions,
    digivolve,
    automation,
    setPreference,
    clearPreference,
  } from '../../game/state/game.svelte';
  import type { DigivolutionOption } from '../../game/state/game.svelte';
  import { MAX_LEVEL } from '../../game/constants';

  function formatStatBlock(block: StatBlock): string {
    return `ATK ${block.attack} · HP ${block.hp} · SPD ${block.speed} · SPA ${block.specialAttack}`;
  }

  // Ranges are shown instead of a rolled number - the actual roll only
  // happens at the moment of commit (see digivolve.ts), so there's nothing
  // here for the player to preview-reroll by reopening the screen.
  function formatStatRange(block: StatRangeBlock, signed: boolean): string {
    const fmt = ([min, max]: [number, number]) => {
      const lo = Math.round(min);
      const hi = Math.round(max);
      const sign = signed && lo >= 0 ? '+' : '';
      return lo === hi ? `${sign}${lo}` : `${sign}${lo}–${hi}`;
    };
    return `ATK ${fmt(block.attack)} · HP ${fmt(block.hp)} · SPD ${fmt(block.speed)} · SPA ${fmt(block.specialAttack)}`;
  }

  interface Props {
    entry: RosterEntry;
  }

  const { entry }: Props = $props();

  // Options only carry deterministic ranges (no rolls), so re-deriving on
  // every xp change is safe - and needed, since the inherited-bonus range
  // grows with the source's level and `owned` flips after a digivolve
  // (which leaves entry.speciesId unchanged).
  const options = $derived(getDigivolveOptions(entry));
  const currentSpecies = $derived(getSpecies(entry.speciesId));
  const currentName = $derived(getSpeciesName(entry.speciesId));
  const currentSprite = $derived(getSpriteUrl(entry.speciesId));

  function isCommittable(option: DigivolutionOption): boolean {
    return option.requirementMet && option.canImprove;
  }

  // What an owned target's bonus could end up as after an upgrade - each
  // stat keeps the higher of its current value and the roll (see
  // digivolve()), so the outcome range is floored at the current value.
  function upgradeOutcomeRange(range: StatRangeBlock, current: StatBlock): StatRangeBlock {
    const floorAt = ([min, max]: [number, number], cur: number): [number, number] => [
      Math.max(cur, Math.round(min)),
      Math.max(cur, Math.round(max)),
    ];
    return {
      attack: floorAt(range.attack, current.attack),
      hp: floorAt(range.hp, current.hp),
      speed: floorAt(range.speed, current.speed),
      specialAttack: floorAt(range.specialAttack, current.specialAttack),
    };
  }

  function commitDigivolve(option: DigivolutionOption) {
    digivolve(entry, option.species.id);
  }

  // Only one option can be mid-edit at a time (one preference per source
  // species anyway) - nothing is written to the real preference until
  // Confirm, so adjusting the level or backing out costs nothing.
  let pendingPinTargetId: string | null = $state(null);
  let pendingMinLevel: number = $state(0);

  function startPinEdit(option: DigivolutionOption, event: Event) {
    event.stopPropagation();
    const existing = automation.preferences[entry.speciesId];
    pendingPinTargetId = option.species.id;
    pendingMinLevel = existing?.targetSpeciesId === option.species.id ? existing.minLevel : (option.requirement?.minLevel ?? 0);
  }

  function cancelPinEdit(event: Event) {
    event.stopPropagation();
    pendingPinTargetId = null;
  }

  function unpin(event: Event) {
    event.stopPropagation();
    clearPreference(entry.speciesId);
    pendingPinTargetId = null;
  }

  // Confirm is the only moment a preference actually gets written - caps
  // the entered level to MAX_LEVEL, then checks eligibility right away
  // rather than silently waiting for the next kill: if this entry already
  // meets the level just confirmed, try digivolving immediately
  // (digivolve() itself re-checks the real requirement and ownership). A
  // same-target preference is left untouched by digivolve(), so the
  // custom level survives.
  function confirmPin(option: DigivolutionOption, event: Event) {
    event.stopPropagation();
    const clampedLevel = Math.min(Math.max(0, Math.round(pendingMinLevel) || 0), MAX_LEVEL);
    setPreference(entry.speciesId, option.species.id, clampedLevel);
    pendingPinTargetId = null;

    if (levelForXp(entry.xp) >= clampedLevel) {
      digivolve(entry, option.species.id);
    }
  }
</script>

{#snippet optionCard(option: DigivolutionOption)}
  {@const sprite = getSpriteUrl(option.species.id)}
  {@const pinnedPreference = automation.preferences[entry.speciesId]}
  {@const isPinned = pinnedPreference?.targetSpeciesId === option.species.id}
  {@const isEditing = pendingPinTargetId === option.species.id}
  {@const committable = isCommittable(option)}
  <div
    class="option-card"
    class:blocked={!committable}
    class:owned={option.owned}
    onclick={() => committable && commitDigivolve(option)}
    onkeydown={(e) => e.key === 'Enter' && committable && commitDigivolve(option)}
    role="button"
    tabindex="0"
  >
    <div class="option-sprite">
      {#if sprite}
        <img src={sprite} alt="" />
      {:else}
        <span class="no-sprite">{option.species.name}</span>
      {/if}
      {#if option.owned}
        <span class="owned-badge">Owned</span>
      {/if}
    </div>
    <div class="option-name">{option.species.name}</div>
    <div class="option-stage">{option.species.stage} · {option.species.statAffinity}</div>
    {#if option.owned}
      {@const ownedEntry = roster[option.species.id]}
      <div class="option-req">
        {ownedEntry.inheritedFromLevel > 0 ? `Best from Lv ${ownedEntry.inheritedFromLevel}` : 'Never digivolved into'}
      </div>
      <div class="option-growth">Current: {formatStatBlock(ownedEntry.inheritedBonus)}</div>
      {#if option.canImprove}
        <div class="option-bonus">
          Upgrade: {formatStatRange(upgradeOutcomeRange(option.inheritedBonusRange, ownedEntry.inheritedBonus), true)}
        </div>
      {:else}
        <div class="option-req">Can't improve at Lv {levelForXp(entry.xp)}</div>
      {/if}
    {:else}
      <div class="option-bonus">Inherited: {formatStatRange(option.inheritedBonusRange, true)}</div>
      <div class="option-growth">Growth/lvl: {formatStatRange(option.growthPerLevelRange, false)}</div>
    {/if}
    <div class="option-req">
      {#if option.requirement}
        Requires Lv {option.requirement.minLevel}
      {:else}
        No requirements
      {/if}
    </div>
    {#if !option.owned}
      <div class="pin-row">
        {#if isEditing}
          <label class="pin-level">
            Min Lv
            <input
              type="number"
              min="0"
              max={MAX_LEVEL}
              bind:value={pendingMinLevel}
              onclick={(e) => e.stopPropagation()}
            />
          </label>
          <button class="pin-btn confirm" onclick={(e) => confirmPin(option, e)}>Confirm</button>
          <button class="pin-btn" onclick={cancelPinEdit}>Cancel</button>
        {:else if isPinned}
          <span class="pin-btn pinned">Pinned (Lv {pinnedPreference?.minLevel})</span>
          <button class="pin-btn" onclick={(e) => startPinEdit(option, e)}>Edit</button>
          <button class="pin-btn" onclick={unpin}>Unpin</button>
        {:else}
          <button class="pin-btn" onclick={(e) => startPinEdit(option, e)}>Pin</button>
        {/if}
      </div>
    {/if}
  </div>
{/snippet}

<div class="graph">
  <div class="tier-label">Digivolves to</div>
  <div class="tier-row">
    {#if options.length === 0}
      <div class="empty-note">No further digivolutions available.</div>
    {:else}
      {#each options as option (option.species.id)}
        {@render optionCard(option)}
      {/each}
    {/if}
  </div>
  <div class="reset-note">
    Digivolving adds the new form to your roster - or, for one you own, rerolls its inherited bonus and keeps the
    higher value per stat - and resets {currentName} to Lv 1.
  </div>

  <div class="stem"></div>

  <div class="current-card">
    <div class="current-sprite">
      {#if currentSprite}
        <img src={currentSprite} alt="" />
      {:else}
        <span class="no-sprite">{currentName}</span>
      {/if}
    </div>
    <div class="current-name">{currentName}</div>
    <div class="current-meta">
      {currentSpecies?.stage ?? 'Unknown'} · Lv {levelForXp(entry.xp)}
    </div>
    <div class="current-stats">Inherited bonus: {formatStatBlock(entry.inheritedBonus)}</div>
  </div>
</div>

<style>
  .graph {
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    overflow: hidden;
  }
  .tier-label {
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-dim);
    margin: 6px 0;
  }
  .tier-row {
    display: flex;
    gap: 14px;
    padding: 4px 8px 12px;
    overflow-x: auto;
    max-width: 100%;
    border-top: 1px solid var(--panel-border);
  }
  .reset-note {
    max-width: 640px;
    text-align: center;
    font-size: 10px;
    color: var(--text-dim);
    margin-top: 4px;
  }
  .stem {
    width: 1px;
    height: 18px;
    background: var(--panel-border-strong);
  }
  .empty-note {
    font-size: 12px;
    color: var(--text-dim);
    padding: 10px;
  }

  .option-card {
    flex-shrink: 0;
    width: 168px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    cursor: pointer;
    text-align: center;
  }
  .option-card:hover {
    border-color: var(--accent);
  }
  .option-card.blocked {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .option-card.owned {
    border-style: dashed;
  }
  .option-sprite {
    position: relative;
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
  }
  .option-sprite img {
    width: 82%;
    height: 82%;
    object-fit: contain;
  }
  .owned-badge {
    position: absolute;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 8px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--pos);
    background: var(--panel);
    border: 1px solid var(--pos);
    padding: 0 4px;
  }
  .no-sprite {
    font-size: 10px;
    color: var(--text-dim);
    padding: 4px;
    word-break: break-word;
  }
  .option-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-h);
  }
  .option-stage {
    font-size: 10px;
    color: var(--accent);
  }
  .option-bonus {
    font-size: 10px;
    color: var(--pos);
  }
  .option-growth {
    font-size: 9px;
    color: var(--accent);
  }
  .option-req {
    font-size: 9px;
    color: var(--text-dim);
  }
  .pin-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
  }
  .pin-btn {
    appearance: none;
    font: inherit;
    font-family: var(--mono);
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text-dim);
    font-size: 9px;
    padding: 3px 8px;
    cursor: pointer;
  }
  .pin-btn.pinned {
    color: var(--text-h);
    border-color: var(--accent);
    background: var(--accent-soft);
    cursor: default;
  }
  .pin-btn.confirm {
    color: var(--pos);
    border-color: var(--pos);
  }
  .pin-level {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 9px;
    color: var(--text-dim);
  }
  .pin-level input {
    width: 42px;
    font: inherit;
    font-family: var(--mono);
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
    color: var(--text-h);
    padding: 2px 4px;
  }

  .current-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 14px;
    background: var(--accent-soft);
    border: 1px solid var(--panel-border-strong);
  }
  .current-sprite {
    width: 96px;
    height: 96px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--panel-2);
    border: 1px solid var(--panel-border);
  }
  .current-sprite img {
    width: 82%;
    height: 82%;
    object-fit: contain;
  }
  .current-name {
    font-family: var(--head);
    font-size: 16px;
    font-weight: 700;
    color: var(--text-h);
  }
  .current-meta {
    font-size: 12px;
    color: var(--text);
  }
  .current-stats {
    font-size: 11px;
    color: var(--pos);
  }
</style>
