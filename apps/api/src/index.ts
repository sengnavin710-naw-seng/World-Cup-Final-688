import { loadEnvFile } from "node:process";
import { readConfig } from "./config";
import { createServer } from "./server";

loadEnvFile?.(".env");

const config = readConfig();

createServer().listen(config.port, () => {
  console.log(`api listening on ${config.port}`);
});
