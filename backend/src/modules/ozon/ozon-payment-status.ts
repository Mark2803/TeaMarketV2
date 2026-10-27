/** Offline POST /v1/getOrderStatus support. No network calls or DB writes. */
import { createHash } from "node:crypto";

export type OzonOrderStatus =
  | "STATUS_NEW" | "STATUS_PAYMENT_PENDING" | "STATUS_PAID"
  | "STATUS_PARTITIONAL_REFUND" | "STATUS_AUTHORIZED" | "STATUS_CANCELED"
  | "STATUS_DISPUTED" | "STATUS_EXPIRED" | "STATUS_REFUNDED"
  | "STATUS_PARTITION_CANCELED" | "STATUS_DISPUTING";

const knownStatuses = new Set<OzonOrderStatus>([
  "STATUS_NEW", "STATUS_PAYMENT_PENDING", "STATUS_PAID", "STATUS_PARTITIONAL_REFUND",
  "STATUS_AUTHORIZED", "STATUS_CANCELED", "STATUS_DISPUTED", "STATUS_EXPIRED",
  "STATUS_REFUNDED", "STATUS_PARTITION_CANCELED", "STATUS_DISPUTING"
]);

export type OzonStatusQuery = {
  accessKey: string;
  id?: string;
  extId?: string;
  requestSign: string;
};

/** Signing order from Ozon docs: id + extId + accessKey + secretKey; absent fields omitted. */
export function buildOzonStatusQuery(input: {
  accessKey: string;
  secretKey: string;
  id?: string;
  extId?: string;
}): OzonStatusQuery {
  if (!input.accessKey || !input.secretKey) throw new Error("OZON_CREDENTIALS_MISSING");
  if (!input.id && !input.extId) throw new Error("OZON_ORDER_ID_MISSING");
  const requestSign = createHash("sha256")
    .update((input.id ?? "") + (input.extId ?? "") + input.accessKey + input.secretKey, "utf8")
    .digest("hex");
  return {
    accessKey: input.accessKey,
    ...(input.id ? { id: input.id } : {}),
    ...(input.extId ? { extId: input.extId } : {}),
    requestSign
  };
}

export type OzonVerifiedStatus = {
  id: string;
  extId: string;
  status: OzonOrderStatus;
  isTestMode: boolean | null;
  paymentConfirmed: boolean;
};

/** A parsed response is NOT authenticated until obtained directly from Ozon over trusted API. */
export function parseOzonStatusResponse(
  payload: unknown,
  expected: { id?: string; extId?: string }
): OzonVerifiedStatus {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("OZON_STATUS_INVALID");
  }
  const p = payload as Record<string, unknown>;
  if (typeof p.id !== "string" || !p.id ||
      typeof p.extId !== "string" || !p.extId ||
      typeof p.status !== "string" || !knownStatuses.has(p.status as OzonOrderStatus)) {
    throw new Error("OZON_STATUS_INVALID");
  }
  if ((expected.id && p.id !== expected.id) || (expected.extId && p.extId !== expected.extId)) {
    throw new Error("OZON_ORDER_ID_MISMATCH");
  }
  if (p.isTestMode !== undefined && typeof p.isTestMode !== "boolean") {
    throw new Error("OZON_STATUS_INVALID");
  }
  const status = p.status as OzonOrderStatus;
  return {
    id: p.id, extId: p.extId, status,
    isTestMode: typeof p.isTestMode === "boolean" ? p.isTestMode : null,
    // Authorized, pending, refunded, canceled etc. must not be marked paid.
    paymentConfirmed: status === "STATUS_PAID"
  };
}

/** Stage 11 safety lock: do not fetch a live status or mutate an order. */
export async function fetchOzonStatusDisabled(_query: OzonStatusQuery): Promise<never> {
  throw new Error("OZON_LIVE_STATUS_NOT_ENABLED");
}
