# Riftbound Rules Implementation Plan

Source of truth: **Riftbound Core Rules**, official gameplay guide PDF linked from the Riftbound Rules and Releases article, last updated in the PDF as `2025-12-01` and linked on the official page as `Download Core Rules - Last Updated: 2025-12-04`.

This plan summarizes the rules into technical implementation phases. It intentionally does not implement rules yet.

## 1. Game Setup

Relevant rule sections:

- `101-103`: deck construction.
- `106-107`: board and non-board zones.
- `110-118`: setup process.
- `458-466`: mode-specific setup and first-turn adjustments.

Required `GameState` changes:

- Add explicit player records for:
  - champion legend.
  - chosen champion.
  - main deck.
  - rune deck.
  - hand.
  - trash.
  - banishment.
  - base.
  - champion zone.
  - legend zone.
  - score.
  - provided battlefields.
  - selected battlefields.
- Add mode configuration:
  - mode id.
  - player count.
  - team structure.
  - victory score.
  - battlefield count.
  - first-turn modifiers.
- Add setup status:
  - decks validated.
  - battlefields selected.
  - turn order determined.
  - setup complete.

Required `GameEngine` methods:

- `validateDeck(playerId, decklist)`
- `setMode(modeConfig)`
- `registerPlayer(playerConfig)`
- `selectBattlefield(playerId, battlefieldId)`
- `determineTurnOrder(methodResult)`
- `startGame()`
- `completeSetup()`

Required UI changes:

- Deck selection/import screen.
- Setup validation feedback.
- Champion legend and chosen champion selection.
- Battlefield selection flow based on mode.
- First player / turn order confirmation.
- Setup progress state before board play begins.

Risks / edge cases:

- Main deck must be at least 40 cards and obey copy limits.
- Rune deck must contain exactly 12 rune cards.
- Domain identity depends on champion legend.
- Chosen champion must match the champion tag of the champion legend.
- Signature card limits depend on champion tag, not only card name.
- Battlefield selection differs by mode.
- Current app treats `GameCard.id` as an instance id; setup needs real card instances.
- Current app has one shared hand/zones model; setup needs player-scoped zones.

Suggested tests:

- Reject main deck below minimum size.
- Reject rune deck not exactly 12 cards.
- Reject cards outside legend domain identity.
- Reject too many copies of a named card.
- Reject invalid chosen champion.
- Reject invalid signature card count/tag.
- Build valid setup for 1v1 Duel.
- Build valid setup for 3-player and 4-player modes.

## 2. Mulligan

Relevant rule sections:

- `116`: each player draws 4 during setup.
- `117-117.3`: mulligan process in turn order.
- `403`: recycle.
- `115`: turn order.

Required `GameState` changes:

- Track setup hands per player.
- Track mulligan status per player.
- Track cards set aside for mulligan.
- Track whose mulligan decision is pending.
- Track turn order before normal play starts.

Required `GameEngine` methods:

- `drawStartingHands()`
- `beginMulligan()`
- `chooseMulliganCards(playerId, cardInstanceIds)`
- `resolveMulligan(playerId)`
- `advanceMulliganPlayer()`

Required UI changes:

- Show starting hand to each local player.
- Allow choosing up to two cards.
- Confirm mulligan.
- Hide/private hand information appropriately in multiplayer.
- Show mulligan progress for other players.

Risks / edge cases:

- Mulligan happens in turn order.
- Player may choose zero, one, or two cards.
- Set-aside cards are recycled after replacement draw.
- Recycle order/randomization differs for main deck versus rune deck.
- Privacy matters for local multiplayer/networked play.

Suggested tests:

- Each player starts with 4 cards.
- Player can mulligan 0, 1, or 2 cards.
- Player cannot mulligan more than 2 cards.
- Replacement cards are drawn before set-aside cards are recycled.
- Mulligan proceeds in turn order.

## 3. Turn Structure

Relevant rule sections:

- `300-306`: turn overview.
- `307-313`: neutral/showdown and open/closed states, priority, focus.
- `314-317`: phases of the turn.
- `318-323`: cleanup.
- `325-336`: chains.

Required `GameState` changes:

- Replace simplified phase model with official structure:
  - start of turn.
  - awaken phase.
  - beginning phase.
  - scoring step.
  - channel phase.
  - draw phase.
  - action phase.
  - combat/showdown sub-phases.
  - end of turn.
  - cleanup.
  - expiration.
