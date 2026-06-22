# Riftbound Rule Specification

Source of truth: official **Riftbound Core Rules** PDF from the Riftbound Rules and Releases page. This document translates the Core Rules into engine behavior. It does not copy the rulebook text and does not implement rules.

Notation:

- `GameState` means authoritative engine state.
- `CardDefinition` means immutable printed card data.
- `CardInstance` means a specific in-game object/card copy.
- Events listed here are intended engine events, not all currently implemented events.

## Golden And Silver Rules

### Rule: Card Text Overrides Rules

- Rule section: `000-055`
- Trigger: Any rules conflict during validation or resolution.
- Preconditions: A card effect contradicts or modifies a default rule.
- Action: Apply card text over the default rule unless a higher-priority prohibition applies.
- Result: The engine resolves according to the card-specific instruction.
- Events emitted: None by default; emit the underlying action event.
- Ability triggers: Same as the underlying action.
- Edge cases: “Can’t” effects override permissive effects. Impossible instructions are skipped while possible instructions still resolve.
- Multiplayer considerations: Apply from the perspective of the affected object/player; if multiple players are affected, resolve choices in turn order where required.

### Rule: Rules Text Terminology

- Rule section: `050-055`
- Trigger: Parsing or executing card text.
- Preconditions: Card text references “card,” “I,” “me,” “this,” or “here.”
- Action: Normalize text references into engine entities: source card, source object, current battlefield, or main deck card.
- Result: Effects target the correct source/context.
- Events emitted: None.
- Ability triggers: None directly.
- Edge cases: “Card” in effects refers to main deck cards, not runes, legends, or battlefields, unless the rules context says otherwise.
- Multiplayer considerations: Pronouns resolve by controller/source, not by local UI perspective.

## Deck Construction And Setup

### Rule: Deck Construction

- Rule section: `101-103`
- Trigger: Deck import, deck validation, or match setup.
- Preconditions: Player provides champion legend, chosen champion, main deck, rune deck, and battlefields required by mode.
- Action: Validate deck size, copy limits, domain identity, chosen champion legality, signature limits, rune deck size, and battlefield constraints.
- Result: Player deck is accepted or rejected with validation errors.
- Events emitted: `DeckValidated`, `DeckRejected`.
- Ability triggers: None.
- Edge cases: Chosen champion counts toward named-card copy limits. Cards with multiple domains require all domains to be inside identity. Signature limit is by champion tag, not card name alone.
- Multiplayer considerations: Team modes may restrict duplicate champion legends and battlefields among teammates.

### Rule: Setup Zones

- Rule section: `104-109`
- Trigger: Game setup begins.
- Preconditions: Decks are valid and mode is selected.
- Action: Create player-scoped zones: base, legend zone, champion zone, main deck zone, rune deck zone, hand, trash, banishment. Create shared or mode-defined battlefield zone.
- Result: Initial zone graph exists in `GameState`.
- Events emitted: `ZonesCreated`.
- Ability triggers: None.
- Edge cases: Trash/banishment/hand are player-owned. Cards cannot be placed into another player’s private/non-board zones unless rules redirect them to owner zones.
- Multiplayer considerations: Each player has separate non-board zones; battlefields may be shared depending on mode.

### Rule: Setup Process

- Rule section: `110-118`
- Trigger: `startGameSetup`.
- Preconditions: Valid player configs and mode config.
- Action: Place champion legends and chosen champions, set aside battlefields, shuffle main and rune decks separately, determine turn order, draw starting hands, perform mulligans in turn order, then start first turn.
- Result: Game enters first player’s turn after setup.
- Events emitted: `GameSetupStarted`, `DeckShuffled`, `TurnOrderDetermined`, `StartingHandDrawn`, `MulliganStarted`, `GameStarted`.
- Ability triggers: None unless future card text explicitly triggers during setup.
- Edge cases: Battlefield selection is mode-specific. First-turn adjustments are mode-specific.
- Multiplayer considerations: Turn order is a repeating ordered list; seating or mode rules determine order after first player.

### Rule: Mulligan

