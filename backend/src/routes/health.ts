import { Router } from "express";

import { prisma } from "../database/prisma.js";

const router = Router();

router.get("/", async (_, res) => {
  const count = await prisma.products.count();

  res.json({
    status: "ok",
    database: "connected",
    products: count
  });
});

export default router;