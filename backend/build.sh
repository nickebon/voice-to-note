#!/bin/zsh

set -euo pipefail

BACKEND_DIR="${0:A:h}"
PROJECT_ROOT="${BACKEND_DIR:h}"
PYINSTALLER_BIN="$BACKEND_DIR/.venv/bin/pyinstaller"

if [[ ! -x "$PYINSTALLER_BIN" ]]; then
	echo "PyInstaller is not installed in backend/.venv."
	echo "Run: $BACKEND_DIR/.venv/bin/python -m pip install -r $BACKEND_DIR/requirements.txt"
	exit 1
fi

PYINSTALLER_CONFIG_DIR="$PROJECT_ROOT/.pyinstaller" \
"$PYINSTALLER_BIN" \
	--clean \
	--noconfirm \
	--onefile \
	--name voice-to-note-backend \
	--distpath "$BACKEND_DIR/dist" \
	--workpath "$BACKEND_DIR/build" \
	--specpath "$BACKEND_DIR" \
	--add-data "$BACKEND_DIR/prompts/structuring_prompt.txt:prompts" \
	"$BACKEND_DIR/main.py"