- Rule section: `117-117.3`
- Trigger: `MulliganStarted` for each player in turn order.
- Preconditions: Player has starting hand.
- Action: Player may set aside up to two cards, draw the same number, then recycle the set-aside cards.
- Result: Player has replacement hand; recycled cards return to corresponding deck.
- Events emitted: `CardsSetAsideForMulligan`, `CardDrawn`, `CardsRecycled`, `MulliganCompleted`.
- Ability triggers: `ON_DRAW` only if setup draws are intended to trigger; TODO: confirm whether setup draw/mulligan draw can trigger abilities from Core Rules section `117`.
- Edge cases: Player may choose zero cards. Recycle behavior differs for main deck cards and runes.
- Multiplayer considerations: Mulligans occur in turn order; hand privacy must be preserved.

## Cards, Objects, And Information

### Rule: Game Objects

- Rule section: `119-123`
- Trigger: Any object enters, leaves, or acts in game.
- Preconditions: Entity is represented as card, token, rune, battlefield, legend, ability, or other logical object.
- Action: Track object identity, controller, owner, zone, state, and game-relevant properties.
- Result: Object can produce effects or grant action prerequisites.
- Events emitted: `ObjectCreated`, `ObjectUpdated`, `ObjectRemoved`.
- Ability triggers: Depends on object movement/state changes.
- Edge cases: Some objects are logical, not physical cards.
- Multiplayer considerations: Ownership and control are distinct and may belong to different players.

### Rule: Ownership

- Rule section: `126`
- Trigger: Card enters game or changes zones.
- Preconditions: Card belongs to a player’s deck, champion legend, battlefield pool, or token creator.
- Action: Assign stable owner and maintain it through zone changes.
- Result: Owner-based redirects and private-zone rules work.
- Events emitted: None directly.
- Ability triggers: None directly.
- Edge cases: Owner trash/hand/banishment redirects override attempted placement into another player’s equivalent zone.
- Multiplayer considerations: Owner is not necessarily controller.

### Rule: Privacy

- Rule section: `127-129`
- Trigger: Rendering, reveal, targeting, or zone movement.
- Preconditions: Card is in a zone with secret/private/public information status.
- Action: Expose only information allowed by zone state and controller/owner.
- Result: UI and network payloads preserve hidden information.
- Events emitted: `CardRevealed`, `CardHidden`.
- Ability triggers: Reveal-related triggers where applicable.
- Edge cases: Facedown cards on board are private front-face information. Trash is public.
- Multiplayer considerations: Server must filter state per viewer.

### Rule: Card Traits

- Rule section: `130-138`
- Trigger: Card definition import or effect queries.
- Preconditions: Card has name, cost, category, domain, rules text, effect text, might bonus, flavor text, and illustration.
- Action: Store printed values separately from mutable instance state.
- Result: Rules can query base values and derived values correctly.
- Events emitted: None.
- Ability triggers: None.
- Edge cases: Flavor and illustration have no gameplay effect. Effect text is inactive unless attached.
- Multiplayer considerations: Public/private visibility depends on zone.

## Card Categories

### Rule: Units

- Rule section: `139-144`
- Trigger: Unit is played, moved, damaged, readied/exhausted, or activated.
- Preconditions: Card instance type is unit.
- Action: Units on board are permanents at base or battlefield locations, enter exhausted by default, can mark damage, can move using standard move, and can have activated abilities.
- Result: Unit participates in board, movement, combat, damage, and ability systems.
- Events emitted: `UnitEntered`, `UnitMoved`, `UnitDamaged`, `UnitKilled`, `UnitReadied`, `UnitExhausted`.
- Ability triggers: Attack, defend, damage, death, play, move, ready/exhaust triggers.
- Edge cases: Current might below zero is treated as zero. Damage equal to nonzero current might kills during cleanup.
- Multiplayer considerations: Units at shared battlefields can create contested/combat states with opposing players.

### Rule: Gear

- Rule section: `145-148`
- Trigger: Gear is played, attached, detached, killed, or found at battlefield.
- Preconditions: Card instance type is gear.
- Action: Gear enters base ready, can be killed, can have activated abilities, can attach through effects, and is recalled from battlefields if unattached.
- Result: Gear exists as board permanent or attached card with effect text/might bonus behavior.
- Events emitted: `GearEntered`, `GearAttached`, `GearDetached`, `GearRecalled`, `GearKilled`.
- Ability triggers: Play, attach, detach, kill, activated ability triggers.
- Edge cases: Gear at battlefield is recalled during cleanup unless attached rules say otherwise.
- Multiplayer considerations: Gear controller and attached top-most card controller can differ.

