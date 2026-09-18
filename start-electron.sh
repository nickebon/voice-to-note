#!/bin/zsh

set -euo pipefail

PROJECT_ROOT="${0:A:h}"
BACKEND_EXECUTABLE="$PROJECT_ROOT/backend/dist/voice-to-note-backend"
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
	echo "Stopping Electron development services..."
	kill_process_tree "$FRONTEND_PID"
	echo "Voice-to-Note desktop dev session stopped."
}

trap cleanup INT TERM EXIT

backend_needs_build() {
	if [[ ! -x "$BACKEND_EXECUTABLE" ]]; then
		return 0
	fi

	local newer_source
	newer_source=$(
		find "$PROJECT_ROOT/backend" \
			\( -path "$PROJECT_ROOT/backend/.venv" -o -path "$PROJECT_ROOT/backend/build" -o -path "$PROJECT_ROOT/backend/dist" -o -path "$PROJECT_ROOT/backend/__pycache__" \) -prune \
			-o \( -name "*.py" -o -name "*.txt" -o -name "requirements.txt" -o -name "build.sh" \) -newer "$BACKEND_EXECUTABLE" -print -quit
	)

	[[ -n "$newer_source" ]]
}

if backend_needs_build; then
	echo "Building backend executable..."
	"$PROJECT_ROOT/backend/build.sh"
fi

echo "Starting Vite dev server..."
(
	trap - INT TERM EXIT
	cd "$PROJECT_ROOT/frontend"
	npm run dev
) &
FRONTEND_PID=$!

echo "Starting Electron..."
cd "$PROJECT_ROOT/frontend"
env -u ELECTRON_RUN_AS_NODE npm run electron
