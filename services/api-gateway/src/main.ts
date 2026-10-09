import "dotenv/config";
import { createApp } from "./app";
const port = Number(process.env.PORT || 8081);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw Error("Invalid PORT");
const server = createApp().listen(port);
server.requestTimeout = 65000;
server.headersTimeout = 10000;
function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
