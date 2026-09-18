const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { startLocalServer } = require("../local-server.cjs");

test("bundled frontend serves assets and forwards JSON and audio on the same origin", async (t) => {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "note-static-test-"));
	t.after(() => fs.rm(root, { recursive: true, force: true }));
	await fs.writeFile(path.join(root, "index.html"), "<html>Bundled notes</html>");
	await fs.writeFile(path.join(root, "app.js"), "console.log('bundled');");
	const received = [];
	const backend = http.createServer(async (req, res) => {
		const chunks = [];
		for await (const chunk of req) chunks.push(chunk);
		received.push({ url: req.url, type: req.headers["content-type"], body: Buffer.concat(chunks).toString() });
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ ok: true }));
	});
	await new Promise((resolve) => backend.listen(0, "127.0.0.1", resolve));
	t.after(() => { backend.close(); backend.closeAllConnections(); });
	const { server, url } = await startLocalServer(root, backend.address().port);
	t.after(() => { server.close(); server.closeAllConnections(); });
	assert.match(await (await fetch(url)).text(), /Bundled notes/);
	assert.match((await fetch(`${url}/app.js`)).headers.get("content-type"), /javascript/);
	assert.equal((await fetch(`${url}/missing`)).status, 404);
	assert.equal((await fetch(`${url}/%2e%2e%2fsecret`)).status, 403);
	const payload = { transcript: "A synthetic note." };
	assert.equal((await fetch(`${url}/structure`, {
		method: "POST", headers: { "Content-Type": "application/json", Origin: url }, body: JSON.stringify(payload),
	})).status, 200);
	assert.deepEqual(JSON.parse(received[0].body), payload);
	const audio = new FormData();
	audio.append("file", new Blob(["synthetic audio"]), "fixture.wav");
	assert.equal((await fetch(`${url}/transcribe`, { method: "POST", body: audio })).status, 200);
	assert.match(received[1].type, /multipart\/form-data; boundary=/);
	assert.match(received[1].body, /fixture.wav/);
	assert.match(received[1].body, /synthetic audio/);
	assert.equal((await fetch(`${url}/structure`, { method: "POST", headers: { Origin: "https://example.com" } })).status, 403);
	assert.equal((await fetch(`${url}/structure`)).status, 405);
	backend.close();
	backend.closeAllConnections();
	assert.equal((await fetch(`${url}/structure`, { method: "POST" })).status, 502);
});
