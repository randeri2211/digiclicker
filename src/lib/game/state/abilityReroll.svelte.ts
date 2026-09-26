// Which Digimon the ability reroll dialog (components/AbilityRerollDialog)
// is open for - set from any roster entry menu, shown by App.
export const abilityRerollDialog: { speciesId: string | null } = $state({ speciesId: null });

export function openAbilityReroll(speciesId: string): void {
  abilityRerollDialog.speciesId = speciesId;
}

export function closeAbilityReroll(): void {
  abilityRerollDialog.speciesId = null;
}
