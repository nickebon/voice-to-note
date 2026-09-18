// Exercises an installed .app through its real renderer and live API calls.
// OPENAI_API_KEY is used only to fill the onboarding form; never logged.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { _electron } = require("playwright");

async function run() {
	const executablePath = process.env.PACKAGED_APP_EXECUTABLE;
	const apiKey = process.env.OPENAI_API_KEY;
	assert.ok(executablePath && apiKey, "Set PACKAGED_APP_EXECUTABLE and OPENAI_API_KEY.");
	const evidence = process.env.PACKAGING_EVIDENCE_DIR || await fs.mkdtemp(path.join(os.tmpdir(), "notes-ui-evidence-"));
	await fs.mkdir(evidence, { recursive: true });
	const profile = await fs.mkdtemp(path.join(os.tmpdir(), "notes-ui-profile-"));
	const audioPath = path.join(evidence, "synthetic-session.wav");
	execFileSync("/usr/bin/say", ["-o", audioPath, "--file-format=WAVE", "--data-format=LEI16@22050",
		"This is a test session. The client practised stacking blocks. They stacked five blocks independently and asked for help with the sixth. Next session we will practise taking turns."]);
	const env = {
		HOME: process.env.HOME,
		TMPDIR: process.env.TMPDIR || os.tmpdir(),
		PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
	};
	let electronApp;
	const report = { executablePath, evidence, checks: [] };
	const logs = [];
	const launch = async () => {
		const application = await _electron.launch({ executablePath, args: [`--user-data-dir=${profile}`], env, cwd: os.tmpdir(), timeout: 60000 });
		application.process().stdout.on("data", (chunk) => logs.push(chunk.toString()));
		application.process().stderr.on("data", (chunk) => logs.push(chunk.toString()));
		return application;
	};
	try {
		electronApp = await launch();
		const metadata = await electronApp.evaluate(async ({ app, nativeImage }) => ({
			packaged: app.isPackaged,
			appPath: app.getAppPath(),
			userData: app.getPath("userData"),
			iconSize: nativeImage.createFromPath(`${app.getAppPath()}/assets/icon.png`).getSize(),
			version: app.getVersion(),
		}));
		assert.equal(metadata.packaged, true);
		assert.equal(await fs.realpath(metadata.userData), await fs.realpath(profile), "Must use an isolated profile, never the existing user's key.");
		assert.ok(metadata.iconSize.width > 0);
		report.metadata = metadata;
		const page = await electronApp.firstWindow();
		page.setDefaultTimeout(120000);
		const errors = [];
		page.on("pageerror", (error) => errors.push(error.message));
		const requests = [];
		page.on("request", (request) => {
			const route = new URL(request.url()).pathname;
			if (route === "/structure" || route === "/transcribe") {
				requests.push({ route, body: route === "/structure" ? request.postDataJSON() : undefined });
			}
		});
		await page.getByRole("heading", { name: "Enter your OpenAI API key to get started" }).waitFor();
		assert.equal(await page.title(), "miss jo's notes");
		assert.ok(!page.url().includes(":5173"));
		await page.evaluate(() => document.fonts.ready);
		assert.ok(await page.evaluate(() => document.fonts.check('16px "Coming Soon"')));
		await page.screenshot({ path: path.join(evidence, "01-onboarding.png") });
		report.checks.push("Fresh profile shows onboarding; bundled frontend, font and icon loaded.");
		await page.getByLabel("OpenAI API key").fill(apiKey);
		await page.getByRole("button", { name: "Save", exact: true }).click();
		await page.getByRole("button", { name: "Type it out", exact: true }).waitFor();
		const encryptedKey = await fs.readFile(path.join(profile, "openai-api-key.json"), "utf8");
		assert.ok(!encryptedKey.includes(apiKey));
		report.checks.push("API key saved through UI using encrypted storage; bundled backend started.");
		await page.getByRole("button", { name: "Type it out", exact: true }).click();
		const typed = "Test session: The client stacked five blocks independently. Next session, practise taking turns.";
		await page.getByLabel("What happened in the session?").fill(typed);
		await page.getByRole("button", { name: "Create note", exact: true }).click();
		await page.getByRole("heading", { name: "Your note", exact: true }).waitFor();
		const typedResult = await page.locator("pre").first().innerText();
		assert.match(typedResult, /Subjective/);
		assert.match(typedResult, /Observations/);
		assert.match(typedResult, /Plans Moving Forward/);
		assert.equal(await page.locator("pre").nth(1).innerText(), typed);
		assert.deepEqual(requests, [{ route: "/structure", body: { transcript: typed } }]);
		await page.screenshot({ path: path.join(evidence, "02-typed-result.png") });
		report.checks.push("Typed note created through UI and live API; no transcription or quick_note; default format used.");
		await page.getByRole("button", { name: /Process another note/ }).click();
		await page.getByPlaceholder("Add a quick note...").fill("They also asked for another turn.");
		await page.getByRole("button", { name: "Customise note format" }).click();
		await page.getByLabel("How should this note be formatted?").fill("Keep dot points brief.");
		await page.locator('input[type="file"]').setInputFiles(audioPath);
		await page.getByLabel("Upload complete").waitFor();
		await page.screenshot({ path: path.join(evidence, "03-audio-ready.png") });
		await page.getByRole("button", { name: "Create note", exact: true }).click();
		await page.getByRole("heading", { name: "Your note", exact: true }).waitFor();
		assert.match(await page.locator("pre").nth(1).innerText(), /blocks/i);
		assert.match(await page.locator("pre").first().innerText(), /Observations/);
		assert.deepEqual(requests.map(({ route }) => route), ["/structure", "/transcribe", "/structure"]);
		assert.equal(requests[2].body.quick_note, "They also asked for another turn.");
		assert.equal(requests[2].body.structure_instruction, "Keep dot points brief.");
		await page.screenshot({ path: path.join(evidence, "04-audio-result.png") });
		report.checks.push("Audio file uploaded via UI, transcribed by live API, then structured with quick notes and format guidance.");
		assert.deepEqual(errors, []);
		const firstUrl = page.url();
		await electronApp.close();
		electronApp = null;
		await assert.rejects(fetch(firstUrl));
		report.checks.push("Quitting stops the bundled frontend server.");
		electronApp = await launch();
		const reopened = await electronApp.firstWindow();
		await reopened.getByRole("button", { name: "Type it out", exact: true }).waitFor({ timeout: 60000 });
		await reopened.screenshot({ path: path.join(evidence, "05-relaunch.png") });
		report.checks.push("Relaunch decrypts the stored key and starts backend without onboarding again.");
		await reopened.getByRole("button", { name: "Change API key" }).click();
		await reopened.getByRole("button", { name: "Clear saved key" }).click();
		await reopened.getByRole("button", { name: "Clear saved key" }).waitFor({ state: "hidden" });
		await assert.rejects(fs.access(path.join(profile, "openai-api-key.json")));
		report.checks.push("Test API key cleared through UI.");
		console.log(JSON.stringify(report, null, 2));
	} finally {
		if (electronApp) await electronApp.close();
		// Remove only the isolated encrypted test key if a test failed mid-run.
		await fs.rm(path.join(profile, "openai-api-key.json"), { force: true });
		await fs.writeFile(path.join(evidence, "report.json"), JSON.stringify(report, null, 2));
		await fs.writeFile(path.join(evidence, "electron.log"), logs.join(""));
	}
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
