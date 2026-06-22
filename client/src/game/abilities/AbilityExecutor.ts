import type { GameCard } from "../../data/cards";
import type { GameState, ZoneId } from "../gameState";
import { CardManager } from "../engine/CardManager";
import { ZoneManager } from "../engine/ZoneManager";
import type {
  AbilityDefinition,
  AbilityEffectDefinition,
  AbilityExecutionContext,
  AbilityExecutionResult,
  AbilityTarget,
} from "./AbilityTypes";
import { EffectType } from "./Effects";

export class AbilityExecutor {
  executeAbility(
    ability: AbilityDefinition,
    context: AbilityExecutionContext,
  ): AbilityExecutionResult {
    return ability.effects.reduce<AbilityExecutionResult>(
      (result, effect) => ({
        state: this.executeEffect(effect, {
          ...context,
          state: result.state,
        }),
      }),
      { state: context.state },
    );
  }

  private executeEffect(
    effect: AbilityEffectDefinition,
    context: AbilityExecutionContext,
  ): GameState {
    switch (effect.type) {
      case EffectType.DRAW_CARD:
        return this.drawCards(
          context.state,
          effect.playerId ?? context.playerId ?? context.source?.playerId,
          effect.amount ?? 1,
        );
      case EffectType.MOVE_CARD:
        return this.moveTargetCard(context.state, effect.target ?? context.target, effect.zoneId);
      case EffectType.CREATE_TOKEN:
        return ZoneManager.addCardToZone(context.state, effect.token, effect.zoneId);
      case EffectType.MODIFY_STAT:
        return this.modifyTargetStat(
          context.state,
          effect.target ?? context.target,
          effect.stat,
          effect.amount,
        );
      case EffectType.GAIN_POWER:
        return this.modifyTargetStat(
          context.state,
          effect.target ?? context.target,
          "power",
          effect.amount,
        );
      case EffectType.LOSE_POWER:
        return this.modifyTargetStat(
          context.state,
          effect.target ?? context.target,
          "power",
          -effect.amount,
        );
      case EffectType.DEAL_DAMAGE:
      case EffectType.HEAL:
      case EffectType.EXHAUST:
      case EffectType.READY:
        return context.state;
    }
  }

  private drawCards(state: GameState, playerId: string | undefined, amount: number) {
    if (!playerId) {
      return state;
    }

    let nextState = state;

    for (let index = 0; index < amount; index += 1) {
      nextState = CardManager.drawFromDeck(nextState, playerId).state;
    }

    return nextState;
  }

  private moveTargetCard(
    state: GameState,
    target: AbilityTarget | undefined,
    zoneId: ZoneId,
  ) {
    if (!target?.cardInstanceId) {
      return state;
    }

    const card = CardManager.findCard(state, target.cardInstanceId);

    if (!card) {
      return state;
    }

    return ZoneManager.addCardToZone(
      ZoneManager.removeCard(state, target.cardInstanceId),
      card,
      zoneId,
    );
  }

  private modifyTargetStat(
    state: GameState,
    target: AbilityTarget | undefined,
    stat: "cost" | "power" | "health",
    amount: number,
  ) {
    if (!target?.cardInstanceId) {
      return state;
    }

    const updateCard = (card: GameCard): GameCard =>
      card.id === target.cardInstanceId
        ? {
            ...card,
            [stat]: card[stat] + amount,
          }
        : card;

    return {
      ...state,
      hand: state.hand.map(updateCard),
      zones: {
        battlefield1: state.zones.battlefield1.map(updateCard),
        battlefield2: state.zones.battlefield2.map(updateCard),
        base: state.zones.base.map(updateCard),
        trash: state.zones.trash.map(updateCard),
        channeledRunes: state.zones.channeledRunes.map(updateCard),
      },
    };
  }
}