### Rule: Spells

- Rule section: `149-155`
- Trigger: Spell is played.
- Preconditions: Spell is legally timed and costs can be paid.
- Action: Place spell on chain, finalize, allow reactions, resolve text top-to-bottom, then put spell in owner trash.
- Result: Spell effect is applied and spell leaves chain.
- Events emitted: `SpellPlayed`, `SpellFinalized`, `SpellResolved`, `CardMovedToTrash`.
- Ability triggers: Play triggers after successful resolution; reaction/timing triggers as appropriate.
- Edge cases: Illegal targets at resolution cause affected instructions to be skipped, not necessarily entire spell. Countered spells are not played.
- Multiplayer considerations: Opponents may respond with reactions depending on chain/priority.

### Rule: Runes

- Rule section: `156-164`
- Trigger: Rune deck construction, channel, add resource, recycle.
- Preconditions: Rune card exists in rune deck or on board.
- Action: Channel runes to board, exhaust/recycle runes to add energy or power, track rune pool, empty rune pool at specified timings.
- Result: Player gains and spends resources.
- Events emitted: `RuneChanneled`, `ResourceAdded`, `ResourceSpent`, `RuneRecycled`, `RunePoolEmptied`.
- Ability triggers: Channel, add, recycle, resource-spend triggers.
- Edge cases: Rune deck must be exactly 12. Runes are not main deck cards. Recycled runes return to rune deck.
- Multiplayer considerations: Rune pool is per player and empties for all players at specified timings.

### Rule: Battlefields

- Rule section: `165-183`, `445-449`
- Trigger: Setup, movement, control change, scoring.
- Preconditions: Battlefield selected for mode and placed in battlefield zone.
- Action: Track owner, controller, contested status, occupants, facedown zone, score eligibility, and control changes.
- Result: Battlefields become locations for movement/combat/scoring.
- Events emitted: `BattlefieldEntered`, `BattlefieldContested`, `BattlefieldControlled`, `BattlefieldScored`.
- Ability triggers: Conquer, hold, score, battlefield-specific triggers.
- Edge cases: Battlefields cannot be moved or killed during regular play. Facedown slots have occupancy/control restrictions.
- Multiplayer considerations: Battlefield count and placement differ by mode; team scoring has special restrictions.

### Rule: Tokens

- Rule section: `173` and related token references.
- Trigger: Effect creates a token.
- Preconditions: Effect defines token characteristics and destination.
- Action: Create token instance with owner/controller/source metadata.
- Result: Token behaves by its type while in valid zones.
- Events emitted: `TokenCreated`, `ObjectCreated`.
- Ability triggers: Enter/play/create triggers as specified by source effect.
- Edge cases: Tokens are not cards but may be played or exist as game objects where rules permit.
- Multiplayer considerations: Token owner/controller usually source controller unless effect says otherwise.

## Turn And Timing

### Rule: Turn Progression

- Rule section: `300-306`
- Trigger: Game starts or current phase ends.
- Preconditions: No pending mandatory action prevents advancement.
- Action: Advance through phases and turn order until a player/team wins.
- Result: Active turn player changes after end-of-turn sequence.
- Events emitted: `PhaseChanged`, `TurnStarted`, `TurnEnded`.
- Ability triggers: `TURN_START`, phase-specific triggers, `TURN_END`.
- Edge cases: Actions are performed one at a time. Simultaneous triggers are ordered by turn order.
- Multiplayer considerations: Turn order is repeating and mode-defined.

### Rule: Turn State

- Rule section: `307-310`
- Trigger: Chain or showdown opens/closes.
- Preconditions: Game is in regular play.
- Action: Derive state as neutral/showdown and open/closed.
- Result: Legal action set changes.
- Events emitted: `TurnStateChanged`.
- Ability triggers: Timing-based effects may trigger from state changes.
- Edge cases: Closed state exists while chain exists. Showdown state exists while showdown is in progress.
- Multiplayer considerations: Teammate permissions can differ during action phase/showdowns.

