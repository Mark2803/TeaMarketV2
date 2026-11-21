/**
 * Полная проверка готовности сервера: npm run env:check
 *
 * Запускать на сервере перед перезапуском (или в любой момент).
 * Только читает данные и проверяет доступы: ничего не создаёт,
 * не отправляет письма и не меняет базу данных.
 *
 * Код выхода 0 — всё готово, 1 — есть ошибки, которые увидят покупатели.
 */
import "dotenv/config";

import { randomUUID } from "node:crypto";
import { access } from "node:fs/promises";
import path from "node:path";

import { checkEnvironment } from "../config/env-check.js";

type Status = "ok" | "warn" | "fail";
const results: Array<{ status: Status; title: string; detail: string }> = [];

function report(status: Status, title: string, detail: string): void {
  results.push({ status, title, detail });
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const ONLINE_PAYMENT = /юкас|yookassa|онлайн|online|банковск|карт|сбп/i;

async function checkDatabase(): Promise<void> {
  const { prisma, disconnectDatabase } = await import("../database/prisma.js");
  try {
    await prisma.$queryRaw`SELECT 1`;
    report("ok", "База данных", "подключение работает");

    const admins = await prisma.admin_users.count({ where: { is_active: true } });
    const envAdmin = Boolean(process.env.ADMIN_USERNAME?.trim() && process.env.ADMIN_PASSWORD_HASH?.trim());
    if (admins === 0 && !envAdmin) report("fail", "Администраторы", "нет ни одного активного администратора — войти в админку нельзя");
    else report("ok", "Администраторы", `активных в базе: ${admins}${envAdmin ? ", плюс администратор из .env" : ""}`);

    const payments = await prisma.payment_methods.findMany({ where: { is_active: true }, select: { name: true } });
    if (payments.some((method) => ONLINE_PAYMENT.test(method.name))) report("ok", "Способ оплаты", "онлайн-оплата включена");
    else report("fail", "Способ оплаты", "нет активного способа онлайн-оплаты — заказ не оформится");

    const deliveries = await prisma.delivery_methods.findMany({ where: { is_active: true }, select: { name: true } });
    if (!deliveries.length) report("fail", "Способы доставки", "нет ни одного активного способа доставки — заказ не оформится");
    else report("ok", "Способы доставки", deliveries.map((method) => method.name).join(", "));

    const settings = await prisma.$queryRaw<Array<{ primary_dropoff_id: string | null }>>`
      SELECT primary_dropoff_id FROM yandex_delivery_settings WHERE id = 1`;
    if (settings[0]?.primary_dropoff_id?.trim()) report("ok", "ПВЗ отгрузки Яндекса", "выбран");
    else report("fail", "ПВЗ отгрузки Яндекса", "не выбран в админке — стоимость доставки не рассчитается");
  } catch (error) {
    report("fail", "База данных", errorText(error));
  } finally {
    await disconnectDatabase().catch(() => undefined);
  }
}

async function checkYooKassa(): Promise<void> {
  const shop = process.env.YOOKASSA_SHOP_ID?.trim();
  const secret = process.env.YOOKASSA_SECRET_KEY?.trim();
  if (!shop || !secret) return;
  try {
    const response = await fetch("https://api.yookassa.ru/v3/me", {
      headers: { Authorization: `Basic ${Buffer.from(`${shop}:${secret}`).toString("base64")}` },
      signal: AbortSignal.timeout(15000)
    });
    if (response.status === 401 || response.status === 403) {
      report("fail", "ЮKassa", "магазин отклонил ключи — проверьте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY");
      return;
    }
    if (!response.ok) {
      report("fail", "ЮKassa", `ошибка ответа (HTTP ${response.status})`);
      return;
    }
    const account = await response.json() as { test?: boolean; fiscalization_enabled?: boolean };
    if (account.test === true && process.env.NODE_ENV === "production") {
      report("fail", "ЮKassa", "подключён ТЕСТОВЫЙ магазин — реальные деньги не будут списываться");
    } else {
      report("ok", "ЮKassa", account.test ? "ключи верные (тестовый магазин)" : "ключи верные (боевой магазин)");
    }
    if (account.fiscalization_enabled === false) {
      report("warn", "ЮKassa: чеки", "фискализация в ЮKassa не подключена, а сайт передаёт чек в каждом платеже — проверьте настройки чеков в личном кабинете ЮKassa");
    }
  } catch (error) {
    report("fail", "ЮKassa", `нет связи: ${errorText(error)}`);
  }
}

async function checkYandexDelivery(): Promise<void> {
  const token = process.env.YANDEX_DELIVERY_TOKEN?.trim();
  if (!token) return;
  try {
    // Запрос заведомо несуществующей заявки: 404 значит, что токен принят.
    const url = new URL("https://b2b-authproxy.taxi.yandex.net/api/b2b/platform/request/info");
    url.searchParams.set("request_id", randomUUID());
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, "Accept-Language": "ru" },
      signal: AbortSignal.timeout(15000)
    });
    if (response.status === 401 || response.status === 403) {
      report("fail", "Яндекс Доставка", "токен отклонён — проверьте YANDEX_DELIVERY_TOKEN");
    } else if (response.ok || response.status === 404) {
      report("ok", "Яндекс Доставка", "токен принят");
    } else {
      report("warn", "Яндекс Доставка", `неожиданный ответ (HTTP ${response.status}) — попробуйте проверить позже`);
    }
  } catch (error) {
    report("fail", "Яндекс Доставка", `нет связи: ${errorText(error)}`);
  }
}

