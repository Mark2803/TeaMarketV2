import { Router, type Request, type Response, type NextFunction } from "express";
import { prisma } from "../../database/prisma.js";

const router = Router();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function parseBody(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("INVALID_BODY");
  const data = body as Record<string, unknown>;
  const code = typeof data.code === "string" ? data.code.trim().toUpperCase() : "";
  if (!/^[A-ZА-ЯЁ0-9_-]{1,32}$/u.test(code)) throw new Error("INVALID_CODE");
  const number = (key: string, required: boolean) => {
    const v = data[key];
    if (!required && (v === null || v === "" || v === undefined)) return null;
    if (typeof v !== "number" && (typeof v !== "string" || !v.trim())) throw new Error(`INVALID_${key}`);
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0 || n > 999999) throw new Error(`INVALID_${key}`);
    return n;
  };
  const sort = data.sort_order === undefined ? 0 : Number(data.sort_order);
  if (!Number.isInteger(sort) || sort < -100000 || sort > 100000) throw new Error("INVALID_SORT_ORDER");
  if (data.is_active !== undefined && typeof data.is_active !== "boolean") throw new Error("INVALID_IS_ACTIVE");
  return {
    code,
    inner_length_cm: number("inner_length_cm", true)!,
    inner_width_cm: number("inner_width_cm", true)!,
    inner_height_cm: number("inner_height_cm", true)!,
    outer_length_cm: number("inner_length_cm", true)!,
    outer_width_cm: number("inner_width_cm", true)!,
    outer_height_cm: number("inner_height_cm", true)!,
    tare_weight_g: number("tare_weight_g", true)!,
    is_active: data.is_active === undefined ? true : data.is_active,
    sort_order: sort,
  };
}
function handle(error: unknown, res: Response, next: NextFunction) {
  if (error instanceof Error && (error.message.startsWith("INVALID_") || error.message === "INVALID_BODY")) {
    res.status(400).json({ error: { message: "Некорректные параметры упаковки", code: error.message } }); return;
  }
  if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
    res.status(409).json({ error: { message: "Упаковка с таким обозначением уже существует" } }); return;
  }
  next(error);
}
router.get("/", async (_req, res, next) => {
  try { res.json({ data: await prisma.shipping_packages.findMany({ orderBy: [{ sort_order: "asc" }, { code: "asc" }] }) }); }
  catch (e) { next(e); }
});
router.post("/", async (req, res, next) => {
  try { res.status(201).json({ data: await prisma.shipping_packages.create({ data: parseBody(req.body) }) }); }
  catch (e) { handle(e, res, next); }
});
router.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    if (!uuid.test(id)) { res.sendStatus(400); return; }
    const result = await prisma.shipping_packages.updateMany({ where: { id }, data: { ...parseBody(req.body), updated_at: new Date() } });
    if (!result.count) { res.sendStatus(404); return; }
    res.json({ data: await prisma.shipping_packages.findUnique({ where: { id } }) });
  } catch (e) { handle(e, res, next); }
});
router.patch("/:id/status", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    if (!uuid.test(id)) { res.sendStatus(400); return; }
    const active = (req.body as { is_active?: unknown } | undefined)?.is_active;
    if (typeof active !== "boolean") { res.status(400).json({ error: { message: "Некорректный статус упаковки", code: "INVALID_IS_ACTIVE" } }); return; }
    const record = await prisma.shipping_packages.findUnique({ where: { id } });
    if (!record) { res.sendStatus(404); return; }
    if (active && (record.tare_weight_g === null || Number(record.tare_weight_g) <= 0)) {
      res.status(400).json({ error: { message: "Для активации укажите вес коробки", code: "PACKAGE_WEIGHT_REQUIRED" } }); return;
    }
    res.json({ data: await prisma.shipping_packages.update({ where: { id }, data: { is_active: active, updated_at: new Date() } }) });
  } catch (e) { next(e); }
});
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    if (!uuid.test(id)) { res.sendStatus(400); return; }
    const result = await prisma.shipping_packages.deleteMany({ where: { id } });
    if (!result.count) { res.sendStatus(404); return; }
    res.json({ success: true });
  } catch (e) { next(e); }
});
export default router;
