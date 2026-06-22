import type { AbilityDefinition, AbilityId } from "./AbilityTypes";
import { demoAbility } from "./AbilityTypes";
import type { TriggerType } from "./Triggers";

export class AbilityRegistry {
  private abilities = new Map<AbilityId, AbilityDefinition>();

  registerAbility(ability: AbilityDefinition) {
    this.abilities.set(ability.id, ability);
  }

  getAbility(abilityId: AbilityId) {
    return this.abilities.get(abilityId);
  }

  getAbilities() {
    return [...this.abilities.values()];
  }

  getTriggeredAbilities(triggerType: TriggerType) {
    return this.getAbilities().filter((ability) => ability.trigger?.type === triggerType);
  }
}

export function createDefaultAbilityRegistry() {
  const registry = new AbilityRegistry();

  registry.registerAbility(demoAbility);

  return registry;
}
