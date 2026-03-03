# Todos Component Module

This directory contains the front-end components for task management.

## Architecture Overview
The main entry point is `Todos.tsx`, which serves as a layout and rendering orchestrator. All heavier business logic is decoupled into dedicated custom hooks located in `client/src/hooks/`:

- **`useTaskOperations`**: Handles task CRUD, punting logic, and batch operations.
- **`useGraveyard`**: Manages the graveyard panel state and archiving.
- **`useWeekNavigation`**: Handles generation of dates and navigation for the week view.
- **`useTaskDragAndDrop`**: Manages drag-and-drop context via `@dnd-kit/core`.

## View Preferences (Day vs. Week)
- **Default View**: The app defaults to the **Week View** to encourage better forward planning.
- **Persistence**: The user's preferred view mode is saved to the browser's `localStorage` under the key `todosViewMode`. The component checks this on initialization to respect user preferences across sessions without needing a backend sync.

## Key Features
- **Categorization**: Tasks are strictly separated into Work vs. Life categories depending on the user's active mode.
- **State Accordions**: Tasks are grouped into Open, Done, and Cancelled states. 
- **Graveyard**: A persistent repository for archived tasks waiting to be resurrected or deleted forever.
