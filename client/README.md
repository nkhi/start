# Client

React + TypeScript + Vite frontend for the habits tracker.

## Quick Start

```bash
pnpm install
pnpm run dev
```

Runs on `http://localhost:5173`

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast dev/build
- **CSS Modules** for scoped styling
- **Phosphor Icons** for UI icons

## Project Structure

```
src/
├── components/     # React components (organized by page)
│   ├── habits/    # Habit tracking table
│   ├── today/     # Todos & week view
│   ├── journal/   # Diary & questions
│   ├── grow/      # Next ideas
│   ├── lists/     # Task lists
│   └── shared/    # Reusable components
├── api.ts         # API client
├── types.ts       # TypeScript types
└── utils.ts       # Date utilities & helpers
```

## Key Features

- **CSS Modules**: All styles are locally scoped (`.module.css`)
- **Hot Module Replacement**: Changes reflect instantly
- **Type Safety**: Full TypeScript coverage

## Build

```bash
pnpm run build    # Production build → dist/
pnpm run preview  # Preview production build
```

## Theme Management

When you update `src/components/daylight/utils/themeConfigV2.ts`, run this command to regenerate the `THEMES.md` preview:

```bash
npm run generate:themes
```