### Rule: Priority And Focus

- Rule section: `311-313`
- Trigger: Action phase, showdown, closed-state reaction window, chain resolution.
- Preconditions: Game timing grants a player permission to act.
- Action: Assign priority/focus according to timing and turn order.
- Result: Only permitted player(s) can take discretionary actions.
- Events emitted: `PriorityChanged`, `FocusChanged`.
- Ability triggers: None directly.
- Edge cases: Focus can remain while priority passes. Neutral state has no focus.
- Multiplayer considerations: Closed-state priority may pass by turn order; teammates have special spell permissions.

### Rule: Start Of Turn

- Rule section: `314-315.3`
- Trigger: New turn begins.
- Preconditions: Turn player is set.
- Action: Ready controlled ready-able objects, process beginning/scoring step, channel runes.
- Result: Turn player begins with refreshed board, possible points, and additional runes.
- Events emitted: `TurnStarted`, `ObjectsReadied`, `ScoreChecked`, `RunesChanneled`.
- Ability triggers: Beginning, hold, channel, ready triggers.
- Edge cases: Channel fewer if rune deck has fewer than required. Team scoring restrictions can disqualify battlefields.
- Multiplayer considerations: Holding/scoring considers control and team-specific disqualification.

### Rule: Draw Phase

- Rule section: `315.4`, `400`, `418`
- Trigger: Draw phase starts.
- Preconditions: Turn player exists.
- Action: Turn player gains turn card and draws one; if deck insufficient, perform burn out sequence.
- Result: Card moves from main deck to hand or burn out resolves first.
- Events emitted: `CardDrawn`, `BurnOutStarted`, `BurnOutResolved`, `RunePoolEmptied`.
- Ability triggers: `ON_DRAW`, burn out related triggers if any.
- Edge cases: Empty main deck causes burn out, recycle trash, opponent gains point, then draw continues.
- Multiplayer considerations: Burn out requires choosing an opponent to gain a point.

### Rule: Action Phase

- Rule section: `316`, `398`
- Trigger: Start-of-turn sequence completes.
- Preconditions: Turn state is neutral open unless chain/showdown is created.
- Action: Turn player may take any legal discretionary actions until they pass/end.
- Result: Cards, moves, abilities, combat/showdowns may occur.
- Events emitted: `ActionPhaseStarted`, `ActionTaken`, `ActionPhaseEnded`.
- Ability triggers: Depends on actions taken.
- Edge cases: Structured phases such as combat can occur during action phase.
- Multiplayer considerations: Teammates may have spell/ability permissions in team modes.

### Rule: End Of Turn

- Rule section: `317`
- Trigger: Turn player ends action phase.
- Preconditions: No chain/showdown preventing end.
- Action: Process ending step, end-turn cleanup, heal units, expire this-turn effects, empty rune pools, pass turn.
- Result: Next player becomes turn player.
- Events emitted: `TurnEnding`, `UnitsHealed`, `TemporaryEffectsExpired`, `RunePoolEmptied`, `TurnEnded`.
- Ability triggers: End of turn and expiration triggers.
- Edge cases: Cleanup can recursively cause more cleanup. This-turn effects expire simultaneously.
- Multiplayer considerations: All rune pools empty at turn end.

### Rule: Cleanup

- Rule section: `318-323`
- Trigger: Phase/state transitions, board entry/exit, move completion, chain changes, status changes, and special cleanup timings.
- Preconditions: Cleanup reason exists.
- Action: Check victory, resolve lethal damage, update attacker/defender designations, update battlefield control/contested state, recall gear, stage showdowns/combats, finalize pending chain items as required.
- Result: Board state becomes legal/stable or queues further cleanup.
- Events emitted: `CleanupStarted`, `ObjectKilled`, `BattlefieldUpdated`, `CombatStaged`, `ShowdownStaged`, `CleanupEnded`.
- Ability triggers: Death, control, move, combat/showdown triggers.
- Edge cases: Cleanup can schedule another cleanup. Chain items cannot resolve during cleanup.
- Multiplayer considerations: Combat/showdown staging with more than two players has restrictions.

### Rule: Chain