- Track:
  - turn player.
  - active player for chain/showdown.
  - priority holder.
  - focus holder.
  - neutral/showdown state.
  - open/closed state.
  - chain items.
  - staged showdowns.
  - staged combats.
  - cleanup queue.

Required `GameEngine` methods:

- `advancePhase()`
- `enterCleanup(reason)`
- `resolveCleanup()`
- `passPriority(playerId)`
- `grantPriority(playerId)`
- `openChain(item)`
- `resolveChain()`
- `beginActionPhase()`
- `endActionPhase(playerId)`
- `endTurn()`

Required UI changes:

- Phase indicator.
- Priority/pass controls.
- Chain display.
- Pending decision prompts.
- Cleanup/trigger resolution indicators.
- End turn button tied to legal timing.

Risks / edge cases:

- The current `TURN_START/DRAW/MAIN/END` model is too coarse.
- Cleanup can recursively cause more cleanups.
- Multiple simultaneous actions/triggers must be ordered by turn order.
- Chain creates closed state and changes legal actions.
- Showdowns introduce focus separate from normal priority.

Suggested tests:

- Phase sequence follows official order.
- Draw phase draws one card and clears rune pools at end.
- Action phase grants priority to turn player.
- End of turn heals units and expires this-turn effects later.
- Cleanup runs after phase transitions and board changes.
- Closed state prevents non-reaction actions.

## 4. Runes And Resources

Relevant rule sections:

- `103.3`: rune deck construction.
- `156-164`: runes, energy, power, rune pools.
- `315.3`: channel phase.
- `416`: Add.
- `417`: Channel.
- `163`, `315.4.d`, `317.3.b`: rune pool emptying.

Required `GameState` changes:

- Per-player rune deck.
- Per-player channeled runes on board.
- Rune ready/exhausted state.
- Rune pool:
  - energy.
  - power by domain.
  - universal power.
- Track runes channeled this turn.
- Track mode first-turn channel modifiers.

Required `GameEngine` methods:

- `channelRunes(playerId, count, options?)`
- `addEnergy(playerId, amount)`
- `addPower(playerId, domain, amount)`
- `spendResources(playerId, cost)`
- `emptyRunePool(playerId)`
- `recycleRune(playerId, runeInstanceId)`

Required UI changes:

- Rune deck and channeled rune display.
- Rune exhaustion/readiness.
- Rune pool display.
- Payment picker for power domains.
- Resource payment confirmation during card play.

Risks / edge cases:

- Runes are not main deck cards.
- Rune deck is separate and secret.
- Basic runes have two resource abilities.
- Rune pool empties at multiple official timings.
- First-turn channel modifiers differ by mode/player position.
- Domain-specific power payment needs exact typing.

Suggested tests:

- Channel two runes during channel phase.
- Channel fewer if rune deck has fewer than requested.
- Add energy from exhausted rune.
- Recycle rune to add domain power.
- Rune pool empties at draw phase end.
- Rune pool empties at turn end.

## 5. Playing Cards

Relevant rule sections:

- `132`: card categories.
- `140-155`: units, gear, spells.
- `346-356`: playing cards process.
- `386-394`: playing or activating abilities.
- `398-406`: actions, draw, play.
- `352`: choices and targeting.
- `353-354`: cost determination/payment.
- `355`: legality check.

Required `GameState` changes:

- Card instances separate from card definitions.
- Chain items:
  - pending.
  - finalized.
  - source card/ability.
  - controller.
  - choices.
  - targets.
  - computed costs.
- Cost model:
  - base energy.
  - base power requirements.
  - additional costs.
  - increases.
  - discounts.
  - ignored costs.
- Per-turn cards played history for Legion and similar checks.
- Legal locations for units/gear.

Required `GameEngine` methods:

- `beginPlayCard(playerId, cardInstanceId)`
- `choosePlayOptions(command)`
- `determineTotalCost(playContext)`
- `payCosts(playContext)`
- `checkPlayLegality(playContext)`
- `finalizePlay(playContext)`
- `resolveSpell(chainItemId)`
- `activateAbility(playerId, abilityId)`

Required UI changes:

- Play card flow with target/location selection.
- Cost preview.
- Resource payment UI.
- Chain display.
- Invalid target/cost feedback.
- Spell resolution prompts.

Risks / edge cases:

