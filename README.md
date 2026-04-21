# 🎬 PCAP Replaya v2

[![Build & publish images](https://github.com/blink-zero/pcap-replaya-v2/actions/workflows/build.yml/badge.svg)](https://github.com/blink-zero/pcap-replaya-v2/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](docker-compose.yml)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-3776AB?logo=python)](backend/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)](frontend/)

A modern web-based PCAP replay and analysis tool. Upload packet captures, analyze protocols, and replay traffic to network interfaces — all from a sleek browser UI.

---

## ✨ Features

- **📁 PCAP File Management** — Upload, browse, and manage PCAP/PCAPNG files (up to 1GB)
- **🔍 Deep Packet Analysis** — Protocol breakdown, conversation tracking, packet-level inspection via tshark
- **▶️ Traffic Replay** — Replay captures to any network interface using tcpreplay with real-time speed control
- **📊 Live Progress** — WebSocket-powered real-time replay progress and statistics
- **⏱️ Replay History** — Full history of all replay sessions with detailed stats
- **📋 Replay Profiles** — Save and reuse replay configurations (speed, loops, interface)
- **🔐 Optional API Key Auth** — Secure your instance with a single API key
- **🌙 Dark Mode UI** — Modern React frontend with Tailwind CSS and Framer Motion animations
- **🐳 Docker Ready** — One-command deployment with Docker Compose

---

## 🚀 Quick Start

```bash
git clone https://github.com/blink-zero/pcap-replaya-v2.git
cd pcap-replaya-v2
chmod +x start.sh
./start.sh
```

Or manually:

```bash
cp .env.example .env    # Edit as needed
docker compose up -d --build
```

Open **http://localhost** in your browser.

> **Note:** The backend runs with `network_mode: host` and `privileged: true` to access network interfaces for tcpreplay.

---

## 🐳 Pre-built images

Images are published to GitHub Container Registry on every push to `main` and on every tagged release:

- `ghcr.io/blink-zero/pcap-replaya-v2-backend`
- `ghcr.io/blink-zero/pcap-replaya-v2-frontend`

Both images are built for `linux/amd64` and `linux/arm64`. To run without building locally:

```bash
cp .env.example .env    # Edit as needed
docker compose -f docker-compose.prod.yml up -d
```

Available tags:

| Tag | Description |
|---|---|
| `latest` | Latest build from `main` |
| `v1.2.3`, `v1.2`, `v1` | Semver tags (published when a `v*` git tag is pushed) |
| `sha-<short>` | Immutable build pinned to a specific commit |
| `main` | Alias for the latest `main` build |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│              http://localhost:80                  │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│              Nginx (Frontend)                    │
│         Static files + Reverse proxy             │
│                                                  │
│   /          → React SPA                         │
│   /api/*     → Backend proxy (localhost:8000)    │
│   /api/ws/*  → WebSocket proxy (upgrade)         │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│         FastAPI Backend (host network)           │
│              localhost:8000                       │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  Files   │ │  Replay  │ │  Analysis        │ │
│  │  Router  │ │  Router  │ │  (tshark/scapy)  │ │
│  └────┬─────┘ └────┬─────┘ └────────┬─────────┘ │
│       │             │                │           │
│  ┌────▼─────────────▼────────────────▼─────────┐ │
│  │  SQLite DB  │  Upload Storage  │ tcpreplay  │ │
│  └─────────────┴──────────────────┴────────────┘ │
└──────────────────────────────────────────────────┘
```

---

## 📡 API Summary

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/system/interfaces` | GET | List network interfaces |
| `/api/system/stats` | GET | System statistics |
| `/api/files` | GET | List uploaded PCAPs |
| `/api/files/upload` | POST | Upload PCAP file |
| `/api/files/{id}` | GET | File details + analysis |
| `/api/files/{id}` | DELETE | Delete file |
| `/api/replay/start` | POST | Start replay session |
| `/api/replay/{id}/stop` | POST | Stop active replay |
| `/api/ws/replay/{id}` | WS | Live replay progress |
| `/api/history` | GET | Replay history |
| `/api/profiles` | GET/POST | Replay profiles |
| `/api/profiles/{id}` | PUT/DELETE | Manage profiles |

Full interactive docs at **http://localhost:8000/docs** (Swagger UI).

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Framer Motion, Vite |
| **Backend** | Python 3.12, FastAPI, Uvicorn, Scapy, aiosqlite |
| **Replay** | tcpreplay |
| **Analysis** | tshark, Scapy |
| **Database** | SQLite |
| **Proxy** | Nginx |
| **Container** | Docker, Docker Compose |

---

## 💻 Development Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev    # Vite dev server on :5173
```

Configure Vite to proxy `/api` to `localhost:8000` for local development.

---

## ⚙️ Configuration

All settings via environment variables (prefix `PCAP_`):

| Variable | Default | Description |
|---|---|---|
| `PCAP_DEBUG` | `false` | Enable debug logging |
| `PCAP_HOST` | `0.0.0.0` | Backend bind address |
| `PCAP_PORT` | `8000` | Backend port |
| `PCAP_API_KEY` | *(empty)* | API key for auth (disabled if empty) |
| `PCAP_CORS_ORIGINS` | `*` | Allowed CORS origins |
| `PCAP_UPLOAD_FOLDER` | `/data/uploads` | Upload storage path |
| `PCAP_DB_PATH` | `/data/pcap-replaya-v2.db` | SQLite database path |
| `PCAP_MAX_FILE_SIZE` | `1073741824` | Max upload size (bytes, default 1GB) |
| `PCAP_ANALYSIS_PACKET_LIMIT` | `500000` | Max packets to analyze |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
