import { existsSync } from "node:fs";
import { readConfig } from "./config";
import { createServer } from "./server";

// Load .env only when the file exists (local dev).
// On VPS, env vars are supplied by pm2 ecosystem or system environment.
if (existsSync(".env")) {
  // process.loadEnvFile is available in Node.js 20.12+
  (process as typeof process & { loadEnvFile?: (p: string) => void }).loadEnvFile?.(".env");
}

const config = readConfig();

createServer().listen(config.port, () => {
  console.log(`api listening on ${config.port}`);
});
