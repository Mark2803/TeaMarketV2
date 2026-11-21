/**
 * Проверка настроек (.env) без обращения к внешним сервисам.
 *
 * Ошибки — то, без чего магазин не может принимать и выполнять заказы.
 * В production сервер с такими ошибками не запускается (см. server.ts),
 * чтобы проблема обнаружилась при выкладке, а не на заказе покупателя.
 *
 * Предупреждения — функции, которые просто будут отключены.
 */

export type EnvironmentReport = {
  errors: string[];
  warnings: string[];
};

const PLACEHOLDER = /change_me|your-bucket|your-yandex|CHANGE_ME/i;

function value(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function isHttpsUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === "https:" && !["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function checkEnvironment(): EnvironmentReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const production = value("NODE_ENV") === "production";

  // Обязательная переменная: пустое значение или заглушка из .env.example — ошибка.
  const required = (name: string, purpose: string): string => {
    const current = value(name);
    if (!current) errors.push(`${name} не задана — ${purpose}`);
    else if (PLACEHOLDER.test(current)) errors.push(`${name} содержит заглушку из .env.example — ${purpose}`);
    return current;
  };

  // База данных
  required("DATABASE_URL", "сервер не подключится к базе данных");

  // Вход в админку
  const sessionSecret = required("ADMIN_SESSION_SECRET", "не получится войти в админку");
  if (sessionSecret && sessionSecret.length < 32) {
    errors.push("ADMIN_SESSION_SECRET слишком короткий (нужно не меньше 32 символов) — подпись сессий админки ненадёжна");
  }
  const adminUser = value("ADMIN_USERNAME");
  const adminHash = value("ADMIN_PASSWORD_HASH");
  if (adminHash && !/^scrypt\$[0-9a-f]+\$[0-9a-f]+$/i.test(adminHash)) {
    errors.push("ADMIN_PASSWORD_HASH в неверном формате — создайте его командой npm run admin:hash-password");
  }
  if (!adminUser || !adminHash) {
    warnings.push("ADMIN_USERNAME / ADMIN_PASSWORD_HASH не заданы — войти в админку смогут только администраторы из базы данных");
  }
  if (!value("GUEST_ORDER_ACCESS_SECRET")) {
    warnings.push("GUEST_ORDER_ACCESS_SECRET не задана — ссылки на гостевые заказы подписываются секретом админки (лучше задать отдельный)");
  }

  // Адрес витрины: на него ЮKassa возвращает покупателя после оплаты
  const storefront = required("STOREFRONT_URL", "после оплаты покупатель вернётся не на сайт, а на localhost");
  if (storefront && production && !isHttpsUrl(storefront)) {
    errors.push("STOREFRONT_URL должна быть https-адресом сайта (например, https://tea-master-team.ru)");
  }
  if (!value("PUBLIC_SITE_URL")) {
    warnings.push("PUBLIC_SITE_URL не задана — в ссылках сброса пароля будет https://tea-master-team.ru");
  }

  // Оплата
  required("YOOKASSA_SHOP_ID", "покупатели не смогут оплатить заказ");
  required("YOOKASSA_SECRET_KEY", "покупатели не смогут оплатить заказ");

  // Доставка
  required("YANDEX_DELIVERY_TOKEN", "не будет рассчитываться стоимость доставки и не создадутся отправления");
  if (!value("YANDEX_DELIVERY_SOURCE_STATION_ID")) {
    warnings.push("YANDEX_DELIVERY_SOURCE_STATION_ID не задана — для курьерской доставки до двери отправление не создастся автоматически (доставка в ПВЗ работает)");
  }

  // Почта: вход покупателей по коду и письма о заказах
  required("SMTP_HOST", "покупатели не получат код для входа и письма о заказе");
  required("SMTP_USER", "покупатели не получат код для входа и письма о заказе");
  required("SMTP_PASSWORD", "покупатели не получат код для входа и письма о заказе");
  const mailFrom = required("MAIL_FROM", "покупатели не получат код для входа и письма о заказе");
  if (mailFrom && !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(mailFrom)) {
    errors.push("MAIL_FROM должна быть адресом электронной почты");
  }
  const smtpPort = value("SMTP_PORT");
  if (smtpPort && !/^\d{2,5}$/.test(smtpPort)) errors.push("SMTP_PORT должен быть числом");

  // Хранилище изображений
  for (const name of ["S3_ENDPOINT", "S3_REGION", "S3_BUCKET", "S3_ACCESS_KEY", "S3_SECRET_KEY"]) {
    required(name, "не загрузятся изображения товаров");
  }

  // Необязательные функции
  if (!value("TELEGRAM_BOT_TOKEN")) {
    warnings.push("TELEGRAM_BOT_TOKEN не задан — уведомления в Telegram отключены");
  }
  if (production && value("TRACKING_SIMULATION_ENABLED") === "true") {
    warnings.push("TRACKING_SIMULATION_ENABLED=true игнорируется в production — уберите её из .env");
  }

  return { errors, warnings };
}

export function printEnvironmentReport(report: EnvironmentReport): void {
  for (const warning of report.warnings) console.warn(`[НАСТРОЙКИ] Предупреждение: ${warning}`);
  for (const error of report.errors) console.error(`[НАСТРОЙКИ] Ошибка: ${error}`);
  if (!report.errors.length) console.info("[НАСТРОЙКИ] Обязательные настройки заданы");
}
