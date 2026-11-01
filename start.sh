#!/usr/bin/env bash
set -e

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}         Launching SteamRAG Cloud Server            ${NC}"
echo -e "${CYAN}  Cloud Video-Game Intelligence & Analytics Agent   ${NC}"
echo -e "${CYAN}====================================================${NC}"

# Ensure Python Virtualenv & All Requirements Installed
if [ ! -f "backend/.venv/bin/python" ]; then
    echo "Creating Python virtual environment in backend/.venv..."
    rm -rf backend/.venv
    python3 -m venv backend/.venv
fi
echo "Ensuring Python dependencies from backend/requirements.txt are installed..."
backend/.venv/bin/python -m pip install -q -r backend/requirements.txt

# Ensure Frontend Node Modules Installed
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    (cd frontend && npm install)
fi

# Clean up subprocesses on exit
cleanup() {
    echo -e "\nShutting down SteamRAG Cloud Server..."
    kill $(jobs -p) 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Start Backend (Cloud-Only Mode)
echo -e "${GREEN}Starting FastAPI Cloud Backend on http://0.0.0.0:8000...${NC}"
cd backend
PYTHONPATH=. .venv/bin/python run.py &
BACKEND_PID=$!
cd ..

# Start Frontend
echo -e "${GREEN}Starting Vite frontend on http://0.0.0.0:5173...${NC}"
cd frontend
npm run dev -- --host &
FRONTEND_PID=$!
cd ..

echo -e "\n${GREEN}☁️ SteamRAG Cloud Server is live!${NC}"
echo -e "Frontend UI (Dev):      ${CYAN}http://localhost:5173${NC}"
echo -e "Unified Server / API:   ${CYAN}http://localhost:8000${NC}"
echo -e "Press Ctrl+C to terminate."

wait
