import { loadEnvFile } from "node:process";
import { readConfig } from "./config";
import { createServer } from "./server";

try { loadEnvFile?.(".env"); } catch { /* .env not required – use system env vars */ }

const config = readConfig();

createServer().listen(config.port, () => {
  console.log(`api listening on ${config.port}`);
});