- Rule section: `325-336`
- Trigger: Card played or ability activated/triggered.
- Preconditions: A spell/ability needs chain handling.
- Action: Create chain, add pending/finalized items, manage active player and reaction windows, resolve items in legal order.
- Result: Effects resolve or are removed/countered.
- Events emitted: `ChainOpened`, `ChainItemPending`, `ChainItemFinalized`, `ChainItemResolved`, `ChainClosed`.
- Ability triggers: Triggered abilities add pending chain items.
- Edge cases: Add-resource abilities may finalize and resolve immediately. Chain creates closed state.
- Multiplayer considerations: Reaction priority can pass among multiple players in turn order.

## Playing Cards And Abilities

### Rule: Playing A Card

- Rule section: `346-356`
- Trigger: Player declares a card play.
- Preconditions: Player has priority/timing permission, card is in playable zone, and initial play is possible.
- Action: Move card to chain, make choices, determine total cost, pay costs, check legality, finalize, then resolve according to card category.
- Result: Permanent enters board or spell resolves and goes to trash.
- Events emitted: `CardPlayStarted`, `ChoicesMade`, `CostDetermined`, `CostPaid`, `CardFinalized`, `CardPlayed`, `SpellResolved`.
- Ability triggers: Play effects after successful play, targeting/choice triggers, cost/payment triggers.
- Edge cases: Illegal play is undone/cancelled. Targets may become illegal later. Units and gear do not target by default.
- Multiplayer considerations: Reactions can be played before spell resolution.

### Rule: Passive Abilities

- Rule section: `360-363`
- Trigger: Continuous state evaluation.
- Preconditions: Ability is active in current zone.
- Action: Apply constraints, permissions, cost modifications, or continuous modifiers.
- Result: Derived legal actions/stats/costs change.
- Events emitted: None unless state change is materialized.
- Ability triggers: None; passive abilities do not trigger.
- Edge cases: Some passive abilities apply from non-board zones if self-described.
- Multiplayer considerations: May affect opponents/teammates depending on friendly/enemy definitions.

### Rule: Replacement Effects

- Rule section: `364-368`
- Trigger: Event intent is about to be executed.
- Preconditions: One or more replacement effects apply.
- Action: Replace or alter the event before committing state.
- Result: Original event may be modified, skipped, or replaced.
- Events emitted: `ReplacementApplied`, plus resulting event.
- Ability triggers: Triggers see final processed event unless rule says otherwise.
- Edge cases: Multiple replacements ordered by affected object owner/player or turn player for uncontrolled battlefield.
- Multiplayer considerations: Affected player/object owner may choose replacement order.

### Rule: Activated Abilities

- Rule section: `369-374`, `386-394`
- Trigger: Player activates ability.
- Preconditions: Ability active, timing legal, costs payable.
- Action: Put ability on chain, choose targets/options, determine/pay costs, check legality, finalize and resolve.
- Result: Ability effect executes.
- Events emitted: `AbilityActivated`, `AbilityFinalized`, `AbilityResolved`.
- Ability triggers: Activation, targeting, resolution triggers.
- Edge cases: Ability has no card on chain but still closes state. Add-resource abilities may resolve immediately.
- Multiplayer considerations: Opponents may react when chain allows.

### Rule: Triggered Abilities

- Rule section: `375-385`
- Trigger: Trigger condition is met after inciting event resolves.
- Preconditions: Trigger source is active in the relevant zone and condition is satisfied.
- Action: Queue triggered ability as pending chain item, order simultaneous triggers, resolve via ability play process.
- Result: Trigger effect executes or is removed if no legal choices/costs.
- Events emitted: `AbilityTriggered`, `TriggeredAbilityQueued`, `AbilityResolved`.
- Ability triggers: Triggers can cause further triggers after resolution/cleanup.
- Edge cases: “Nth time” triggers choose one simultaneous instance. Delayed and reflexive triggers need stored context.
- Multiplayer considerations: Simultaneous triggers ordered by controller, starting with turn player in turn order.

## Game Actions

### Rule: Draw

- Rule section: `400`
- Trigger: Draw phase or effect instructs draw.
- Preconditions: Player exists.
- Action: Move top main deck card to hand; handle burn out if insufficient.
- Result: Player hand grows or burn out sequence occurs.
- Events emitted: `CardDrawn`, `BurnOutResolved`.
- Ability triggers: `ON_DRAW`.
- Edge cases: Draw as many as possible before burn out, then continue remaining draw.
- Multiplayer considerations: Burn out point goes to chosen opponent.