- Playing a card is a multi-step transaction, not one state mutation.
- Units choose location as part of play.
- Gear enters base ready.
- Units enter board exhausted unless modified.
- Spells linger on chain, resolve, then go to trash.
- Some targets may become illegal before resolution.
- If legality fails, the play action is undone.
- Reactions can be played during closed states.

Suggested tests:

- Unit enters chosen legal location exhausted.
- Gear enters base ready.
- Spell resolves then goes to owner trash.
- Illegal target cancels or mistargets according to process.
- Cost increases and discounts apply in correct order.
- Reaction can be played in closed state.

## 6. Battlefields

Relevant rule sections:

- `103.4`: battlefield deckbuilding.
- `106.3-106.4`: battlefield zone and facedown zones.
- `165-183`: battlefields and control concepts.
- `423-431`: movement, contested status, staged showdown/combat.
- `445-449`: scoring.
- `458-466`: mode battlefield counts and placement.

Required `GameState` changes:

- Battlefield instances with:
  - owner.
  - controller or uncontrolled.
  - occupants by player.
  - facedown zone.
  - contested status.
  - scored-this-turn markers.
  - held-at-beginning markers for team restrictions.
- Mode-selected battlefield list.
- Battlefield adjacency/position if needed for multiplayer layout.

Required `GameEngine` methods:

- `selectBattlefieldsForMode(mode)`
- `moveUnit(unitId, destinationBattlefieldId)`
- `applyContested(battlefieldId, sourcePlayerId)`
- `establishControl(battlefieldId, playerId)`
- `clearBattlefieldTurnScoreFlags()`
- `hideCard(playerId, cardInstanceId, battlefieldId)`

Required UI changes:

- Real battlefield cards on board.
- Per-battlefield control indicator.
- Units grouped under battlefield by controller.
- Facedown card slot per battlefield.
- Score/conquer/hold indicators.

Risks / edge cases:

- Battlefields are locations and cannot be moved.
- Facedown zones have max one card and depend on battlefield control.
- Control and contested status are driven by movement/cleanup.
- 3+ player modes restrict entering staged/in-progress combat battlefields.
- Team modes modify scoring eligibility.

Suggested tests:

- 1v1 Duel selects correct battlefield count.
- Battlefield becomes contested when enemy unit enters.
- Empty uncontrolled battlefield showdown is staged.
- Battlefield with opposing units stages combat.
- Control changes after combat resolution.
- Facedown card removed when controller loses control.

## 7. Combat

Relevant rule sections:

- `316.4-316.5`: combat and showdown during action phase.
- `437-444`: combat staging and steps.
- `307-313`: priority/focus during showdown.
- `423-431`: movement causing combat/showdown.
- `376.4.d-e`: attack and defend triggers.

Required `GameState` changes:

- Combat state:
  - battlefield id.
  - attacker player.
  - defender player.
  - attacking unit ids.
  - defending unit ids.
  - staged/in-progress/resolved.
- Showdown state:
  - focus holder.
  - open/closed state.
  - initial chain.
- Damage assignment state.
- Per-combat trigger memory for attack/defend once-per-combat constraints.

Required `GameEngine` methods:

- `stageCombat(battlefieldId)`
- `beginCombat(battlefieldId)`
- `beginShowdown(combatId)`
- `assignCombatDamage(playerId, assignments)`
- `dealAssignedCombatDamage(combatId)`
- `resolveCombat(combatId)`
- `cleanupCombat(combatId)`

Required UI changes:

- Combat modal or battlefield-focused panel.
- Attacker/defender labels.
- Showdown priority/pass controls.
- Damage assignment UI.
- Combat resolution animation/log.

Risks / edge cases:

- Combat only occurs between exactly two players.
- Multiple staged combats are ordered by turn player.
- Attack/defend designations can change due to cleanup.
- Showdown has its own focus/priority behavior.
- Damage assignment has lethal assignment restrictions.
- Stunned units do not contribute might but still need full might damage to be killed.

Suggested tests:

- Moving into enemy battlefield stages combat.
- Multiple staged combats prompt turn player ordering.
- Attack and defend triggers fire once per combat.
- Damage assignment enforces lethal ordering.
- Assigned damage is dealt simultaneously.
- Combat cleanup heals and recalls as required.

## 8. Damage And Defeat

Relevant rule sections:

- `141-142`: damage and unit might.
- `404-405`: deal and heal.
- `415`: kill.
- `418`: burn out.
- `322`: cleanup lethal damage checks.
- `443`: combat damage.
- `649-651`: conceding.

Required `GameState` changes:

