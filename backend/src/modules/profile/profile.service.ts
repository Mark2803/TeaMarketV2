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
  return prisma.customers.findUnique({
    where: {
      id: customerId
    },

    select:
      profileSelect
  });
}

/**
 * Обновляет разрешённые поля профиля покупателя.
 */
export async function updateProfile(
  customerId: string,
  input: UpdateProfileInput
) {
  return prisma.customers.update({
    where: {
      id: customerId
    },

    data: {
      ...(input.name !== undefined
        ? {
            name:
              input.name
          }
        : {}),

      ...(input.email !== undefined
        ? {
            email:
              input.email
          }
        : {}),

      ...(input.username !== undefined
        ? {
            username:
              input.username
          }
        : {})
    },

    select:
      profileSelect
  });
}