### Rule: Exhaust And Ready

- Rule section: `401-402`
- Trigger: Cost, effect, awaken phase, or cleanup.
- Preconditions: Object can be exhausted/readied and is not already in that state where redundant.
- Action: Set ready/exhausted state.
- Result: Object availability changes.
- Events emitted: `ObjectExhausted`, `ObjectReadied`.
- Ability triggers: Ready/exhaust triggers.
- Edge cases: Exhaust as cost must be possible. Re-readying ready object does nothing.
- Multiplayer considerations: Controller determines controlled objects readied.

### Rule: Recycle

- Rule section: `403`
- Trigger: Cost, effect, mulligan, burn out.
- Preconditions: Cards exist in specified recyclable zone.
- Action: Move cards to bottom of corresponding owner deck.
- Result: Deck gains recycled cards.
- Events emitted: `CardsRecycled`.
- Ability triggers: Recycle triggers.
- Edge cases: Multiple main deck cards recycled simultaneously are randomized; multiple runes recycled to rune deck are owner-ordered.
- Multiplayer considerations: Cards recycle to owner decks regardless of who performs action.

### Rule: Deal Damage And Heal

- Rule section: `404-405`
- Trigger: Effect or combat damage.
- Preconditions: Target unit(s) exist and damage/heal action is legal.
- Action: Mark or clear damage.
- Result: Damage state changes; cleanup may kill units.
- Events emitted: `DamageDealt`, `DamageHealed`.
- Ability triggers: Damage/heal triggers.
- Edge cases: Combat assignment is not itself dealing until assignment completes.
- Multiplayer considerations: Damage source/controller matters for kill attribution.

### Rule: Play

- Rule section: `406`
- Trigger: Player or effect instructs play.
- Preconditions: Timing, zone, card, and cost legality.
- Action: Execute playing-card process.
- Result: Card is played or action fails/does nothing if no eligible card for limited play.
- Events emitted: Same as playing card.
- Ability triggers: Play triggers after successful resolution.
- Edge cases: Countered card was not played.
- Multiplayer considerations: Reactions and teammate permissions may apply.

### Rule: Move And Recall

- Rule section: `407`, `423-436`
- Trigger: Standard move, effect move, or corrective recall.
- Preconditions: Permanent is a unit for move; destination legal.
- Action: Move unit between board locations or recall permanent to base without counting as move.
- Result: Object location changes; cleanup follows move.
- Events emitted: `ObjectMoved`, `ObjectRecalled`, `CleanupStarted`.
- Ability triggers: Move triggers for moves, not recalls.
- Edge cases: Units cannot move to battlefield with units from two other players. Moving is instantaneous and cannot be reacted to.
- Multiplayer considerations: Staged/in-progress combat restricts third-party movement in multiplayer.

### Rule: Hide

- Rule section: `408`, `737`
- Trigger: Player hides card with Hidden.
- Preconditions: Player controls target battlefield, facedown slot is empty, card has Hidden and timing/cost are legal.
- Action: Place card facedown in battlefield facedown zone.
- Result: Card becomes private facedown board card with special play permissions.
- Events emitted: `CardHidden`.
- Ability triggers: Hide triggers if any.
- Edge cases: Hidden is not play and does not open chain.
- Multiplayer considerations: Hidden card front is private to controller; network state must conceal it.

### Rule: Discard

- Rule section: `409`
- Trigger: Cost or effect instructs discard.
- Preconditions: Player has cards in hand or can discard as many as possible.
- Action: Move chosen hand cards to owner trash without executing normal card text.
- Result: Cards leave hand.
- Events emitted: `CardDiscarded`.
- Ability triggers: `ON_DISCARD`, discard-specific triggers after discard.
- Edge cases: Discard as cost must be fully payable; discard as effect does as much as possible.
- Multiplayer considerations: Discard choices may use private hand information.

### Rule: Stun, Reveal, Counter, Buff, Banish, Kill, Add, Channel, Burn Out