- Damage per unit instance.
- Killed-by/source tracking.
- Pending death/kill events.
- Trash per player.
- Burn out state and opponent point choice.
- Player eliminated/conceded status.

Required `GameEngine` methods:

- `dealDamage(source, assignments)`
- `healDamage(targets, amount | all)`
- `checkLethalDamage()`
- `killPermanent(cardInstanceId, source)`
- `burnOut(playerId, opponentId)`
- `concede(playerId)`

Required UI changes:

- Damage counters on units.
- Kill/death log.
- Burn out opponent-choice prompt.
- Concede control.
- Defeat/victory overlay.

Risks / edge cases:

- Damage is marked and later healed; it is not a permanent stat change.
- Lethal damage is checked in cleanup.
- Kill is not move and not discard.
- Deathknell can trigger before card moves to trash.
- Burn out is a replacement effect and may repeat.
- Defeat may be individual or team-based depending on mode.

Suggested tests:

- Damage below might does not kill.
- Damage equal to current might kills during cleanup.
- Might below zero is treated as zero for purposes that need current might.
- End of turn heals units.
- Combat cleanup heals units.
- Burn out recycles trash and gives point to chosen opponent.

## 9. Scoring / Victory

Relevant rule sections:

- `315.2.b`: scoring step.
- `444.2`: establish control after combat.
- `445-449`: scoring and victory.
- `460.3`: victory score by mode.
- `466.8`: team scoring adjustments.

Required `GameState` changes:

- Player/team score.
- Victory score from mode.
- Per-battlefield scored-this-turn records.
- Control history for beginning-phase team restrictions.
- Game result:
  - winner player/team.
  - reason.

Required `GameEngine` methods:

- `scoreHold(playerId, battlefieldId)`
- `scoreConquer(playerId, battlefieldId)`
- `checkVictory()`
- `markBattlefieldScored(playerId, battlefieldId)`
- `resetScoredThisTurn()`

Required UI changes:

- Scoreboard.
- Battlefield score markers.
- Victory banner.
- Team score display for 2v2.

Risks / edge cases:

- A player scores at most once per battlefield per turn.
- Final point has special restrictions for conquer.
- Hold and conquer trigger different battlefield abilities.
- Points from non-score sources may bypass final-point restrictions.
- Team modes share win/loss but not control.

Suggested tests:

- Holding during beginning phase scores.
- Conquering scores if battlefield not already scored by that player this turn.
- Cannot score same battlefield twice in one turn.
- Victory occurs immediately at victory score.
- Final point from conquer requires scoring every battlefield that turn.
- Team final point restrictions apply.

## 10. Card Effects And Timing

Relevant rule sections:

- `357-385`: ability types, passive abilities, replacement effects, triggered abilities, delayed abilities.
- `386-394`: playing or activating abilities.
- `326-336`: chain.
- `450-457`: layers.
- `054-055`: can/can't and do-as-much-as-possible rules.
- `352`: targets and choices.

Required `GameState` changes:

- Ability definitions parsed from card data.
- Active passive effects.
- Replacement effects.
- Trigger registry.
- Delayed effects.
- Chain item queue.
- Layered continuous effects with timestamps/dependencies.
- Pending choices.
- Effect execution context:
  - source.
  - controller.
  - targets.
  - remembered values.

Required `GameEngine` methods:

- `registerCardAbilities(cardInstanceId)`
- `evaluateTriggers(event)`
- `queueTriggeredAbility(abilityId)`
- `applyReplacementEffects(eventIntent)`
- `resolveChainItem(chainItemId)`
- `recalculateContinuousEffects()`
- `promptChoice(choiceRequest)`
- `resolveChoice(choiceResponse)`

Required UI changes:

- Pending trigger display.
- Target selection.
- Choice dialogs.
- Chain stack.
- Effect log.
- Highlight legal targets/actions.

Risks / edge cases:

- Trigger conditions are evaluated after inciting events.
- Simultaneous triggers ordered by controller/turn order.
- Replacement effects intercede before event execution.
- Layer dependencies and timestamps are complex.
- Do-as-much-as-possible behavior must be consistent.
- Card text can supersede rules.
- Inactive rules/effect text matters for attachments.

Suggested tests:

- Passive effect applies only while active.
- Replacement effect modifies an event before commit.
- Multiple replacement effects ask affected owner/player for order.
- Triggered ability queues after event.
- Simultaneous triggers ordered correctly.
- Layer arithmetic applies after trait/ability changes.
- This-turn effects expire at expiration step.

