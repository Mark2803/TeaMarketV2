import { env } from "./config/env.js";
import { checkEnvironment, printEnvironmentReport } from "./config/env-check.js";

// Проверяем настройки до загрузки остальных модулей: часть из них
// (например, хранилище изображений) падает с непонятной ошибкой при импорте.
const environmentReport = checkEnvironment();
printEnvironmentReport(environmentReport);
if (environmentReport.errors.length && env.NODE_ENV === "production") {
  console.error("[НАСТРОЙКИ] Сервер не запущен: исправьте ошибки в .env и запустите снова. Проверка: npm run env:check");
  process.exit(1);
}

// Динамические импорты: статические поднялись бы выше и выполнились до проверки.
const { default: app } = await import("./app.js");
const { disconnectDatabase } = await import("./database/prisma.js");
const { startYandexDeliverySync } = await import("./modules/orders/yandex-delivery-sync.js");
const { startYandexShipmentReconciliation } = await import("./modules/moderator/yandex-shipments.service.js");
const { startUnpaidOrderExpiration } = await import("./modules/orders/unpaid-order-expiration.js");

startYandexDeliverySync();
startYandexShipmentReconciliation();
startUnpaidOrderExpiration();

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