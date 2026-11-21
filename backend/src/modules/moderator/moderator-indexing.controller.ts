import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../database/prisma.js";

/**
 * Массовое включение/выключение индексации поисковиками.
 * ids не переданы → изменение применяется ко всем записям.
 */
const bodySchema = z.object({
  isIndexed: z.boolean(),
  ids: z.array(z.string().uuid()).max(1000).optional()
});

function parse(req: Request, res: Response) {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_INDEXING_INPUT", message: "Некорректные данные", details: parsed.error.flatten() } });
    return null;
  }
  return parsed.data;
}

export async function setProductsIndexingController(req: Request, res: Response): Promise<void> {
  const input = parse(req, res);
  if (!input) return;
  const result = await prisma.products.updateMany({
    where: input.ids ? { id: { in: input.ids } } : {},
    data: { is_indexed: input.isIndexed, updated_at: new Date() }
  });
  res.json({ data: { updated: result.count, isIndexed: input.isIndexed } });
}

export async function setArticlesIndexingController(req: Request, res: Response): Promise<void> {
  const input = parse(req, res);
  if (!input) return;
  // Поле добавлено миграцией 340_article_indexing; Prisma-клиент не перегенерирован, поэтому SQL.
  const updated = input.ids
    ? await prisma.$executeRaw`UPDATE articles SET is_indexed = ${input.isIndexed}, updated_at = now() WHERE id = ANY(${input.ids}::uuid[])`
    : await prisma.$executeRaw`UPDATE articles SET is_indexed = ${input.isIndexed}, updated_at = now()`;
  res.json({ data: { updated, isIndexed: input.isIndexed } });
}