## 11. Keywords

Relevant rule sections:

- `134.2.c`: keywords in rules text.
- `155`: spell timing keywords.
- `726-740+`: keyword glossary.
- Notable keywords in current Core Rules include Accelerate, Action, Assault, Deathknell, Deflect, Ganking, Hidden, Legion, Reaction, Shield, and more beyond the excerpted range.

Required `GameState` changes:

- Keyword model on card definitions and card instances.
- Granted/removed keyword effects with duration.
- Keyword parameters, such as Assault X, Shield X, Deflect X.
- Keyword-derived permissions and replacement/passive/triggered effects.
- Inactive keyword visibility state.

Required `GameEngine` methods:

- `hasKeyword(cardInstanceId, keyword)`
- `grantKeyword(cardInstanceId, keyword, duration)`
- `removeKeyword(cardInstanceId, keyword, duration)`
- `getKeywordValue(cardInstanceId, keyword)`
- `applyKeywordRules(cardInstanceId)`

Required UI changes:

- Keyword badges/tooltips.
- Show temporary granted/lost keywords.
- Display hidden/facedown cards correctly.
- Show keyword-derived legal actions.

Risks / edge cases:

- Some keywords are permissions, some are passive modifiers, some are triggers.
- Multiple instances may be redundant or additive depending on keyword.
- Keywords can be present but inactive.
- Hidden changes privacy and grants facedown reaction permission.
- Legion depends on play history.
- Deathknell timing interacts with kill and trash movement.

Suggested tests:

- Action allows play during showdown open state.
- Reaction allows play during closed state.
- Assault/Shield values add when granted by multiple sources.
- Ganking expands standard move destinations.
- Deflect adds mandatory additional cost.
- Deathknell queues before permanent moves to trash.
- Hidden card targeting restrictions apply.

## 12. Multiplayer / Free-For-All / Teams

Relevant rule sections:

- `115`: turn order.
- `316.2.b.1-316.2.c`: teammates acting during action phase.
- `437-440`: combat with more than two players.
- `458-466`: modes of play.
- `649-651`: conceding.

Required `GameState` changes:

- Mode definition object:
  - 1v1 Duel.
  - 1v1 Match.
  - FFA3.
  - FFA4.
  - 2v2.
- Team membership.
- Opponent relationships.
- Seating/turn order.
- Team score/win state.
- Per-player and per-team restrictions.
- Multiplayer battlefield placement.

Required `GameEngine` methods:

- `createModeState(modeId, players)`
- `getOpponents(playerId)`
- `getTeammates(playerId)`
- `advanceTurnOrder()`
- `applyModeFirstTurnAdjustments(playerId)`
- `handleConcede(playerId)`
- `checkTeamVictory(teamId)`

Required UI changes:

- Mode selector.
- Multiplayer seating/turn order view.
- Team score display.
- Opponent/teammate labels.
- Network-ready privacy model for hands/decks.
- Battlefield layout variants for 3/4 players and teams.

Risks / edge cases:

- Combat can only involve exactly two players.
- Battlefields with staged/in-progress combat restrict third-party movement.
- 2v2 alternates teams in turn order.
- Teammates may play spells during teammate turns in 2v2.
- Control is not shared between teammates.
- Teammates cannot use the same champion legend or battlefields.
- Concession can eliminate a team.

Suggested tests:

- 1v1 Duel sets victory score 8 and two battlefields.
- FFA3 sets three players and three battlefields.
- FFA4 excludes first player's battlefields from setup.
- 2v2 turn order alternates teams.
- Team victory score is 11.
- Teammate-controlled battlefield is disqualified from specific scoring cases.
- Third player cannot enter staged combat battlefield.

## Cross-Cutting Architecture Work Before Rule Implementation

Before implementing official rules, prioritize:

1. Separate `CardDefinition` from `CardInstance`.
2. Replace shared `hand` and `zones` with player-scoped zone state.
3. Add deterministic RNG for shuffle, battlefield selection, and replay.
4. Introduce a command pipeline:
   - validate.
   - choose.
   - pay.
   - commit.
   - cleanup.
   - emit.
5. Persist command and event logs.
6. Add selectors for legal actions and derived stats.
7. Add automated tests before implementing card effects.

The current prototype is useful for UI and movement, but official rules require a deterministic, player-scoped, event-driven rules engine before combat, timing, and card text can be safely implemented.
