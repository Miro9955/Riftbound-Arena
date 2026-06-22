import type { GameState } from "../gameState";
import { AbilityExecutor } from "./AbilityExecutor";
import { AbilityRegistry, createDefaultAbilityRegistry } from "./AbilityRegistry";
import type {
  AbilityDefinition,
  AbilityExecutionContext,
  TriggerExecutionContext,
} from "./AbilityTypes";

export class AbilityEngine {
  private registry: AbilityRegistry;

  private executor: AbilityExecutor;

  constructor(
    registry: AbilityRegistry = createDefaultAbilityRegistry(),
    executor = new AbilityExecutor(),
  ) {
    this.registry = registry;
    this.executor = executor;
  }

  registerAbility(ability: AbilityDefinition) {
    this.registry.registerAbility(ability);
  }

  executeAbility(abilityId: string, context: AbilityExecutionContext): GameState {
    const ability = this.registry.getAbility(abilityId);

    if (!ability) {
      return context.state;
    }

    return this.executor.executeAbility(ability, context).state;
  }

  executeTrigger(context: TriggerExecutionContext): GameState {
    return this.registry
      .getTriggeredAbilities(context.triggerType)
      .reduce(
        (state, ability) =>
          this.executor.executeAbility(ability, {
            ...context,
            state,
          }).state,
        context.state,
      );
  }
}
