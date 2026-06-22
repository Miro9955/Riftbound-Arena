# Riftbound Arena Design Principles

## Official Rules Are The Source Of Truth

Riftbound Arena must implement the official Riftbound Core Rules exactly. The app is not a custom rules variant, house-rules simulator, or balance experiment.

All gameplay behavior must be derived from the official Core Rules. This includes setup, mulligans, turn structure, timing, battlefields, runes, combat, scoring, victory conditions, card behavior, keywords, multiplayer formats, and any other rule-defined game action.

If a rule is unclear, incomplete, or difficult to translate into engine behavior, the implementation must add a TODO that cites the relevant Core Rules section instead of guessing.

## UI Can Be Different

The reason for building this app is improved user experience, especially for multiplayer play. The interface may differ from other digital card game clients as long as the underlying gameplay remains rules-accurate.

UI improvements may include clearer board organization, better zone visibility, stronger multiplayer affordances, larger card previews, drag and drop actions, right-click menus, cleaner prompts, and better timing-window communication.

The UI must never redefine rules. It can make official actions easier to understand and perform, but it cannot alter what actions are legal or when they are legal.

## Multiplayer UX Must Be Clear

Multiplayer readability is a primary product goal. The interface should make it obvious:

- whose turn it is
- who has priority or focus
- which battlefield is being contested
- which player controls each object
- which zones are public or hidden
- which actions are currently available
- how combat, scoring, and timing windows are progressing

The UI should reduce ambiguity without hiding important game information.

## Zones Must Be Visually Obvious

All official zones should be visually distinct and consistently placed. Players should be able to quickly identify hand, deck, trash, base, runes, battlefields, attachments, hidden cards, and any other rule-defined zone.

Zone labels, highlighting, drop targets, and card grouping should support fast scanning during multiplayer games.

## Actions Should Be Easy

The interface should make common actions comfortable:

- drag and drop for moving or playing cards
- right-click or context menus for available card actions
- zoom preview for reading cards
- clear prompts for mandatory and optional choices
- visible feedback for selected targets
- clear confirmation for irreversible or high-impact actions

Ease of use must not bypass rule validation. UI actions should route through the official game engine, which decides whether an action is legal.

## Engine Must Stay Rules-Accurate

The game engine is responsible for official rules enforcement. UI components must not directly mutate game state or implement rule logic.

All gameplay changes should flow through engine actions, commands, or rule controllers. The engine should emit events that the UI can display, animate, log, or use for prompts.

When new rule logic is implemented, it must cite the relevant Core Rules section in comments, docs, tests, or rule metadata.

## No Custom Balance Changes

Riftbound Arena must not change official card costs, stats, timing, scoring, deck construction, battlefield behavior, combat rules, win conditions, or other balance-sensitive systems.

Any support for variants, house rules, or custom modes must be explicitly separated from the official rules engine and must not be enabled by default.

## No Invented Card Effects

Card effects must be implemented from official card text and official rule definitions only. The app must not invent replacement text, inferred effects, unofficial errata, or behavior that is not supported by the Core Rules or official card data.

If official behavior cannot be determined from available sources, leave a TODO with the card name and relevant rule or data reference.

## Future Rule Work Must Cite Sources

Every future rule implementation should cite the Core Rules section that justifies it. Acceptable citation locations include:

- rule controller comments
- engine command metadata
- docs
- tests
- rule specification entries

This keeps the project auditable and prevents accidental drift into custom rules.
