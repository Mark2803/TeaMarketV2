/**
 * Ozon Acquiring HTTP adapter. Not exposed as a public route.
 * The production entry point is fail-closed until merchant prerequisites
 * and payment reconciliation have been independently verified.
 */
import {
  parseOzonCreateOrderResponse,
  type OzonCreateOrderRequest,
  type OzonCreateOrderResponse
} from "./ozon-acquiring-client.js";
import {
  parseOzonStatusResponse,
  type OzonStatusQuery,
  type OzonVerifiedStatus
} from "./ozon-payment-status.js";

type Transport = (url: string, init: RequestInit) => Promise<Response>;
const ENDPOINT = "https://api-acquiring.ozon.ru";

export class OzonHttpError extends Error {
  constructor(public readonly code: string, public readonly httpStatus?: number) {
    super(code);
  }
}

async function postJson(
  path: "/v1/createOrder" | "/v1/getOrderStatus",
  payload: unknown,
  transport: Transport,
  timeoutMs = 10000
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await transport(`${ENDPOINT}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      redirect: "error"
    });
    if (!response.ok) throw new OzonHttpError("OZON_HTTP_ERROR", response.status);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      throw new OzonHttpError("OZON_RESPONSE_NOT_JSON");
    }
    return await response.json();
  } catch (error) {
    if (error instanceof OzonHttpError) throw error;
    if (controller.signal.aborted) throw new OzonHttpError("OZON_REQUEST_TIMEOUT");
    throw new OzonHttpError("OZON_NETWORK_ERROR");
  } finally {
    clearTimeout(timeout);
  }
}

/** Only for injected, explicitly supplied test transport. */
export async function testCreateOrder(
  request: OzonCreateOrderRequest,
  transport: Transport
): Promise<OzonCreateOrderResponse> {
  return parseOzonCreateOrderResponse(await postJson("/v1/createOrder", request, transport));
}

/** Only for injected, explicitly supplied test transport. */
export async function testGetOrderStatus(
  request: OzonStatusQuery,
  expected: { id?: string; extId?: string },
  transport: Transport
): Promise<OzonVerifiedStatus> {
  return parseOzonStatusResponse(await postJson("/v1/getOrderStatus", request, transport), expected);
}

/** No network traffic until a separately verified live activation is implemented. */
export async function createLiveOrder(_request: OzonCreateOrderRequest): Promise<never> {
  throw new OzonHttpError("OZON_LIVE_CHECKOUT_NOT_ENABLED");
}
