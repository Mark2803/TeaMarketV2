import { buildOzonStatusQuery, parseOzonStatusResponse } from "./ozon-payment-status.js";
import { syncVerifiedOzonPaymentStatus, type OzonPaymentStore } from "./ozon-status-workflow.js";

export interface OzonStatusTransport {
  getOrderStatus(request: ReturnType<typeof buildOzonStatusQuery>): Promise<unknown>;
}

/**
 * Server-side status reconciliation. Never accepts provider status from the browser.
 * Transport MUST be configured with the official HTTPS Ozon API endpoint.
 */
export async function reconcileOzonOrder(input: {
  orderNumber: string;
  accessKey: string;
  secretKey: string;
  transport: OzonStatusTransport;
  store: OzonPaymentStore;
}) {
  if (!input.orderNumber || !input.accessKey || !input.secretKey) {
    throw new Error("OZON_RECONCILIATION_CONFIG_MISSING");
  }
  return syncVerifiedOzonPaymentStatus(
    input.orderNumber,
    async ({ id, extId }) => {
      const request = buildOzonStatusQuery({
        accessKey: input.accessKey,
        secretKey: input.secretKey,
        id,
        extId
      });
      const payload = await input.transport.getOrderStatus(request);
      return parseOzonStatusResponse(payload, { id, extId });
    },
    input.store
  );
}
