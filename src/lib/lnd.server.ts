import axios, { type AxiosInstance } from "axios";
import { readFileSync } from "node:fs";
import https from "node:https";
import { homedir } from "node:os";
import { resolve } from "node:path";

export function isLndConfigured() {
  return Boolean(
    process.env.LND_REST_HOST && (process.env.LND_MACAROON || process.env.LND_MACAROON_PATH),
  );
}

type LndClientConfig = {
  restHost?: string;
  macaroon?: string;
  macaroonPath?: string;
  tlsCertPath?: string;
  allowInsecureTls?: boolean;
};

export function createLndClient(config: LndClientConfig) {
  if (!config.restHost || (!config.macaroon && !config.macaroonPath)) {
    throw new Error("LND_NOT_CONFIGURED");
  }

  const macaroon = loadMacaroon(config.macaroon, config.macaroonPath);
  const httpsAgent = createHttpsAgent(config);

  return axios.create({
    baseURL: config.restHost,
    headers: {
      "Grpc-Metadata-Macaroon": macaroon,
      "Content-Type": "application/json",
    },
    httpsAgent,
    timeout: 10_000,
  });
}

export function getLndClient() {
  return createLndClient({
    restHost: process.env.LND_REST_HOST,
    macaroon: process.env.LND_MACAROON,
    macaroonPath: process.env.LND_MACAROON_PATH,
    tlsCertPath: process.env.LND_TLS_CERT_PATH,
    allowInsecureTls: process.env.NODE_ENV !== "production",
  });
}

// LND API reference used in this project:
// POST /v1/invoices               → create invoice (returns payment_request + r_hash)
// GET  /v1/invoice/{r_hash_hex}  → check settlement status (returns { settled: bool })
// POST /v2/router/send            → send payment to external wallet (withdrawal)
// GET  /v1/getinfo               → node health check

export async function lndHealthCheck() {
  try {
    const { data } = await getLndClient().get("/v1/getinfo");
    return { alias: data.alias, pubkey: data.identity_pubkey, synced: data.synced_to_chain };
  } catch (error) {
    throw normalizeLndError(error);
  }
}

export function normalizeLndError(error: unknown) {
  if (
    error instanceof Error &&
    (error.message.includes("LND_NOT_CONFIGURED") || error.message.includes("LND_INVALID_CONFIG"))
  ) {
    return error;
  }
  return new Error("LND_UNAVAILABLE");
}

export async function sendLndPayment(lnd: AxiosInstance, paymentRequest: string) {
  const { data } = await lnd.post("/v2/router/send", {
    payment_request: paymentRequest,
    timeout_seconds: 60,
    fee_limit_sat: "100",
    no_inflight_updates: true,
  });
  return { paymentHash: getLndPaymentHash(data) };
}

export function getLndPaymentHash(data: {
  result?: { status?: string; payment_hash?: string };
  status?: string;
  payment_hash?: string;
}) {
  const payment = data.result ?? data;
  if (payment.status !== "SUCCEEDED") {
    throw new Error("LND_PAYMENT_FAILED");
  }
  if (!payment.payment_hash) throw new Error("LND_PAYMENT_FAILED");
  return payment.payment_hash;
}

/**
 * LND REST API returns r_hash as base64.
 * Polling requires hex-encoded r_hash.
 */
export function b64ToHex(b64: string) {
  return Buffer.from(b64, "base64").toString("hex");
}

function loadMacaroon(macaroon?: string, macaroonPath?: string) {
  try {
    const value = macaroonPath
      ? readFileSync(resolveHome(macaroonPath)).toString("hex")
      : macaroon?.trim();

    if (!value || value.length % 2 !== 0 || !/^[a-fA-F0-9]+$/.test(value)) {
      throw new Error("LND_INVALID_CONFIG");
    }

    return value.toLowerCase();
  } catch (error) {
    if (error instanceof Error && error.message === "LND_INVALID_CONFIG") throw error;
    throw new Error("LND_INVALID_CONFIG");
  }
}

function createHttpsAgent(config: LndClientConfig) {
  if (!config.restHost?.startsWith("https://")) return undefined;

  if (config.tlsCertPath) {
    try {
      return new https.Agent({
        ca: readFileSync(resolveHome(config.tlsCertPath)),
        rejectUnauthorized: true,
      });
    } catch {
      throw new Error("LND_INVALID_CONFIG");
    }
  }

  if (config.allowInsecureTls) {
    return new https.Agent({ rejectUnauthorized: false });
  }

  return undefined;
}

function resolveHome(path: string) {
  return resolve(path.startsWith("~/") ? `${homedir()}/${path.slice(2)}` : path);
}
