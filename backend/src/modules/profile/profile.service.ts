import { prisma } from "../../database/prisma.js";

import type {
  UpdateProfileInput
} from "./profile.schemas.js";

/**
 * Поля профиля, возвращаемые клиентскому приложению.
 */
const profileSelect = {
  id: true,
  phone: true,
  name: true,
  email: true,
  username: true,
  created_at: true,
  updated_at: true
} as const;

/**
 * Получает профиль покупателя.
 */
export async function getProfile(
  customerId: string
) {
  const [profile, preferences] = await Promise.all([
    prisma.customers.findUnique({
      where: { id: customerId },
      select: profileSelect
    }),
    prisma.notification_preferences.findUnique({
      where: { customer_id: customerId },
      select: { email_marketing: true }
    })
  ]);

  if (!profile) return null;

  return {
    ...profile,
    emailMarketing: preferences?.email_marketing ?? false
  };
}

/**
 * Обновляет разрешённые поля профиля покупателя.
 */
export async function updateProfile(
  customerId: string,
  input: UpdateProfileInput
) {
  return prisma.$transaction(async (transaction) => {
    const profile = await transaction.customers.update({
      where: { id: customerId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email || null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
        ...(input.username !== undefined
          ? {
              username: input.username
                ? (input.username.startsWith("@") ? input.username : `@${input.username}`)
                : null
            }
          : {})
      },
      select: profileSelect
    });

    if (input.emailMarketing !== undefined) {
      await transaction.notification_preferences.upsert({
        where: { customer_id: customerId },
        create: {
          customer_id: customerId,
          email_marketing: input.emailMarketing
        },
        update: {
          email_marketing: input.emailMarketing,
          updated_at: new Date()
        }
      });
    }

    const preferences = await transaction.notification_preferences.findUnique({
      where: { customer_id: customerId },
      select: { email_marketing: true }
    });

    return {
      ...profile,
      emailMarketing: preferences?.email_marketing ?? false
    };
  });
}