import os
import sys
from pathlib import Path

from dotenv import load_dotenv


def backend_root() -> Path:
	if getattr(sys, "frozen", False):
		return Path(sys.executable).resolve().parent
	return Path(__file__).resolve().parent.parent


def bundled_resource_root() -> Path:
	if getattr(sys, "frozen", False):
		return Path(getattr(sys, "_MEIPASS"))
	return Path(__file__).resolve().parent.parent


def load_backend_env() -> Path:
	env_path = backend_root() / ".env"
	if not os.getenv("OPENAI_API_KEY"):
		load_dotenv(env_path)
	return env_path


def resource_path(*parts: str) -> Path:
	return bundled_resource_root().joinpath(*parts)
