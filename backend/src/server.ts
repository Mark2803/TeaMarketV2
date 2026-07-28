import app from "./app.js";
import { env } from "./config/env.js";
import { disconnectDatabase } from "./database/prisma.js";

const server = app.listen(env.PORT, () => {
  console.log(
    `Server started on port ${env.PORT}`
  );
});

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal}: stopping server`);

  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});