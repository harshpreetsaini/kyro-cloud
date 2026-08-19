import { createServer } from "http";
import next from "next";
import { parse } from "url";
import { setupWebSocket } from "./lib/ws/server.mjs";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  });
  setupWebSocket(server);
  server.listen(port, () => {
    console.log(`KYRO CLOUD ready on http://localhost:${port}`);
  });
});
