import { Router } from "express";
import { prisma } from "../../database/prisma.js";

const router = Router();
type Row = { order_number: string; yandex_request_id: string; created_at: Date; tracking_number: string | null };
type ReturnRow = { orderNumber: string; trackingNumber: string; requestId: string; reason: string | null; status: string; startedAt: string | null; completedAt: string | null; cost: number | null; costCurrency: string | null };
const obj = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const str = (v: unknown): string | null => typeof v === "string" && v.trim() ? v.trim() : null;
const date = (v: unknown): string | null => { const s = str(v); return s && !Number.isNaN(Date.parse(s)) ? new Date(s).toISOString() : null; };
const RETURN_STATUS = /(?:^|[_-])(?:RETURN|RETURNED|RETURNING|REVERSE)(?:$|[_-])/i;
const COMPLETE_STATUS = /(?:RETURNED|RETURN_DELIVERED|RETURN_COMPLETED|RETURN_FINISHED|REVERSE_DELIVERED)/i;
const FINISHED_STATUS = /(?:^|[_-])(?:FINISHED|COMPLETED|DELIVERED)(?:$|[_-])/i;

async function getReturn(row: Row, token: string): Promise<ReturnRow | null> {
  const url = new URL("https://b2b-authproxy.taxi.yandex.net/api/b2b/platform/request/info");
  url.searchParams.set("request_id", row.yandex_request_id);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, "Accept-Language": "ru" }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`YANDEX_HTTP_${response.status}`);
  const root = obj(await response.json());
  const request = obj(root.request);
  const state = obj(root.state);
  const status = str(root.status) ?? str(state.status) ?? str(request.status) ?? "";
  const history = [root.status_history, root.history, state.history, request.status_history]
    .find(Array.isArray) as unknown[] | undefined;
  const events = (history ?? []).map(obj).map(event => ({
    status: str(event.status) ?? str(event.code) ?? str(event.state) ?? "",
    at: date(event.timestamp) ?? date(event.created_at) ?? date(event.updated_at),
  }));
  const matching = events.filter(e => RETURN_STATUS.test(e.status));
  if (!RETURN_STATUS.test(status) && !matching.length) return null;
  const returnInfo = obj(root.return_info ?? request.return_info ?? root.return ?? request.return);
  const reason = str(returnInfo.reason) ?? str(returnInfo.reason_code) ?? str(root.return_reason) ?? str(request.return_reason);
  const startedAt = matching[0]?.at ?? date(returnInfo.created_at) ?? date(returnInfo.started_at);
  const completed = COMPLETE_STATUS.test(status) || (RETURN_STATUS.test(status) && FINISHED_STATUS.test(status));
  const completedAt = completed ? (matching.at(-1)?.at ?? date(returnInfo.completed_at) ?? date(root.updated_at)) : null;
  // The carrier does not always expose return expenses. Do not substitute the original delivery price.
  const expense = obj(returnInfo.price);
  const costValue = returnInfo.cost ?? expense.amount;
  const cost = typeof costValue === "number" && Number.isFinite(costValue) ? costValue : null;
  return { orderNumber: row.order_number, trackingNumber: row.tracking_number ?? row.yandex_request_id,
    requestId: row.yandex_request_id, reason, status: status || matching.at(-1)?.status || "RETURN",
    startedAt, completedAt, cost, costCurrency: cost === null ? null : (str(expense.currency) ?? "RUB") };
}

router.get("/", async (_req, res, next) => {
  try {
    const token = process.env.YANDEX_DELIVERY_TOKEN;
    if (!token) { res.status(503).json({ error: { code: "YANDEX_NOT_CONFIGURED", message: "Не настроено подключение к Яндекс Доставке" } }); return; }
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT o.order_number, s.yandex_request_id, s.created_at, d.tracking_number
      FROM yandex_shipments s JOIN orders o ON o.id=s.order_id
      LEFT JOIN order_deliveries d ON d.order_id=o.id
      WHERE s.yandex_request_id IS NOT NULL AND s.status='submitted'
      ORDER BY s.created_at DESC LIMIT 200`;
    const result: ReturnRow[] = [];
    let unavailable = 0;
    // Bounded concurrency to avoid exhausting the carrier API.
    for (let i = 0; i < rows.length; i += 5) {
      const batch = await Promise.allSettled(rows.slice(i, i + 5).map(row => getReturn(row, token)));
      for (const item of batch) {
        if (item.status === "fulfilled" && item.value) result.push(item.value);
        else if (item.status === "rejected") unavailable++;
      }
    }
    res.json({ data: result, meta: { checked: rows.length, unavailable, partial: unavailable > 0 } });
  } catch (error) { next(error); }
});
export default router;
