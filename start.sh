#!/bin/zsh
# Starts the Voice-to-Note backend and frontend, then opens the app in a browser.

set -e

PROJECT_ROOT="${0:A:h}"
BACKEND_PID=""
FRONTEND_PID=""
CLEANUP_COMPLETE=0

kill_process_tree() {
  local pid="$1"
  local child_pid

  [[ -z "$pid" ]] && return

  for child_pid in $(pgrep -P "$pid" 2>/dev/null || true); do
    kill_process_tree "$child_pid"
  done

  kill "$pid" 2>/dev/null || true
}

cleanup() {
  [[ "$CLEANUP_COMPLETE" == "1" ]] && return
  CLEANUP_COMPLETE=1
  trap - INT TERM EXIT
  echo "Stopping backend and frontend..."
  kill_process_tree "$BACKEND_PID"
  kill_process_tree "$FRONTEND_PID"
  echo "Voice-to-Note stopped."
}

trap cleanup INT TERM EXIT

cd "$PROJECT_ROOT"

echo "Starting backend..."
(
  trap - INT TERM EXIT
  source "$PROJECT_ROOT/backend/.venv/bin/activate"
  cd "$PROJECT_ROOT/backend"
  uvicorn main:app --reload
) &
BACKEND_PID=$!

echo "Starting frontend..."
(
  trap - INT TERM EXIT
  cd "$PROJECT_ROOT/frontend"
  npm run dev
) &
FRONTEND_PID=$!

echo "Waiting for services to start..."
sleep 2

echo "Opening app in browser..."
open "http://localhost:5173"

echo "App is running at http://localhost:5173"
echo "Press Ctrl+C to stop both services."

wait "$BACKEND_PID" "$FRONTEND_PID"
