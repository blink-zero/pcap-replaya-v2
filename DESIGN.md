# PCAP Replaya v2 — Design Brief

## Overview
Complete redesign of pcap-replaya. Network packet replay tool using tcpreplay.
Original repo for reference: /tmp/pcap-replaya/

## Architecture

### Backend — FastAPI + SQLite
- **Framework:** FastAPI (async, auto OpenAPI docs)
- **Database:** SQLite via aiosqlite for replay history, config profiles
- **WebSocket:** FastAPI native WebSocket for real-time replay progress
- **Process management:** asyncio.subprocess for tcpreplay
- **PCAP analysis:** Scapy — protocol breakdown, top talkers, packet size distribution, conversation pairs
- **File storage:** Local filesystem with configurable upload dir
- **Auth:** Optional API key via environment variable (disabled by default)

### Frontend — React 18 + Tailwind CSS + shadcn/ui
- **Dark theme by default** (with light toggle)
- **Layout:** Sidebar navigation, single-page app feel
  - Sidebar items: Dashboard, Upload & Replay, History, Settings
- **Dashboard view:** Quick stats (total replays, files uploaded, system status), recent activity
- **Upload & Replay view (main view):**
  - Left panel: File upload (drag-drop) + file info/analysis
  - Right panel: Replay config + controls + live progress
  - PCAP analysis: Protocol donut chart, packet stats, top talkers
  - Real-time progress with animated indicators
- **History view:** Sortable/filterable table, bulk delete, re-replay, download PCAP, export CSV
- **Settings view:** Default interface, speed presets, config profiles, optional auth
- **Components:** Toast notifications (sonner), keyboard shortcuts, Framer Motion transitions
- **Charts:** Recharts for protocol breakdown and stats

### Docker
- **docker-compose.yml** with:
  - Backend: Python 3.12, FastAPI, uvicorn
  - Frontend: Node 20 build → nginx serve
  - Volumes for uploads and SQLite DB
  - Health checks
  - Host networking + privileged (for tcpreplay)

## API Endpoints (FastAPI)

### System
- GET /api/health
- GET /api/version  
- GET /api/interfaces
- GET /api/system/status

### Files
- POST /api/files/upload
- GET /api/files/{file_id}
- GET /api/files/{file_id}/analysis
- GET /api/files/{file_id}/download
- DELETE /api/files/{file_id}
- GET /api/files (list all uploaded files)

### Replay
- POST /api/replay/start
- POST /api/replay/stop
- GET /api/replay/status
- WebSocket /api/ws/replay — real-time progress

### History
- GET /api/history — paginated, filterable, sortable
- GET /api/history/{replay_id}
- DELETE /api/history/{replay_id}
- POST /api/history/export — CSV export

### Config Profiles
- GET /api/profiles
- POST /api/profiles
- PUT /api/profiles/{id}
- DELETE /api/profiles/{id}

## Key Improvements Over v1
1. Async backend (FastAPI vs Flask)
2. SQLite instead of JSON files
3. Dark theme, modern UI
4. Sidebar navigation vs endless scroll
5. Protocol analysis visualisations (charts)
6. Config profiles (save/reuse settings)
7. Multi-file management (upload many, replay any)
8. Better error handling and validation
9. Keyboard shortcuts
10. Toast notifications
11. CSV export for history
12. Optional auth for remote deployments

## Tech Stack
- Python 3.12, FastAPI, uvicorn, aiosqlite, scapy, psutil
- React 18, Tailwind CSS 3, shadcn/ui, Recharts, Framer Motion, sonner, lucide-react
- Docker, nginx, docker-compose

## File Structure
```
pcap-replaya-v2/
├── backend/
│   ├── main.py              # FastAPI app entry
│   ├── config.py            # Settings
│   ├── database.py          # SQLite setup
│   ├── models.py            # Pydantic models
│   ├── routers/
│   │   ├── files.py
│   │   ├── replay.py
│   │   ├── history.py
│   │   ├── system.py
│   │   └── profiles.py
│   ├── services/
│   │   ├── replay_service.py
│   │   ├── pcap_service.py
│   │   └── file_service.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Layout.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── Dashboard.tsx
│   │   │   ├── replay/
│   │   │   │   ├── FileUpload.tsx
│   │   │   │   ├── ReplayConfig.tsx
│   │   │   │   ├── ReplayControls.tsx
│   │   │   │   ├── ProgressMonitor.tsx
│   │   │   │   └── PcapAnalysis.tsx
│   │   │   ├── history/
│   │   │   │   └── ReplayHistory.tsx
│   │   │   └── settings/
│   │   │       └── Settings.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts
│   │   └── lib/
│   │       └── utils.ts
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── nginx.conf
└── README.md
```
