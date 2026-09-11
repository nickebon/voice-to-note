const { app, BrowserWindow, dialog, nativeImage } = require("electron/main");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const APP_NAME = "miss jo's notes";
const FRONTEND_URL = process.env.ELECTRON_RENDERER_URL || "http://localhost:5173";
const BACKEND_PORT = process.env.PORT || "8000";
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}/docs`;
const BACKEND_EXECUTABLE = path.join(PROJECT_ROOT, "backend", "dist", "voice-to-note-backend");
const BACKEND_ENV_FILE = path.join(PROJECT_ROOT, "backend", ".env");
const APP_ICON_PNG = path.join(PROJECT_ROOT, "electron", "assets", "icon.png");
const APP_ICON_ICNS = path.join(PROJECT_ROOT, "electron", "assets", "icon.icns");

let backendProcess = null;
let mainWindow = null;
let isQuitting = false;

function parseDotenv(contents) {
	const values = {};

	for (const line of contents.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}

		const separatorIndex = trimmed.indexOf("=");
		if (separatorIndex === -1) {
			continue;
		}

		const key = trimmed.slice(0, separatorIndex).trim();
		let value = trimmed.slice(separatorIndex + 1).trim();

		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}

		values[key] = value;
	}

	return values;
}

function loadBackendEnv() {
	if (!fs.existsSync(BACKEND_ENV_FILE)) {
		return {};
	}

	return parseDotenv(fs.readFileSync(BACKEND_ENV_FILE, "utf8"));
}

function pipePrefixed(stream, prefix) {
	stream.setEncoding("utf8");
	stream.on("data", (chunk) => {
		for (const line of chunk.split(/\r?\n/)) {
			if (line) {
				console.log(`${prefix}${line}`);
			}
		}
	});
}

function startBackend() {
	if (backendProcess) {
		return;
	}

	if (!fs.existsSync(BACKEND_EXECUTABLE)) {
		throw new Error(
			`Backend executable not found at ${BACKEND_EXECUTABLE}. Run ./backend/build.sh first.`,
		);
	}

	const childEnv = {
		...loadBackendEnv(),
		...process.env,
		PORT: BACKEND_PORT,
	};

	backendProcess = spawn(BACKEND_EXECUTABLE, [], {
		cwd: path.dirname(BACKEND_EXECUTABLE),
		env: childEnv,
		stdio: ["ignore", "pipe", "pipe"],
	});

	pipePrefixed(backendProcess.stdout, "[backend] ");
	pipePrefixed(backendProcess.stderr, "[backend] ");

	backendProcess.on("error", (error) => {
		console.error("[electron] Backend process failed to start:", error);
	});

	backendProcess.on("exit", (code, signal) => {
		console.log(`[electron] Backend process exited (code=${code}, signal=${signal}).`);
		backendProcess = null;
		if (!isQuitting) {
			dialog.showErrorBox(
				"Backend stopped",
				`The backend executable exited unexpectedly (code=${code}, signal=${signal}).`,
			);
			app.quit();
		}
	});
}

function stopBackend() {
	if (!backendProcess) {
		return;
	}

	const processToStop = backendProcess;
	backendProcess = null;

	if (processToStop.exitCode !== null) {
		return;
	}

	processToStop.kill("SIGTERM");

	const forceKillTimer = setTimeout(() => {
		if (processToStop.exitCode === null) {
			processToStop.kill("SIGKILL");
		}
	}, 5000);
	forceKillTimer.unref();
}

function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function pingUrl(url) {
	return new Promise((resolve, reject) => {
		const target = new URL(url);
		const client = target.protocol === "https:" ? https : http;
		const request = client.request(
			target,
			{ method: "GET" },
			(response) => {
				response.resume();
				resolve(response.statusCode || 0);
			},
		);

		request.on("error", reject);
		request.setTimeout(2000, () => {
			request.destroy(new Error(`Timed out waiting for ${url}`));
		});
		request.end();
	});
}

async function waitForUrl(url, label, timeoutMs = 30000) {
	const deadline = Date.now() + timeoutMs;
	let lastError = null;

	while (Date.now() < deadline) {
		try {
			await pingUrl(url);
			return;
		} catch (error) {
			lastError = error;
			await wait(500);
		}
	}

	const reason = lastError instanceof Error ? lastError.message : String(lastError);
	throw new Error(`Timed out waiting for ${label} at ${url}. Last error: ${reason}`);
}

async function createMainWindow() {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 840,
		minWidth: 900,
		minHeight: 640,
		title: APP_NAME,
		icon: APP_ICON_PNG,
		webPreferences: {
			contextIsolation: true,
			sandbox: true,
		},
	});

	mainWindow.on("closed", () => {
		mainWindow = null;
	});

	mainWindow.webContents.once("did-finish-load", () => {
		console.log("[electron] Frontend loaded in Electron window.");
	});

	await mainWindow.loadURL(FRONTEND_URL);
}

async function boot() {
	app.setName(APP_NAME);

	if (process.platform === "darwin" && app.dock && fs.existsSync(APP_ICON_PNG)) {
		app.dock.setIcon(nativeImage.createFromPath(APP_ICON_PNG));
	}

	startBackend();
	await Promise.all([
		waitForUrl(BACKEND_URL, "packaged backend"),
		waitForUrl(FRONTEND_URL, "Vite dev server"),
	]);
	await createMainWindow();
}

app.on("window-all-closed", () => {
	isQuitting = true;
	stopBackend();
	app.quit();
});

app.on("before-quit", () => {
	isQuitting = true;
	stopBackend();
});

app.whenReady().then(boot).catch((error) => {
	console.error("[electron] Failed to start app:", error);
	dialog.showErrorBox("Unable to start desktop app", error.message);
	isQuitting = true;
	stopBackend();
	app.quit();
});
