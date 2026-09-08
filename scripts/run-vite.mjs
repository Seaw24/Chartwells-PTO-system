import { build, createServer, preview } from "vite";
import config from "../vite.config.js";
const options = { ...config, configFile: false };
if (process.argv.includes("--dev")) {
  const server = await createServer(options);
  await server.listen();
  server.printUrls();
} else if (process.argv.includes("--preview")) {
  const server = await preview(options);
  server.printUrls();
} else await build(options);
