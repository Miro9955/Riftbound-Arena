# Riftbound Arena Architecture

## Current Folder Structure

The application is a React, TypeScript, and Vite frontend located in `client`.

`client/src/App.tsx`

- Creates the `GameEngine`.
- Loads cards from `CardDatabase`.
- Holds the React copy of `GameState`.
- Handles drag end events from `@dnd-kit/core`.
- Delegates state changes to `GameEngine`.

`client/src/components`

- `Board/Board.tsx`: renders the fixed board layout.
- `Hand/Hand.tsx`: renders the player hand and draggable hand cards.
- `Zone/Zone.tsx`: renders board zones, droppable behavior, and compact zone cards.
- `GameCard/GameCard.tsx`: renders full card visuals, real card images, fallback card frame, and image preview.

`client/src/data`

- `cards.ts`: app-facing card types such as `GameCard` and `CardKind`.

`client/src/services`

- `CardDatabase.ts`: loads `/cards/piltover-cards.json` with `fetch`, maps Piltover Archive metadata into `GameCard`, caches loaded cards, and exposes search/filter helpers.

`client/src/game`

- `gameState.ts`: defines `GameState`, `ZoneId`, player/turn state, zone helpers, and initial state creation.

`client/src/game/engine`

- `GameEngine.ts`: public engine API and event emitter.
- `Actions.ts`: action type definitions.
- `Commands.ts`: command payload type definitions.
- `GameEvents.ts`: emitted event type definitions.
- `ZoneManager.ts`: immutable zone and hand movement helpers.
- `CardManager.ts`: card lookup, deck setup, draw, and shuffle helpers.
- `TurnManager.ts`: turn progression helper.

`client/public/cards`

- `piltover-cards.json`: static card database served by Vite instead of bundled into the frontend JS.

## Data Flow

1. `App` calls `loadCards()` on startup.
2. `CardDatabase` fetches `/cards/piltover-cards.json`.
3. Piltover card variants are mapped into app-level `GameCard` objects.
4. `App` seeds the engine with the first five cards through `engine.setInitialHand(...)`.
5. `App` stores `engine.getState()` in React state for rendering.
6. `Board`, `Hand`, `Zone`, and `GameCard` receive state via props and render it.
7. User interactions call engine methods.
8. The engine updates `GameState` and emits events.
9. `App` subscribes to engine events and refreshes React state from `engine.getState()`.

The UI should treat `GameState` as read-only display data. State mutation belongs in the engine.

## GameEngine Responsibilities

`GameEngine` is the current command boundary for all game state changes.

It exposes:

- `drawCard(playerId)`
- `playCard(playerId, cardInstanceId, zoneId)`
- `moveCard(cardInstanceId, zoneId)`
- `discardCard(cardInstanceId)`
- `returnCardToHand(cardInstanceId)`
- `shuffleDeck(playerId)`
- `endTurn()`

Current responsibilities:

- Own the authoritative `GameState`.
- Provide a small public command API.
- Delegate card and zone manipulation to managers.
- Emit events after successful actions.
- Keep UI concerns out of engine code.

Current limitations:

- Commands are not yet represented as a single reducer-style pipeline.
- No validation or rules layer exists.
- Events are emitted, but not persisted.
- `setInitialHand` is a setup convenience and should eventually become formal game setup.

## UI Responsibilities

The React UI is responsible for presentation and interaction only.

Current UI responsibilities:

- Render board zones, hand cards, and card previews.
- Provide draggable and droppable surfaces through `@dnd-kit/core`.
- Translate drag/drop UI events into engine commands.
- Subscribe to engine events and re-render from engine state.
- Show loading states while card metadata is loading.

The UI should not:

- Directly move cards between arrays.
- Apply game rules.
- Decide whether an action is legal.
- Mutate `GameState` outside the engine.

## GameState Responsibilities

`GameState` currently contains:

