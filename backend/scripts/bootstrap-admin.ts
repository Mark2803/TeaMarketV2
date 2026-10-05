import "dotenv/config";
import { prisma } from "../src/database/prisma.js";

const username = process.env.ADMIN_USERNAME?.trim();
const email = process.env.MAIL_FROM?.trim().toLowerCase();
const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();

if (!username || !email || !passwordHash) {
  console.error("Нужны ADMIN_USERNAME, MAIL_FROM и ADMIN_PASSWORD_HASH");
  process.exitCode = 1;
} else {
  await prisma.admin_users.upsert({
    where: { username },
    update: { email, is_active: true, updated_at: new Date() },
    create: { username, email, password_hash: passwordHash }
  });
  console.log(`Администратор ${username} создан/обновлён.`);
}

await prisma.$disconnect();
