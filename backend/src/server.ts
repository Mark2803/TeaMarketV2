import app from "./app.js";
import { env } from "./config/env.js";
import { disconnectDatabase } from "./database/prisma.js";
import { startYandexDeliverySync } from "./modules/orders/yandex-delivery-sync.js";
import { startYandexShipmentReconciliation } from "./modules/moderator/yandex-shipments.service.js";

startYandexDeliverySync();
startYandexShipmentReconciliation();

const server = app.listen(env.PORT, () => {
  console.log(
    `Server started on port ${env.PORT}`
  );
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal}: stopping server`);

  // Keep-alive соединения могут не закрыться сами — не зависаем при остановке.
  setTimeout(() => process.exit(1), 10_000).unref();
  server.closeIdleConnections();

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