# ▶️ Start

Start Menu, aka Start, is my personal self-hosted super app. It has functionality for tracking:
- Habits 
- Todos
- Notes ([using Memos](https://github.com/usememos/memos))
- Journals 
- Lists
- Stickies
- Good Moments
- Vlogs ([using Cap](https://cap.so/docs/self-hosting))
- Photos ([using Immich](https://github.com/immich-app/immich))

I serve this on my local network and access it from multiple devices via a Tailscale VPN for private tunnelling. I remixed [Daylight](https://github.com/bakkenbaeck/daylight-web) as a screensaver. I resurrected [Nook](https://github.com/micaiah-buttars/nook) (before he brought it back, nice!) to play Animal Crossing background music every hour. I also integrated [Cap](https://github.com/CapSoftware/Cap) to record weekly vlogs. _There's also a work mode with restricted data fetching to keep my personal data off the corporate VPN._

This app exists to make it easy to iterate on *how* I organize myself. Ideally, building a bespoke UX and feature set will encourage consistency in reflection and growth. 

## Design

**Start** is built around a few core principles:

1. **Single source of truth** - One app for all your personal organization
1. **Private** - Self-hosted behind a homelab VPN network, no public internet
2. **Minimal friction** - Quick to open, quick to use
3. **Visual clarity** - Clean design with meaningful colours and icons
4. **Daily focus** - Emphasizes today while tracking long-term progress

## Features

### 📊 **Habits**

<details>
  <summary>Track your daily habits with convenient rollup metrics.</summary>

- **Sunday Reflection**: Record an end-of-week video reflection using the built-in **Loom SDK recorder**
- **Flexible categories**: morning, night, exercise, health, weekdays, etc with icon differentiation and quick filtering
- **Collapsible week views** See weekly progress rolled up over time
- **State tracking**: Customizable states: ✅ Done, ❌ Failed, 🙂 Done with exception, 🫤 Succeeded Poorly, or ❓ Forgot / Don't Know

<img src="assets/habits.gif" width="600" alt="habits">

</details>

### ✅ **Todos**
<details>
  <summary>Daily task management with calendar integration. Separated by Life and Work. Inspired by https://tweek.so/ </summary>
   
- **Drag and drop** - easily move tasks between status accordions, or to the graveyard
- **Easy task punting** - move incomplete tasks to the next day
- **Days punted counter** - display how many days I've procrastinated lol
- **Task Graveyard** - persist tasks without being assigned to a date for later
- **Status sorting** - unfinished tasks always appear first
- **Work life balance** - lol. Tasks are split into two columns: life and work. When `?w` is added to the URL, only work tasks are shown/fetched.

<img src="assets/todos.png" width="600" alt="todos">
<img src="assets/todos-week.png" width="600" alt="todos week view">

</details>

### 💭 **Notes**
<details>
  <summary>Integrated Memos as an iFrame for quick thoughts and notes.</summary>

Better than a notes app where everything gets lost. Memos has search, hashtags, date-filters, and more. Find Memos here: https://github.com/usememos/memos

<img src="assets/memos.png" width="600" alt="memos">

</details>

### 📔 **Journal**
<details>
  <summary>A mind map + daily journal prompting algorithm powered by light text classification to suggest daily topics.</summary>

 Seed the mind map with open questions/problems/observations/themes, rank open questions on a 1-10 scale for priority, intensity, and openness, and then link them to other ideas. Then with some light text classification on-device powered by Ollama, you get a relevant topic for daily journalling, so you can keep circling back to the hard questions.

<!-- <img src="assets/memos.png" width="600" alt="memos"> -->

</details>


### 📝 **Lists**
a la Todoist. Organize ideas and groups of thoughts that belong together. **Perfect for**: Groceries, Furniture, Watchlists, Bucket lists, etc.

### 🌱 **Stickies**
a la Google Keep. Sticky notes in a mosaic layout with variable colours and sizes. 

### 🗳 **Moments**
Write-only submission box for remembering good times. At the end of the year, it turns into a Spotify-Wrapped style timeline of all the nice things that happened throughout the year.

### 🎥 **Vlogs**
Integrated [Cap](https://github.com/CapSoftware/Cap) as an iFrame. Cap is an open-source clone of Loom.

### 🖼️ **Photos**
Integrated [Immich](https://github.com/immich-app/immich) as an iFrame. 

### ☀️ **Daylight** (Bonus/Screensaver)
<details>
  <summary>Sun position visualizer as a screensaver.</summary>

[Daylight by bakkenbaeck](https://daylight.today/app/) is a simple, beautiful sun position visualizer powered by `sunCalc`, a React library that returns the suns location based on your timezone, and I've been using their website for years. [Since it's open source](https://github.com/bakkenbaeck/daylight-web), I decided to fork it to add more color schemes, more icons, more sayings, and fixed lines to mark the 9-5 and bedtime. I also zoomed in a bit, which is really satisfying. It acts as a nice screensaver that you can leave on all day.

<img src="/assets/demo.gif" width="600" alt="daylight demo">

</details>

### 🎵 **Nook (Bonus/Music)**
Plays music on the hour, every hour.
Inspired by [Nook](https://github.com/micaiah-buttars/nook) by mn6. 

## Getting Started

### Prerequisites

By the end of this setup, you'll have:
- **Bun** installed on your computer (runtime & package manager)
- **PostgreSQL** running in a Docker container

You'll need:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) - for running PostgreSQL

### Installation Steps

<details>
<summary><strong>Click to expand</strong></summary>

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd start
   ```

2. **Install Bun** (if not already installed)
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

3. **Install dependencies**
   ```bash
   bun install --cwd client
   bun install --cwd server
   ```

4. **Configure environment variables**
   
   Copy the example files and update the password:
   ```bash
   cp .env.example .env && cp server/.env.example server/.env && cp client/.env.example client/.env.local
   ```

   Then edit `.env` and `server/.env` to set your password (use the same password in both):
   - In `.env`: update `POSTGRES_PASSWORD=change-me`
   - In `server/.env`: update the password in `DATABASE_URL=postgres://start:change-me@...`

5. **Configure Google Calendar** (Optional)

   To display Google Calendar events, uncomment and configure in `server/.env`:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=./google-calendar-key.json
   GOOGLE_CALENDAR_ID=you-can-find-this-in-the-calendar-settings-usually-it-is-your-email-address
   ```
   
   You'll need to:
   - Create a Google Cloud project and enable the Calendar API
   - Create a service account and download its JSON key to `server/`
   - Share your calendar with the service account email
   
   See [Server Documentation](server/README.md#google-calendar-setup-optional) for detailed steps.

6. **Start the app**
   ```bash
   ./go.sh
   ```

   This will:
   - Start Docker Desktop automatically (macOS only)
   - Start the PostgreSQL Docker container
   - Wait for PostgreSQL to be healthy
   - Start the API server on `http://localhost:3000`
   - Start the client on `http://localhost:5173`
   - Open your browser automatically

   > **Note:** Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) to be installed.

   **That's it!** If you're just running this locally on your own machine, you're done. 🎉

</details>

<!-- 7. **Want to access from other devices?** (Optional)

   If you want to access Start from your phone, laptop, or other devices—without exposing it to the public internet—you'll need to set up a VPN tunnel. I use Tailscale with a self-hosted Headscale control server.

   This is completely optional and separate from Start itself. See [🏠 Self-Hosted & Private](#-self-hosted--private) below for details on my homelab setup. -->

## 🏠 Self-Hosted & Private

I want to own my data. Nothing is stored in the cloud—everything lives on my own hardware.

Tabular Data → PostgreSQL. Habits, todos, journal entries, and all other structured data lives in a **PostgreSQL** database running in Docker on my home server.

Video & Photos → Local storage with remote access (Cap/MinIO, Immich Server) 

Video recordings from Cap and my personal photo library for Immich are both running as Docker containers on my local server, and the media is stored locally on my giant SSD. 

**Does this matter? Is this worth running your own VPS?** Yes, it does, and yes, it is. The fact that any Loom employee, or bored Google Photos engineer, can access my personal content feels wrong. A value exchange I didn't really sign up for. What's worse is when companies process your content to train AI models or mine it for data like location, faces, and transcribe it for god knows why. I would rather go through an hour of setup (or days to build this app) once than have to deal with the continuous threat of overreach.

This means:
- **No cloud subscriptions** — free, no account management, no annoying sales emails
- **No external dependencies** — App works even when Cap Cloud, Immich Cloud, or Memos Cloud go down
- **Videos stay local** — All recordings are stored on a media drive attached to my home server
- **Backups** — Way easier to clone and zip local files than try to download them from a cloud platform
- **Offine-first** - no wifi no problem

<!-- ### How it works:

The app runs on a **Mac mini** at home (my "homelab server"). It's not exposed to the public internet—it only binds to a private Tailscale IP address. This IP is part of a WireGuard VPN mesh network managed by **[Headscale](https://github.com/juanfont/headscale)**. Only devices I've authenticated and added to the mesh can reach the server.

### Why Headscale?

**Tailscale** creates encrypted WireGuard tunnels between devices, but requires their cloud service (which sees connection metadata).

**Headscale** is an open-source, self-hosted Tailscale control server. Same VPN functionality, but everything stays on my own hardware—no accounts, no metadata shared, no cloud dependency.

### Architecture:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                               HOME SERVER                                  │
│                                                                            │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐ │
│  │   Headscale   │  │   Postgres    │  │   Start App   │  │unrelated app │ │
│  │   [Docker]    │  │[Docker/go.sh] │  │ [Bun/go.sh]   │  │   [Docker]   │ │
│  └───────────────┘  └───────────────┘  └───────────────┘  └──────────────┘ │
│         │                                                        │         │
│         └─────────────────── WireGuard VPN ──────────────────────┘         │
│                                    │                                       │
└────────────────────────────────────┼───────────────────────────────────────┘
                                     │ encrypted tunnel
                         ┌───────────┴───────────┐
                         │                       │
                    ┌────┴────┐            ┌────┴────┐
                    │  Phone  │            │ Laptop  │
                    └─────────┘            └─────────┘
```

All services on the home server are accessible via the VPN. Headscale handles authentication; WireGuard handles encryption. -->

## Documentation

| Section | Description |
|---------|-------------|
| 📖 [**Client Documentation**](client/README.md) | Frontend setup, project structure, components, and features |
| 🔧 [**Server Documentation**](server/README.md) | API reference, database schema, and backend details |

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React, TypeScript, Vite, CSS Modules, [Phosphor Icons](https://phosphoricons.com/) |
| **Backend** | Express, TypeScript, [Bun](https://bun.sh/) |
| **Database** | PostgreSQL (Docker) |
| **Integrations** | Google Calendar API, Immich, Memos, [Cap](https://cap.so/) + [MinIO](https://min.io/) |

## Private Data

All data is stored in your own PostgreSQL database. Multi-device access uses Headscale/Tailscale for encrypted WireGuard tunnels - no data is exposed to the public internet. Nothing is sent to external servers except what you explicitly configure (like Loom for video reflections).

## Acknowledgments

**Open Source:**
- [Memos](https://github.com/usememos/memos) - For the  note-taking experience (iframe)
- [Daylight](https://daylight.today/app/) - For the sun position screensaver inspiration (remade)
- [Cap](https://cap.so/docs/self-hosting) - For the video recording experience (iframe)
- [Immich](https://github.com/immich-app/immich) - For the photo gallery experience (iframe)

<!-- - [Headscale](https://github.com/juanfont/headscale) - Wireguard Control Server so no Tailscale account required -->

**Libraries:**
- [Phosphor Icons](https://phosphoricons.com/) - For beautiful, consistent icons
- [Loom SDK](https://www.loom.com/sdk) - For seamless video recording
- [Google Calendar API](https://developers.google.com/calendar/overview) - For calendar integration

**Inspiration:**
- [Tweek](https://tweek.so/) - Todos
- [BeaverHabits](https://beaverhabits.com/) - Habit tracking
- [Nook](https://github.com/mn6/nook-desktop) - Animal Crossing background music