- `hand`: the visible hand for the current player prototype.
- `zones`: droppable board zones:
  - `battlefield1`
  - `battlefield2`
  - `base`
  - `trash`
  - `channeledRunes`
- `players`: keyed player state with decks.
- `turn`: active player and turn number.

For the prototype, `GameState` is enough to support movement and rendering. For official rules, it will need to model much more:

- Multiple players with separate hands, decks, trash, bases, runes, champions, and battlefields.
- Card instances distinct from card definitions.
- Ownership versus control.
- Attachments and nested card relationships.
- Exhausted/ready state.
- Damage, counters, temporary modifiers, and lasting effects.
- Turn phase, priority, timing windows, and pending choices.

## Event Flow

Current event types:

- `CardDrawn`
- `CardMoved`
- `CardPlayed`
- `CardDiscarded`
- `TurnEnded`

Current flow:

1. UI calls an engine method.
2. Engine updates state.
3. Engine emits a `GameEvent`.
4. `App` receives the event through `engine.subscribe(...)`.
5. `App` calls `setGameState(engine.getState())`.
6. React re-renders the board.

Events currently act as UI invalidation signals. They are not yet a full event log.

## Drag & Drop Flow

Current drag/drop flow:

1. `Hand` creates draggable hand cards with `useDraggable`.
2. `Zone` creates droppable board zones with `useDroppable`.
3. `Zone` also renders compact draggable cards already placed in zones.
4. `App` receives `onDragEnd` from `DndContext`.
5. `App` reads `event.active.id` as `cardInstanceId`.
6. `App` reads `event.over.id` as the destination zone.
7. `App` validates that the destination is a known `ZoneId`.
8. `App` calls `engine.moveCard(cardId, zoneId)`.
9. Engine moves the card and emits `CardMoved`.
10. React state updates from engine state.

No rules validation exists yet. Movement is intentionally free-form.

## Architectural Risks For Official Riftbound Rules

Triggered abilities:

The current event system can announce actions, but there is no trigger registry, trigger condition matching, queue, or ordering system. Official rules will likely need reactions to card movement, attacks, playing cards, damage, turn changes, and battlefield changes.

Replacement effects:

The current engine applies actions immediately. Replacement effects need a pre-resolution layer where an attempted event can be modified or replaced before state changes are committed.

Continuous modifiers:

Current card stats are stored directly on `GameCard`. Continuous effects should not permanently mutate printed/card definition values. The engine will need derived stat calculation from base values plus active modifiers.

Timing windows:

The current engine has no phase, priority, stack/queue, reaction window, or pending decision model. Official play will need explicit timing structure and legal action discovery.

Multiple players:

`GameState.players` exists, but the visible hand and zones are still mostly single-player prototype structures. Official rules need player-scoped zones, ownership, control, active player, turn order, and opponent interactions.

Multiplayer synchronization:

The engine is local and mutable. Networked play needs deterministic commands, server authority or lockstep validation, stable IDs, conflict handling, and clear hidden-information boundaries.

Replay system:

Events are emitted but not stored. Replays need an append-only command or event log, initial seed/state, deterministic randomness, and versioned migrations.

Undo system:

The engine does not retain history. Undo needs snapshots, inverse commands, or event sourcing. Hidden information and randomness make undo policy-sensitive.

AI:

The engine cannot yet enumerate legal actions or evaluate board state. AI needs a rules-complete action generator, deterministic simulation, scoring hooks, and fast clone/apply operations.

Card instances:

Current `GameCard.id` is the Piltover variant ID and also acts as a dragged card instance ID. This works for five unique prototype cards but will fail when multiple copies of the same card exist. The next phase needs separate `cardDefinitionId` and `cardInstanceId`.

Zone model:

Zones are currently a fixed record. Official rules may require player-owned zones, battlefield-specific unit placement, attachments, revealed/hidden zones, and ordering rules.

State mutation model:

