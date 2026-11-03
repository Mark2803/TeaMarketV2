import { calculateItemsPacking } from "./src/modules/moderator/order-packing.service.ts";
import { prisma } from "./src/database/prisma.ts";

const sku = "DEMO-FW-01-25";

async function main() {
  const boxes = await prisma.shipping_packages.findMany({
    where: { is_active: true },
    orderBy: { sort_order: "asc" }
  });

  console.log("\n=== АВТОМАТИЧЕСКИЙ ПОДБОР ===");

  for (const quantity of [1, 2, 5, 10, 20, 40, 80]) {
    try {
      const result = await calculateItemsPacking([{ sku, quantity }]);

      console.log(JSON.stringify({
        quantity,
        status: result.status,
        boxes: result.parcels.map(p => ({
          code: p.code,
          items: p.placements.length,
          dimensions_cm: p.dimensions_cm,
          weight_g: p.weight_g
        })),
        total_weight_g: result.total_weight_g
      }, null, 2));
    } catch (error) {
      console.log(quantity, String(error));
    }
  }

  console.log("\n=== ПРИНУДИТЕЛЬНЫЙ ВЫБОР КОРОБКИ ===");

  for (const box of boxes) {
    try {
      const result = await calculateItemsPacking(
        [{ sku, quantity: 10 }],
        box.id
      );

      console.log(JSON.stringify({
        preferred: box.code,
        status: result.status,
        boxes: result.parcels.map(p => ({
          code: p.code,
          items: p.placements.length,
          weight_g: p.weight_g
        }))
      }, null, 2));
    } catch (error) {
      console.log(box.code, String(error));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
