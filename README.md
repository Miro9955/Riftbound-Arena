# Riftbound Arena

Riftbound Arena is a React, TypeScript, and Vite web app for experimenting with a clearer digital interface for the Riftbound card game.

The project goal is not to create custom Riftbound rules. Gameplay logic is intended to follow the official Riftbound Core Rules, while the app focuses on improving the board layout, card readability, multiplayer clarity, and player experience.

## Goals

- Implement official Riftbound rules accurately.
- Keep all gameplay changes routed through a testable game engine.
- Improve the UI/UX for multiplayer play.
- Make zones, cards, previews, and actions easier to understand.
- Build the rules implementation gradually with automated tests.
- Avoid custom mechanics, balance changes, or invented card behavior.

## Implemented Features

- React board UI with hand, battlefield, base, trash, rune, legend, and chosen champion areas.
- Reusable `GameCard` component.
- Real card images loaded from imported Piltover Archive card metadata when available.
- Fallback card frame for cards without image URLs.
- Hover and tap card zoom preview.
- Drag and drop card movement with `@dnd-kit/core`.
- Droppable zones for:
  - `battlefield1`
  - `battlefield2`
  - `base`
  - `trash`
  - `channeledRunes`
- Static card database loading from `public/cards/piltover-cards.json`.
- `CardDatabase` service with async loading, lookup, search, and filtering helpers.
- Core `GameEngine` abstraction so UI actions do not mutate game state directly.
- Game setup foundation for official Core Rules Phase 1:
  - main deck size validation
  - rune deck size validation
  - basic deck construction checks
  - starting game state creation
  - deck shuffling
  - starting hand draw
  - mulligan preparation state
  - setup-related game events
- Ability engine foundation with generic trigger and effect types.
- Vitest test setup for engine behavior.
- Architecture and rules planning documentation.

## Architecture Overview

The app is split between UI components, services, and game logic.

The React UI renders the board and forwards user actions to the engine. It does not directly apply gameplay rules.

The game engine owns authoritative `GameState` updates and emits events after state changes. Current engine work is still early, but the project is structured so future official rules can be added behind engine methods and covered by tests.

Card metadata is loaded asynchronously from a static JSON file in `client/public/cards`, avoiding bundling the entire card database into the frontend JavaScript.

Rule implementation is guided by:

- [Architecture](docs/ARCHITECTURE.md)
- [Design Principles](docs/DESIGN_PRINCIPLES.md)
- [Rules Implementation Plan](docs/RULES_IMPLEMENTATION_PLAN.md)
- [Rule Specification](docs/RULE_SPECIFICATION.md)

## Folder Structure

```text
.
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DESIGN_PRINCIPLES.md
│   ├── RULES_IMPLEMENTATION_PLAN.md
│   └── RULE_SPECIFICATION.md
├── client/
│   ├── public/
│   │   └── cards/
│   │       └── piltover-cards.json
│   ├── scripts/
│   │   └── import-piltover-cards.ts
│   ├── src/
│   │   ├── components/
│   │   │   ├── Board/
│   │   │   ├── GameCard/
│   │   │   ├── Hand/
│   │   │   └── Zone/
│   │   ├── data/
│   │   ├── game/
│   │   │   ├── abilities/
│   │   │   └── engine/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── tests/
│       ├── helpers/
│       ├── gameEngine.test.ts
│       └── gameSetup.test.ts
└── README.md
```

## Tech Stack

- React
- TypeScript
- Vite
- Vitest
- `@dnd-kit/core`
- ESLint

## Screenshots

Screenshots will be added as the UI stabilizes.

Placeholder:

```text
docs/screenshots/
```

## Development Setup

Prerequisites:

- Node.js
- npm
- Git

Install dependencies:

```bash
cd client
npm install
```

## Running Locally

Start the Vite development server:

```bash
cd client
npm run dev
```

Build for production:

```bash
cd client
npm run build
```

Preview the production build:

```bash
cd client
npm run preview
```

## Testing

Run the automated tests:

```bash
cd client
npm run test
```

Current tests cover engine behavior and the Phase 1 game setup foundation.

## Roadmap

- Complete official game setup support, including mode-specific battlefields and first-player handling.
- Implement mulligan resolution.
- Replace the simplified phase model with the official turn structure.
- Add rune and resource systems.
- Implement playing cards through a rules-accurate command pipeline.
- Add battlefield control, scoring, and victory rules.
- Implement combat and damage.
- Expand ability, timing, chain, replacement, and continuous-effect systems.
- Add keyword implementations.
- Improve multiplayer UI clarity.
- Add screenshots and UI documentation.

## Contribution Guidelines

- Work from `develop` for ongoing development.
- Keep gameplay rules aligned with the official Riftbound Core Rules.
- Cite relevant Core Rules sections in comments, docs, or tests when implementing rules.
- Add or update unit tests for every implemented rule.
- Do not add custom mechanics, custom balance changes, or invented card effects.
- Keep UI code separate from rules enforcement.
- Run tests before opening a pull request:

```bash
cd client
npm run test
```

Also run a production build when changing TypeScript, Vite, or shared app structure:

```bash
cd client
npm run build
```

## License

No license has been selected yet.

Until a license is added, this repository should be treated as all rights reserved by default.
