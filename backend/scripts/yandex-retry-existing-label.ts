/** Read-only status + retry label for an already-created Yandex TEST shipment. */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
const token = process.env.YANDEX_DELIVERY_TEST_TOKEN;
const requestId = "f7f3428f5d3747ba9afd6bbf1fc53f42-udp";
const host = "https://b2b.taxi.tst.yandex.net";
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
async function main() {
  if (!token) throw new Error("Нет YANDEX_DELIVERY_TEST_TOKEN");
  const url = new URL("/api/b2b/platform/request/info", host);
  url.searchParams.set("request_id", requestId);
  const info = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  const body = await info.json();
  console.log("INFO HTTP:", info.status);
  if (!info.ok) { console.log("INFO ERROR:", body.code, body.message); return; }
  console.log("CARRIER STATUS:", body.request?.status ?? body.status ?? "not supplied");
  for (let attempt = 1; attempt <= 4; attempt++) {
    const response = await fetch(host + "/api/b2b/platform/request/generate-labels", {
      method: "POST", headers: { ...headers, Accept: "application/pdf" },
      body: JSON.stringify({ request_ids: [requestId], generate_type: "one", label_size_mm: "58x40", language: "ru" }),
      signal: AbortSignal.timeout(25000),
    });
    console.log(`PDF ATTEMPT ${attempt} HTTP:`, response.status);
    if (response.ok) {
      const pdf = Buffer.from(await response.arrayBuffer());
      if (pdf.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("Ответ не PDF");
      const path = resolve("yandex-test-label.pdf");
      writeFileSync(path, pdf);
      console.log("PASS PDF:", path);
      return;
    }
    const error = await response.json().catch(() => ({}));
    console.log("PDF ERROR:", error.code ?? response.status, String(error.message ?? "").slice(0, 220));
    if (response.status !== 409 || attempt === 4) break;
    await wait(15000);
  }
  console.log("RESULT: Яндекс пока не разрешает выдачу этикетки для этой заявки");
}
main().catch(e => { console.error("FAIL:", e.message); process.exitCode = 1; });
