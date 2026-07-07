/**
 * Custom Node server: Next.js request handler + native WebSocket endpoint
 * (/api/ws/game). This file is the "Application Startup File" for Plesk.
 *
 * Requires `npm run build` first in production (compiles both the Next app
 * and the WebSocket server bundle in dist-server/).
 */
const { createServer } = require("node:http");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "0.0.0.0";
const port = parseInt(process.env.PORT || "5000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    // Loaded after prepare() so Next has already populated process.env from .env.
    const { attachGameWebSocketServer } = require("./dist-server/ws-server");

    const server = createServer((req, res) => {
      handle(req, res);
    });

    attachGameWebSocketServer(server);

    server.listen(port, hostname, () => {
      console.log(
        `> Ready on http://${hostname}:${port} (${dev ? "dev" : "production"})`,
      );
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