async function checkEmail(): Promise<void> {
  if (!process.env.SMTP_HOST?.trim() || !process.env.SMTP_USER?.trim() || !process.env.SMTP_PASSWORD?.trim()) return;
  try {
    const { verifySmtpConnection } = await import("../modules/notifications/email-transport.js");
    await verifySmtpConnection();
    report("ok", "Почта (SMTP)", "подключение и вход выполнены, письмо не отправлялось");
  } catch (error) {
    report("fail", "Почта (SMTP)", `${errorText(error)} — покупатели не получат код входа и письма о заказах`);
  }
}

async function checkImageStorage(): Promise<void> {
  const bucket = process.env.S3_BUCKET?.trim();
  if (!bucket) return;
  try {
    const { HeadBucketCommand } = await import("@aws-sdk/client-s3");
    const { s3Client } = await import("../lib/s3.js");
    await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
    report("ok", "Хранилище изображений", `бакет «${bucket}» доступен`);
  } catch (error) {
    report("fail", "Хранилище изображений", `${errorText(error)} — не загрузятся изображения товаров`);
  }
}

async function checkTelegram(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, { signal: AbortSignal.timeout(12000) });
    if (response.ok) report("ok", "Telegram", "бот доступен");
    else report("warn", "Telegram", "токен бота не принят — уведомления в Telegram не придут");
  } catch (error) {
    report("warn", "Telegram", `нет связи: ${errorText(error)}`);
  }
}

async function checkSeoTemplate(): Promise<void> {
  // Те же пути, что использует modules/seo/seo-html.routes.ts.
  const candidates = [
    process.env.SEO_HTML_TEMPLATE_PATH,
    path.resolve(process.cwd(), "../frontend/dist/index.html"),
    "/home/ivanc1539/web/tea-master-team.ru/public_html/index.html"
  ].filter((value): value is string => Boolean(value));
  for (const file of candidates) {
    try {
      await access(file);
      report("ok", "Шаблон SEO-страниц", file);
      return;
    } catch { /* пробуем следующий путь */ }
  }
  report("warn", "Шаблон SEO-страниц", "index.html фронтенда не найден — страницы для поисковиков не отдадутся; задайте SEO_HTML_TEMPLATE_PATH");
}

async function main(): Promise<void> {
  const staticReport = checkEnvironment();
  for (const error of staticReport.errors) report("fail", "Настройки .env", error);
  for (const warning of staticReport.warnings) report("warn", "Настройки .env", warning);

  if (process.env.DATABASE_URL?.trim()) await checkDatabase();
  await Promise.all([
    checkYooKassa(),
    checkYandexDelivery(),
    checkEmail(),
    checkImageStorage(),
    checkTelegram(),
    checkSeoTemplate()
  ]);

  const icon: Record<Status, string> = { ok: "✔", warn: "!", fail: "✖" };
  console.log("\nПроверка готовности сервера Чайного Маркета\n");
  for (const status of ["fail", "warn", "ok"] as const) {
    for (const item of results.filter((result) => result.status === status)) {
      console.log(`${icon[status]} ${item.title}: ${item.detail}`);
    }
  }
  const failures = results.filter((result) => result.status === "fail").length;
  const warnings = results.filter((result) => result.status === "warn").length;
  console.log(failures
    ? `\nИтог: ошибок — ${failures}, предупреждений — ${warnings}. Покупатели столкнутся с проблемами, исправьте ошибки.`
    : `\nИтог: ошибок нет, предупреждений — ${warnings}. Сервер готов к работе.`);
  process.exit(failures ? 1 : 0);
}

await main();
