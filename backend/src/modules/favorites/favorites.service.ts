import { prisma } from "../../database/prisma.js";

export type AddFavoriteError =
  "PRODUCT_NOT_FOUND";

export type AddFavoriteResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: AddFavoriteError;
    };

/**
 * Возвращает избранные товары покупателя.
 */
export async function getCustomerFavorites(
  customerId: string
) {
  const favorites =
    await prisma.favorites.findMany({
      where: {
        customer_id:
          customerId,

        products: {
          is_active:
            true
        }
      },

      orderBy: {
        created_at:
          "desc"
      },

      include: {
        products: {
          include: {
            product_images: {
              orderBy: {
                sort_order:
                  "asc"
              },

              take: 1
            },

            product_variants: {
              where: {
                status:
                  "active"
              },

              orderBy: {
                sort_order:
                  "asc"
              }
            }
          }
        }
      }
    });

  return favorites.map(
    (favorite) => ({
      addedAt:
        favorite.created_at,

      product:
        favorite.products
    })
  );
}

/**
 * Добавляет товар в избранное.
 *
 * Повторное добавление не создаёт дубль.
 */
export async function addCustomerFavorite(
  customerId: string,
  productId: string
): Promise<AddFavoriteResult> {
  const product =
    await prisma.products.findFirst({
      where: {
        id:
          productId,

        is_active:
          true
      },

      select: {
        id: true
      }
    });

  if (!product) {
    return {
      success: false,
      error:
        "PRODUCT_NOT_FOUND"
    };
  }

  await prisma.favorites.upsert({
    where: {
      customer_id_product_id: {
        customer_id:
          customerId,

        product_id:
          productId
      }
    },

    update: {},

    create: {
      customer_id:
        customerId,

      product_id:
        productId
    }
  });

  return {
    success: true
  };
}

/**
 * Удаляет товар из избранного.
 *
 * Если записи уже нет, операция остаётся успешной.
 */
export async function removeCustomerFavorite(
  customerId: string,
  productId: string
) {
  await prisma.favorites.deleteMany({
    where: {
      customer_id:
        customerId,

      product_id:
        productId
    }
  });
}