The current engine is class-based with mutable internal state. That is workable for a UI prototype, but official rules, replay, undo, testing, and multiplayer would benefit from a pure reducer core.

## Proposed Scalable Architecture For Next Phase

### 1. Split Card Definitions From Card Instances

Introduce:

- `CardDefinition`: immutable printed/card database data.
- `CardInstance`: per-game object with `instanceId`, `definitionId`, owner, controller, current zone, ready/exhausted state, attachments, damage, counters, and temporary flags.

The UI should render instances by joining `CardInstance` with `CardDefinition`.

### 2. Make GameState Fully Player-Scoped

Suggested shape:

```ts
type GameState = {
  players: Record<PlayerId, PlayerState>;
  cardInstances: Record<CardInstanceId, CardInstance>;
  zones: Record<ZoneId, ZoneState>;
  turn: TurnState;
  stack: StackItem[];
  pendingChoice?: PendingChoice;
  continuousEffects: ContinuousEffect[];
  eventLog: GameEvent[];
  rngSeed: string;
};
```

Zones should be data, not hardcoded UI assumptions.

### 3. Add A Command Pipeline

Commands should flow through a single path:

1. Receive command.
2. Validate command.
3. Produce one or more intents.
4. Apply replacement effects.
5. Commit state changes.
6. Detect triggers.
7. Queue triggered abilities.
8. Emit events.

This keeps rules behavior testable and prevents special cases from leaking into UI components.

### 4. Add Rule Modules

Create focused rule systems:

- `ActionValidator`
- `TimingManager`
- `TriggerManager`
- `ReplacementEffectManager`
- `ContinuousEffectManager`
- `CombatManager`
- `PriorityManager`
- `ChoiceManager`

Each module should be pure or mostly pure, taking `GameState` and returning updated state plus events.

### 5. Derive Values Instead Of Mutating Printed Stats

Keep printed stats in card definitions. Compute current values through selectors:

- `getCurrentMight(instanceId, state)`
- `getCurrentPower(instanceId, state)`
- `getCanAttack(instanceId, state)`
- `getLegalActions(playerId, state)`

This is critical for continuous modifiers, temporary buffs, damage prevention, and aura-style effects.

### 6. Store Commands And Events

Use two histories:

- `CommandLog`: player inputs and system commands.
- `EventLog`: resolved facts after validation and replacement.

This supports debugging, replay, multiplayer sync, AI simulation, and undo.

### 7. Make Randomness Deterministic

Replace `Math.random()` in shuffle logic with seeded randomness owned by `GameState`.

This is needed for:

- Replays.
- Multiplayer consistency.
- Test reproducibility.
- AI simulations.

### 8. Keep React As A Renderer

React should continue to:

- Render state.
- Dispatch commands.
- Show pending choices.
- Display events/animations.

React should not:

- Validate rules.
- Mutate zones.
- Resolve triggers.
- Compute authoritative game outcomes.

### 9. Add Tests Before Rules Expansion

Before official rules, add tests around:

- Moving cards between zones.
- Drawing and shuffling with deterministic RNG.
- Event emission order.
- Trigger detection.
- Replacement effects.
- Continuous effect calculation.
- Legal action generation.

Rules complexity will grow quickly; tests should be added before implementing timing and triggered abilities.

## Recommended Next Steps

1. Introduce `CardDefinition` and `CardInstance`.
2. Replace `GameCard.id` as gameplay identity with generated `cardInstanceId`.
3. Move hand/zones into generic player-scoped `ZoneState`.
4. Convert engine methods to command objects internally.
5. Add deterministic RNG.
6. Add a persisted event log.
7. Implement legal action discovery before official rule validation.
8. Add tests for the current free-movement engine before adding rules.

The current architecture is a healthy prototype foundation: the UI no longer mutates arrays directly, and the engine is already the command boundary. The next phase should make that boundary stricter, more deterministic, and more data-driven before official Riftbound rules are layered in.
