# Server

← [Back to main README](../README.md)

Express + TypeScript API server running on Bun with CockroachDB backend.

## Quick Start

```bash
bun run index.ts
```

Runs on `http://localhost:3000` (binds to `0.0.0.0` for local network access).

## Environment

Create a `.env` file:

```env
PORT=3000
DATABASE_URL=<your-cockroachdb-connection-string>

GOOGLE_APPLICATION_CREDENTIALS=./google-calendar-key.json
GOOGLE_CALENDAR_ID=you-can-find-this-in-the-calendar-settings-usually-it-is-your-email-address
```

### Google Calendar Setup (Sort of Optional)

To enable Google Calendar integration:

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable the Google Calendar API**
   - Navigate to **APIs & Services** → **Library**
   - Search for "Google Calendar API" and enable it

3. **Create a Service Account**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **Service Account**
   - Give it a name and create
   - No need to grant additional roles for read-only calendar access

4. **Generate a JSON Key**
   - Click on your new service account
   - Go to the **Keys** tab
   - Click **Add Key** → **Create new key** → **JSON**
   - Save the downloaded JSON file to the `server/` directory

5. **Share Your Calendar with the Service Account**
   - Open Google Calendar settings
   - Under your calendar, go to **Share with specific people**
   - Add the service account email (found in the JSON file as `client_email`)
   - Grant "See all event details" permission

6. **Configure Environment Variables**
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=./google-calendar-key.json
   GOOGLE_CALENDAR_ID=you-can-find-this-in-the-calendar-settings-usually-it-is-your-email-address
   ```

> **Note:** The JSON key file should be added to `.gitignore` to avoid committing credentials.


## Project Structure

```
server/
├── index.ts            # Express app setup, middleware, route mounting
├── db.ts               # PostgreSQL connection pool (pg)
├── db-types.ts         # Database type definitions
├── logger.ts           # File logging utility
├── db_utils/
│   └── table_setup.sql # Database schema DDL
├── routes/
│   ├── habits.ts       # Habit definitions and entries
│   ├── tasks.ts        # Todo tasks with batch operations
│   ├── diary.ts        # Journal entries and questions
│   ├── lists.ts        # Lists with items
│   ├── next.ts         # Ideas/notes cards
│   ├── vlogs.ts        # Weekly video reflections
│   └── calendar.ts     # Google Calendar sync and retrieval
├── services/
│   └── calendarService.ts  # Google Calendar API integration
└── server.log          # Request logs
```

## Database Schema

All data is stored in **CockroachDB**. The following tables are used:

| Table | Purpose |
|-------|---------|
| `habits` | Habit definitions (name, order, default_time, active, comment) |
| `entries` | Habit entries by date (habit_id, date, state, timestamp) |
| `tasks` | Todo items (text, date, category, state, order) |
| `questions` | Journal prompts (text, order, active, date for ad-hoc) |
| `diary_entries` | Journal answers (date, question_id, answer) |
| `lists` | List containers (title, color, order) |
| `list_items` | Items within lists (list_id, text, completed, position) |
| `next_items` | Ideas/notes cards (title, content, color, size, started_at, deleted_at) |
| `vlogs` | Weekly video reflections (week_start_date, video_url, embed_html) |
| `calendar_events` | Cached Google Calendar events (summary, start_time, end_time, all_day) |

> **Note:** CockroachDB's free tier is very generous and should be more than enough for personal use. They do require a CC but with price limiting, and $15 of free credits every month, this works very well for this project.

### Database Setup

To initialize the database tables, run the SQL in [`db_utils/table_setup.sql`](db_utils/table_setup.sql). This creates all required tables with proper constraints.

> ⚠️ **Warning:** The setup script uses `DROP TABLE IF EXISTS` — running it will delete existing data.

## API Reference

### Habits

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/habits` | Get all active habits (ordered) |
| `GET` | `/habit-entries?from=&to=` | Get entries in date range |
| `POST` | `/habit-entry` | Create/update habit entry |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tasks` | Get all tasks |
| `GET` | `/tasks/week?start=&end=` | Get tasks for date range |
| `GET` | `/tasks/work` | Get only work category tasks |
| `GET` | `/tasks/counts?category=` | Get task counts by state per date |
| `GET` | `/tasks/grouped?category=` | Get tasks grouped by state per date |
| `POST` | `/tasks` | Create a task |
| `PATCH` | `/tasks/:id` | Update a task |
| `DELETE` | `/tasks/:id` | Delete a task |
| `POST` | `/tasks/punt` | Punt task to next day (fail + copy) |
| `POST` | `/tasks/batch/punt` | Batch punt multiple tasks |
| `POST` | `/tasks/batch/fail` | Batch fail multiple tasks |
| `PATCH` | `/tasks/:id/reorder` | Update task order |

### Journal (Diary)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/questions` | Get all active questions |
| `POST` | `/questions` | Create a question |
| `GET` | `/diary` | Get all diary entries (grouped by date) |
| `POST` | `/diary-entries` | Create/upsert diary entry |
| `PATCH` | `/diary-entries/:id` | Update diary entry |
| `DELETE` | `/diary-entries/:id` | Delete diary entry |

### Lists

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/lists` | Get all lists with items |
| `POST` | `/lists` | Create a list |
| `PATCH` | `/lists/:id` | Update list (title, color, items) |
| `DELETE` | `/lists/:id` | Delete list and its items |
| `PATCH` | `/lists/:id/reorder` | Update list order |

### Ideas (Next)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/next` | Get all active ideas |
| `POST` | `/next` | Create an idea |
| `PATCH` | `/next/:id` | Update idea (start, archive, edit) |

### Vlogs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/vlogs/:weekStartDate` | Get vlog for a specific week |
| `POST` | `/vlogs` | Create/update vlog |

### Calendar

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/calendar?start=&end=` | Get cached calendar events for date range |
| `POST` | `/api/calendar/sync` | Sync events from Google Calendar |

### Utility

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check (returns `{ status: 'ok' }`) |

## Logging

All requests are logged to console and `server.log` with:
- Timestamp
- HTTP method and path
- Status code with emoji (✅ success, ⚠️ client error, 🔥 server error)
- Response time in ms
- Query parameters
- Error details (for 4xx/5xx responses)

Health check requests (`/health`) are excluded from logs to reduce noise.

## Development

```bash
bun run dev      # Start with auto-reload (nodemon)
bun run start    # Production mode
```

Or use the root startup script to run both client and server:

```bash
./go.sh          # From project root
```
