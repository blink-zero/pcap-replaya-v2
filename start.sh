#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🎬 PCAP Replaya v2 — Quick Start${NC}"
echo ""

# Check Docker
if ! command -v docker &>/dev/null; then
    echo -e "${RED}✗ Docker not found. Install: https://docs.docker.com/get-docker/${NC}"
    exit 1
fi

if ! docker compose version &>/dev/null; then
    echo -e "${RED}✗ Docker Compose not found. Install: https://docs.docker.com/compose/install/${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker & Compose detected"

# Create .env if missing
if [ ! -f .env ]; then
    cp .env.example .env 2>/dev/null || true
    echo -e "${GREEN}✓${NC} Created .env from example"
fi

# Build & start
echo ""
echo -e "${CYAN}Building and starting services...${NC}"
docker compose up -d --build

echo ""
echo -e "${GREEN}✓ PCAP Replaya v2 is running!${NC}"
echo -e "  Frontend: http://localhost:80"
echo -e "  Backend:  http://localhost:8000"
echo -e "  API Docs: http://localhost:8000/docs"
echo ""
echo -e "Stop with: docker compose down"
