const { app, BrowserWindow, dialog, ipcMain, nativeImage, safeStorage } = require("electron/main");
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
const PRELOAD_SCRIPT = path.join(PROJECT_ROOT, "electron", "preload.cjs");

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

function apiKeyStorePath() {
	return path.join(app.getPath("userData"), "openai-api-key.json");
}

async function isEncryptionAvailable() {
	if (typeof safeStorage.isAsyncEncryptionAvailable === "function") {
		return safeStorage.isAsyncEncryptionAvailable();
	}
	return safeStorage.isEncryptionAvailable();
}

async function encryptString(plainText) {
	if (typeof safeStorage.encryptStringAsync === "function") {
		return safeStorage.encryptStringAsync(plainText);
	}
	return safeStorage.encryptString(plainText);
}

async function decryptString(encryptedBuffer) {
	if (typeof safeStorage.decryptStringAsync === "function") {
		const decrypted = await safeStorage.decryptStringAsync(encryptedBuffer);
		if (typeof decrypted === "string") {
			return { result: decrypted, shouldReEncrypt: false };
		}
		return decrypted;
	}

	return {
		result: safeStorage.decryptString(encryptedBuffer),
		shouldReEncrypt: false,
	};
}

async function readStoredApiKeyRecord() {
	try {
		const fileContents = await fs.promises.readFile(apiKeyStorePath(), "utf8");
		const record = JSON.parse(fileContents);
		if (!record || typeof record.encrypted !== "string") {
			return null;
		}
		return record;
	} catch (error) {
		if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
			return null;
		}
		throw error;
	}
}

async function persistApiKey(apiKey) {
	const trimmedKey = apiKey.trim();
	if (!trimmedKey) {
		throw new Error("Please enter an API key.");
	}

	if (!(await isEncryptionAvailable())) {
		throw new Error("Secure storage is not available on this device.");
	}

	const encrypted = await encryptString(trimmedKey);
	const record = {
		version: 1,
		encrypted: encrypted.toString("base64"),
	};

	await fs.promises.mkdir(path.dirname(apiKeyStorePath()), { recursive: true });
	await fs.promises.writeFile(apiKeyStorePath(), JSON.stringify(record), "utf8");
	return trimmedKey;
}

async function getStoredApiKey() {
	const record = await readStoredApiKeyRecord();
	if (!record) {
		return null;
	}

	const decrypted = await decryptString(Buffer.from(record.encrypted, "base64"));
	if (decrypted.shouldReEncrypt) {
		await persistApiKey(decrypted.result);
	}

	return decrypted.result;
}

async function clearStoredApiKey() {
	try {
		await fs.promises.unlink(apiKeyStorePath());
	} catch (error) {
		if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
			throw error;
		}
	}
}

function registerIpcHandlers() {
	ipcMain.handle("api-key:get-status", async () => {
		try {
			return { hasStoredApiKey: Boolean(await getStoredApiKey()) };
		} catch (error) {
			console.error("[electron] Failed to read stored API key:", error);
			return { hasStoredApiKey: false };
		}
	});

	ipcMain.handle("api-key:save", async (_event, apiKey) => {
		const storedKey = await persistApiKey(String(apiKey || ""));
		await restartBackend(storedKey);
		return { hasStoredApiKey: true };
	});

	ipcMain.handle("api-key:clear", async () => {
		await clearStoredApiKey();
		await stopBackend();
		return { hasStoredApiKey: false };
	});
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

async function waitForProcessExit(childProcess) {
	if (childProcess.exitCode !== null) {
		return;
	}

	await new Promise((resolve) => {
		const forceKillTimer = setTimeout(() => {
			if (childProcess.exitCode === null) {
				childProcess.kill("SIGKILL");
			}
		}, 5000);
		forceKillTimer.unref();

		childProcess.once("exit", () => {
			clearTimeout(forceKillTimer);
			resolve();
		});

		childProcess.kill("SIGTERM");
	});
}

async function startBackend(apiKeyOverride) {
	if (backendProcess) {
		return;
	}

	if (!fs.existsSync(BACKEND_EXECUTABLE)) {
		throw new Error(
			`Backend executable not found at ${BACKEND_EXECUTABLE}. Run ./backend/build.sh first.`,
		);
	}

	const storedApiKey = apiKeyOverride ?? (await getStoredApiKey());
	if (!storedApiKey) {
		return;
	}

	const childEnv = {
		...loadBackendEnv(),
		...process.env,
		OPENAI_API_KEY: storedApiKey,
		PORT: BACKEND_PORT,
	};

	const childProcess = spawn(BACKEND_EXECUTABLE, [], {
		cwd: path.dirname(BACKEND_EXECUTABLE),
		env: childEnv,
		stdio: ["ignore", "pipe", "pipe"],
	});

	childProcess.expectedStop = false;
	backendProcess = childProcess;

	pipePrefixed(childProcess.stdout, "[backend] ");
	pipePrefixed(childProcess.stderr, "[backend] ");

	childProcess.on("error", (error) => {
		console.error("[electron] Backend process failed to start:", error);
	});

	childProcess.on("exit", (code, signal) => {
		console.log(`[electron] Backend process exited (code=${code}, signal=${signal}).`);
		if (backendProcess === childProcess) {
			backendProcess = null;
		}
		if (!isQuitting && !childProcess.expectedStop) {
			dialog.showErrorBox(
				"Backend stopped",
				`The backend executable exited unexpectedly (code=${code}, signal=${signal}).`,
			);
			app.quit();
		}
	});

	await waitForUrl(BACKEND_URL, "packaged backend");
}

async function stopBackend() {
	if (!backendProcess) {
		return;
	}

	const processToStop = backendProcess;
	backendProcess = null;
	processToStop.expectedStop = true;

	await waitForProcessExit(processToStop);
}

async function restartBackend(apiKeyOverride) {
	await stopBackend();
	await startBackend(apiKeyOverride);
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
			preload: PRELOAD_SCRIPT,
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
	registerIpcHandlers();

	if (process.platform === "darwin" && app.dock && fs.existsSync(APP_ICON_PNG)) {
		app.dock.setIcon(nativeImage.createFromPath(APP_ICON_PNG));
	}

	await waitForUrl(FRONTEND_URL, "Vite dev server");
	await createMainWindow();

	if (await getStoredApiKey()) {
		await startBackend();
	}
}

app.on("window-all-closed", () => {
	isQuitting = true;
	void stopBackend();
	app.quit();
});

app.on("before-quit", () => {
	isQuitting = true;
	void stopBackend();
});

app.whenReady().then(boot).catch((error) => {
	console.error("[electron] Failed to start app:", error);
	dialog.showErrorBox("Unable to start desktop app", error.message);
	isQuitting = true;
	void stopBackend();
	app.quit();
});