- Rule section: `410-418`
- Trigger: Effects or turn structure instruct these actions.
- Preconditions: Action-specific legality and targets.
- Action: Apply the corresponding state change:
  - stun unit.
  - reveal private/secret cards.
  - counter chain item.
  - add buff counter.
  - banish card/permanent.
  - kill permanent to trash.
  - add resources.
  - channel runes.
  - perform burn out replacement sequence.
- Result: Game state changes and cleanup/triggers may follow.
- Events emitted: `UnitStunned`, `CardRevealed`, `ChainItemCountered`, `UnitBuffed`, `CardBanished`, `PermanentKilled`, `ResourceAdded`, `RuneChanneled`, `BurnOutResolved`.
- Ability triggers: Action-specific triggers.
- Edge cases: Kill is not move/discard. Countered cards are not played. Burn out can repeat if deck and trash remain empty.
- Multiplayer considerations: Burn out requires opponent choice; banishment/trash are owner-scoped.

### Rule: Attach And Detach

- Rule section: `421-422`, `716-725`
- Trigger: Effect instructs attach/detach.
- Preconditions: Legal attached/top-most relationship.
- Action: Link or unlink card instances; append effect text and might bonus while attached; inactive rules text as required.
- Result: Top-most card gains attached effects/modifiers.
- Events emitted: `CardAttached`, `CardDetached`.
- Ability triggers: Attach/detach triggers.
- Edge cases: Attached cards move with top-most card while on board, but detach when top-most changes from board to non-board zone.
- Multiplayer considerations: Attached card controller can differ from top-most controller.

## Combat, Scoring, And Victory

### Rule: Combat

- Rule section: `437-444`
- Trigger: Cleanup finds battlefield with units controlled by two opposing players.
- Preconditions: No chain items prevent combat start; exactly two opposing players involved.
- Action: Stage/begin combat, run showdown, assign/deal combat damage, cleanup, establish control if appropriate.
- Result: Units take damage, may die, control may change, scoring may occur.
- Events emitted: `CombatStaged`, `CombatStarted`, `ShowdownStarted`, `CombatDamageAssigned`, `DamageDealt`, `CombatResolved`.
- Ability triggers: Attack, defend, damage, death, conquer triggers.
- Edge cases: Multiple combats are ordered by turn player. Combat damage step can be skipped if attackers/defenders absent.
- Multiplayer considerations: Combat is only between two players; third-party movement into staged/in-progress combat is restricted.

### Rule: Scoring And Victory

- Rule section: `445-449`, `460.3`
- Trigger: Hold during beginning phase or conquer after control is established.
- Preconditions: Player controls/establishes battlefield and has not scored that battlefield this turn.
- Action: Award point if final-point rules allow, trigger score abilities, check victory score.
- Result: Player/team score changes or game ends.
- Events emitted: `BattlefieldScored`, `PointGained`, `GameWon`.
- Ability triggers: Hold, conquer, score triggers.
- Edge cases: Final point from conquer has additional restriction; non-score point gains can bypass final-point restriction.
- Multiplayer considerations: Team modes share victory but not control; teammate-held battlefields can disqualify scoring.

## Layers And Continuous Effects

### Rule: Layers

- Rule section: `450-457`
- Trigger: Any derived characteristic query or continuous effect update.
- Preconditions: Active continuous effects exist.
- Action: Apply trait-altering, ability-altering, and arithmetic effects in layer order with dependency and timestamp resolution.
- Result: Derived card traits/stats/abilities are computed.
- Events emitted: None unless derived visible state changes materially.
- Ability triggers: Mighty/becomes-mighty and similar derived-state triggers.
- Edge cases: Effects can depend on other effects. Timestamps reset when text becomes inactive/active.
- Multiplayer considerations: Deterministic ordering is required for all clients.

## Modes Of Play

### Rule: Mode Configuration

- Rule section: `458-466`
- Trigger: Game creation.
- Preconditions: Mode selected.
- Action: Set player count, teams, victory score, battlefield count, setup modifications, first-turn process, and unique rules.
- Result: Game setup and rules behavior are parameterized.
- Events emitted: `ModeSelected`.
- Ability triggers: None.
- Edge cases: 1v1 Duel/Match, FFA3, FFA4, and 2v2 have different battlefield and first-turn rules.
- Multiplayer considerations: Teams alter turn order, scoring, spell permissions, win/loss, and duplicate legend/battlefield restrictions.

