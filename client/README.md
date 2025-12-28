# Client

← [Back to main README](../README.md)

React + TypeScript + Vite frontend for Start.

## Quick Start

```bash
bun install      # or pnpm install
bun run dev      # or pnpm run dev
```

You'll need to set the `VITE_CAP_URL` environment variable to the URL of your Cap production instance. I use these for connecting to a Cap deployment and fallback location data for Daylight.

```
VITE_FALLBACK_LAT=...
VITE_FALLBACK_LON=...
VITE_CAP_URL=...
```

Runs on `http://localhost:5173` (with `--host 0.0.0.0` for local network access).

> **Tip:** Use `./go.sh` from the project root to start both client and server together.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast dev/build
- **CSS Modules** for scoped styling
- **Phosphor Icons** for UI icons
- **@dnd-kit** for drag-and-drop reordering

## Project Structure

```
src/
├── App.tsx                 # Main app with navigation and routing
├── types.ts                # TypeScript interfaces for all data types
├── utils.ts                # Date utilities and helpers
│
├── api/                    # API client functions (one file per domain)
│   ├── habits.ts
│   ├── tasks.ts
│   ├── diary.ts
│   ├── lists.ts
│   ├── next.ts
│   ├── vlogs.ts
│   └── calendar.ts         # Google Calendar API calls
│
├── components/
│   ├── habits/             # Habit tracking with calendar view
│   │   ├── HabitTracker.tsx
│   │   ├── ChartModal.tsx
│   │   ├── LoomRecorder.tsx
│   │   └── ...
│   │
│   ├── todos/              # Todo management
│   │   ├── Todos.tsx
│   │   ├── WeekView.tsx
│   │   ├── DraggableTask.tsx
│   │   ├── calendar/       # Calendar popover components
│   │   │   ├── CalendarPopover.tsx
│   │   │   ├── AllDayEventCard.tsx
│   │   │   ├── TimedEventCard.tsx
│   │   │   └── CalendarColors.ts
│   │   └── ...
│   │
│   ├── journal/            # Daily diary/journal
│   │   ├── Diary.tsx
│   │   ├── QuestionView.tsx
│   │   └── TimeInputCard.tsx
│   │
│   ├── grow/               # Ideas/notes cards
│   │   └── Next.tsx
│   │
│   ├── lists/              # Kanban-style lists
│   │   └── Lists.tsx
│   │
│   ├── memos/              # Embedded Memos iframe
│   │   └── Memos.tsx
│   │
│   ├── daylight/           # Sun/moon screensaver
│   │   ├── Daylight.tsx
│   │   ├── DaylightContext.tsx
│   │   ├── DaylightDebugPanel.tsx
│   │   ├── THEMES.md           # Visual theme reference
│   │   ├── themes-preview.svg  # Generated theme swatches
│   │   ├── utils/
│   │   │   └── themeConfigV2.ts  # 55+ color themes
│   │   └── scripts/
│   │       └── generate-themes-svg.js
│   │
│   └── shared/             # Reusable components
│       ├── Navigation.tsx
│       ├── DayWeek.tsx
│       └── ServerStatus.tsx
│
├── hooks/                  # Custom React hooks
│   ├── useCalendarEvents.ts  # Calendar event fetching and state
│   └── useListReorder.ts
│
├── constants/              # App constants
│   └── ...
│
└── utils/                  # Additional utilities
    └── ...
```

## Features

### Work Mode

Append `?w` / `?mode=work` to the URL to use a privacy-focused mode that only shows work-related tasks and hides personal data. Useful for work laptops with VPNs.

### Daylight Themes

The Daylight component includes 55+ color themes across 11 time phases. To regenerate the theme preview after editing themes:

```bash
npm run generate:themes
```

This creates `src/components/daylight/themes-preview.svg` and updates `THEMES.md`.

## Build

```bash
pnpm run build    # Production build → dist/
pnpm run preview  # Preview production build
```

## Type Definitions

All shared types are in `src/types.ts`:

| Type | Description |
|------|-------------|
| `Habit` | Habit definition (name, order, defaultTime, active, comment) |
| `HabitEntry` | Habit entry for a date (state: 1=done, 2=failed, 3=exception) |
| `Task` | Todo item (text, date, category, state, order) |
| `Question` | Journal prompt |
| `DiaryEntry` | Journal answer |
| `List` / `ListItem` | List containers and their items |
| `Note` | Ideas card (used in Grow/Next) |
| `Vlog` | Weekly video reflection |
| `CalendarEvent` | Google Calendar event (summary, start_time, end_time, all_day) |
