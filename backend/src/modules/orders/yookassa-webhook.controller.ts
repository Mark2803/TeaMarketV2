import type { Request, Response } from "express";
import { synchronizeYooKassaPayment } from "./yookassa.service.js";

export async function handleYooKassaWebhook(
  req: Request,
  res: Response
): Promise<void> {
  const event = req.body;

  if (
    !event ||
    event.type !== "notification" ||
    typeof event.event !== "string" ||
    typeof event.object?.id !== "string" ||
    !/^[a-zA-Z0-9-]{1,100}$/.test(event.object.id)
  ) {
    res.status(400).json({ error: "INVALID_NOTIFICATION" });
    return;
  }

  // Уведомления о возвратах и прочих объектах здесь не обрабатываются.
  // Отвечаем 200, иначе ЮKassa будет бесконечно повторять доставку.
  if (!event.event.startsWith("payment.")) {
    res.status(200).json({ success: true, ignored: true });
    return;
  }

  try {
    await synchronizeYooKassaPayment(event.object.id);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("YOOKASSA_WEBHOOK_ERROR", error);
    res.status(500).json({ error: "PAYMENT_SYNC_FAILED" });
  }
}