### Rule: Conceding

- Rule section: `649-651`
- Trigger: Player concedes.
- Preconditions: Player is in game.
- Action: Remove player from game; apply mode/team defeat rules.
- Result: Player or team loses where applicable.
- Events emitted: `PlayerConceded`, `PlayerDefeated`, `GameWon`.
- Ability triggers: None unless future card text references concession/removal.
- Edge cases: Team concession causes team loss in team modes.
- Multiplayer considerations: Remaining turn order and shared battlefields may need recomputation.

## Additional Rules And Keywords

### Rule: Buffs And Mighty

- Rule section: `701-711`
- Trigger: Buff action or might recalculation.
- Preconditions: Unit exists and can receive buff/current might can be computed.
- Action: Add/spend buff; derive mighty status from current might.
- Result: Unit might and mighty status may change.
- Events emitted: `UnitBuffed`, `BuffSpent`, `MightyChanged`.
- Ability triggers: Becomes-mighty triggers.
- Edge cases: Only one buff per unit. Non-board zones use inherent might.
- Multiplayer considerations: Controller restrictions apply to spending buffs.

### Rule: Bonus Damage

- Rule section: `712-715`
- Trigger: Deal damage action is being calculated.
- Preconditions: One or more bonus damage effects apply.
- Action: Sum positive bonus damage and apply to deal action according to target structure.
- Result: Damage amount increases.
- Events emitted: `BonusDamageApplied`, `DamageDealt`.
- Ability triggers: Damage triggers from final dealt damage.
- Edge cases: Negative bonus damage is ignored. Split damage changes available split amount.
- Multiplayer considerations: Source/controller of damage remains important.

### Rule: Attachment And Inactive Text

- Rule section: `716-725`
- Trigger: Attach/detach or text activity query.
- Preconditions: Card has rules/effect text and may be attached.
- Action: Inactivate attached card rules text; append effect text and might bonus to top-most card.
- Result: Derived abilities and stats change.
- Events emitted: `RulesTextBecameInactive`, `RulesTextBecameActive`.
- Ability triggers: Attach/detach triggers where applicable.
- Edge cases: Inactive text can still be referenced for some eligibility checks.
- Multiplayer considerations: Attached cards remain public board objects.

### Rule: Keywords

- Rule section: `726+`
- Trigger: Card definition import, effect grants/removes keyword, legal-action query, or event trigger.
- Preconditions: Card has keyword text or gained/lost keyword effect.
- Action: Expand keyword into permissions, passive effects, triggered abilities, or replacement/cost modifications.
- Result: Legal actions and derived state update.
- Events emitted: `KeywordGranted`, `KeywordRemoved`, plus keyword-specific events.
- Ability triggers: Keyword-specific triggers such as Deathknell, attack/defend derived triggers, Legion conditional checks.
- Edge cases: Some keyword instances are redundant, others stack/add values. Duration rules matter.
- Multiplayer considerations: Action/Reaction permissions and team-mode timing affect who may act.

## Engine-Wide Requirements

### Rule: Deterministic Resolution

- Rule section: Applies across all sections.
- Trigger: Any command resolution.
- Preconditions: Command entered engine.
- Action: Resolve through a single pipeline: validate, choose, pay, commit, cleanup, triggers, events.
- Result: Same input command log produces same game state.
- Events emitted: Command-specific events plus `CommandRejected` where applicable.
- Ability triggers: Detected after committed events unless replacement rules alter event.
- Edge cases: Random choices require seeded RNG.
- Multiplayer considerations: Server-authoritative or deterministic lockstep architecture required.

### Rule: Event And Command Logs

- Rule section: Applies across all sections.
- Trigger: Any accepted command or emitted event.
- Preconditions: Game is active.
- Action: Append command and event records with sequence numbers.
- Result: Replay, undo, debugging, and synchronization become possible.
- Events emitted: All game events.
- Ability triggers: Trigger engine consumes event stream.
- Edge cases: Hidden information must not leak in public logs.
- Multiplayer considerations: Per-player redacted event streams may be required.
