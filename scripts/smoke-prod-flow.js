#!/usr/bin/env node

const baseUrl = String(process.env.DASHBOARD_BASE_URL || "").trim().replace(/\/+$/, "");
const cookieHeader = String(process.env.DASHBOARD_COOKIE_HEADER || "").trim();
const pollIntervalMs = Math.max(2000, Number(process.env.SMOKE_POLL_INTERVAL_MS || 5000));
const timeoutMs = Math.max(60000, Number(process.env.SMOKE_TIMEOUT_MS || 900000));

if (!baseUrl) {
  throw new Error("Missing DASHBOARD_BASE_URL");
}
if (!cookieHeader) {
  throw new Error("Missing DASHBOARD_COOKIE_HEADER");
}

const sampleCsv = [
  "date,sku,store,qty,on_hand,price,is_holiday,is_promotion,is_open",
  "2026-05-01,SMOKE-SKU-1,MEL,10,120,9.50,0,0,1",
  "2026-05-02,SMOKE-SKU-1,MEL,12,110,9.50,0,0,1",
  "2026-05-03,SMOKE-SKU-1,MEL,11,98,9.50,0,1,1",
  "2026-05-04,SMOKE-SKU-1,MEL,13,91,9.50,0,0,1",
  "2026-05-05,SMOKE-SKU-1,MEL,12,79,9.50,0,0,1",
  "2026-05-06,SMOKE-SKU-1,MEL,14,67,9.50,0,0,1",
  "2026-05-07,SMOKE-SKU-1,MEL,15,53,9.50,0,0,1",
].join("\n");

const requestJson = async (path, init = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Cookie: cookieHeader,
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${JSON.stringify(json)}`);
  }

  return json;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  console.log(`Smoke base URL: ${baseUrl}`);

  const upload = await requestJson("/api/upload-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename: "smoke-forecast.csv",
      contentType: "text/csv",
      fileSize: Buffer.byteLength(sampleCsv),
    }),
  });

  if (!upload?.uploadUrl || !upload?.s3Bucket || !upload?.s3Key) {
    throw new Error(`upload-url returned incomplete payload: ${JSON.stringify(upload)}`);
  }
  console.log(`Upload ready: ${upload.s3Key}`);

  const uploadResponse = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "text/csv",
    },
    body: sampleCsv,
  });
  if (!uploadResponse.ok) {
    throw new Error(`signed upload failed: ${uploadResponse.status}`);
  }
  console.log("Upload succeeded.");

  const started = await requestJson("/api/forecast/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      s3Bucket: upload.s3Bucket,
      s3Key: upload.s3Key,
      originalFilename: "smoke-forecast.csv",
      model: "arima",
      mode: "local",
      seasonality: "auto",
      dateFormat: "YYYY-MM-DD",
      skuColumnName: "sku",
      storeColumnName: "store",
      targetVariable: "qty",
      onHandColumnName: "on_hand",
      priceColumnName: "price",
      holidayColumnName: "is_holiday",
      promotionColumnName: "is_promotion",
      openStatusColumnName: "is_open",
      forecastHorizon: 14,
    }),
  });

  const runId = started?.run?.runId;
  if (!runId) {
    throw new Error(`forecast start returned no runId: ${JSON.stringify(started)}`);
  }
  console.log(`Run queued: ${runId}`);

  const startedAt = Date.now();
  let run = started.run;
  while (!["DONE", "FAILED"].includes(String(run?.status || ""))) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Run ${runId} did not finish within ${timeoutMs}ms`);
    }
    await delay(pollIntervalMs);
    const listed = await requestJson("/api/list-forecast-runs?limit=20");
    run = Array.isArray(listed?.items) ? listed.items.find((item) => item?.runId === runId) : null;
    console.log(`Run status: ${run?.status || "missing"}`);
  }

  if (run.status !== "DONE") {
    throw new Error(`Run ${runId} finished with status ${run.status}`);
  }

  console.log(`Run completed: ${runId}`);

  const checks = [
    ["/api/get-daily-forecasts", "daily forecasts"],
    ["/api/get-report-summary", "report summary"],
    ["/api/get-replenishment-signals", "replenishment signals"],
  ];

  for (const [path, label] of checks) {
    const payload = await requestJson(`${path}?runId=${encodeURIComponent(runId)}`);
    if (!payload || payload.status === "error") {
      throw new Error(`${label} failed: ${JSON.stringify(payload)}`);
    }
    console.log(`Verified ${label}.`);
  }

  console.log("Production dashboard smoke flow passed.");
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
