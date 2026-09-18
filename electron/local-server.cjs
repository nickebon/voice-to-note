const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const MIME_TYPES = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".woff2": "font/woff2",
	".woff": "font/woff",
	".ico": "image/x-icon",
};

// Keep the renderer's relative API URLs working without a Vite dev server.
// Both servers are private to this app and bind only to loopback.
async function startLocalServer(frontendDirectory, backendPort) {
	const root = path.resolve(frontendDirectory);
	await fs.promises.access(path.join(root, "index.html"));
	let origin;
	const server = http.createServer(async (request, response) => {
		if (request.headers.host !== new URL(origin).host ||
			(request.headers.origin && request.headers.origin !== origin)) {
			response.writeHead(403).end();
			return;
		}

		try {
			const pathname = decodeURIComponent(new URL(request.url, origin).pathname);
			if (pathname === "/transcribe" || pathname === "/structure") {
				if (request.method !== "POST") {
					response.writeHead(405).end();
					return;
				}
				const upstream = http.request({
					hostname: "127.0.0.1",
					port: backendPort,
					path: pathname,
					method: "POST",
					headers: { ...request.headers, host: `127.0.0.1:${backendPort}` },
				}, (backendResponse) => {
					response.writeHead(backendResponse.statusCode, backendResponse.headers);
					backendResponse.pipe(response);
				});
				upstream.on("error", () => {
					if (!response.headersSent) response.writeHead(502);
					response.end("The note service is unavailable.");
				});
				response.on("close", () => upstream.destroy());
				request.pipe(upstream);
				return;
			}

			if (request.method !== "GET" && request.method !== "HEAD") {
				response.writeHead(405).end();
				return;
			}
			const filePath = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
			if (!filePath.startsWith(root + path.sep)) {
				response.writeHead(403).end();
				return;
			}
			const contents = await fs.promises.readFile(filePath);
			response.writeHead(200, {
				"Content-Type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream",
				"X-Content-Type-Options": "nosniff",
			});
			response.end(request.method === "HEAD" ? undefined : contents);
		} catch {
			response.writeHead(404).end();
		}
	});
	await new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolve);
	});
	origin = `http://127.0.0.1:${server.address().port}`;
	return { server, url: origin };
}

module.exports = { startLocalServer };
