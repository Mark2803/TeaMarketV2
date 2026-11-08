import app from "./app.js";
import { expireUnpaidOrders } from "./modules/orders/yookassa.service.js";
import { env } from "./config/env.js";
import { disconnectDatabase } from "./database/prisma.js";
import { startYandexDeliverySync } from "./modules/orders/yandex-delivery-sync.js";

startYandexDeliverySync();
// Check expired reservations every five minutes; never overlap runs.
let expiryRunning = false;
const expiryTimer = setInterval(async () => {
  if (expiryRunning) return;
  expiryRunning = true;
  try { await expireUnpaidOrders(); }
  catch (error) { console.error("UNPAID_ORDER_EXPIRY_JOB_ERROR", error); }
  finally { expiryRunning = false; }
}, 5 * 60 * 1000);
expiryTimer.unref();

const server = app.listen(env.PORT, () => {
  console.log(
    `Server started on port ${env.PORT}`
  );
});

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal}: stopping server`);
  clearInterval(expiryTimer);

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