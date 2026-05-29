import { readConfig } from "./config";
import { createServer } from "./server";

const config = readConfig();

createServer().listen(config.port, () => {
  console.log(`api listening on ${config.port}`);
});
