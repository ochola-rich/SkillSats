import axios from "axios";
import https from "node:https";

export function getLndClient() {
  const baseURL = process.env.LND_REST_HOST;
  const macaroon = process.env.LND_MACAROON;
  if (!baseURL || !macaroon) throw new Error("LND_NOT_CONFIGURED");

  return axios.create({
    baseURL,
    headers: {
      "Grpc-Metadata-Macaroon": macaroon,
      "Content-Type": "application/json",
    },
    httpsAgent:
      process.env.NODE_ENV === "production"
        ? undefined
        : new https.Agent({ rejectUnauthorized: false }),
    timeout: 10_000,
  });
}

// LND API reference used in this project:
// POST /v1/invoices               → create invoice (returns payment_request + r_hash)
// GET  /v1/invoice/{r_hash_hex}  → check settlement status (returns { settled: bool })
// POST /v1/channels/transactions  → send payment to external wallet (withdrawal)
// GET  /v1/getinfo               → node health check

export async function lndHealthCheck() {
  const lnd = getLndClient();
  const { data } = await lnd.get("/v1/getinfo");
  return { alias: data.alias, pubkey: data.identity_pubkey, synced: data.synced_to_chain };
}

/**
 * LND REST API returns r_hash as base64.
 * Polling requires hex-encoded r_hash.
 */
export function b64ToHex(b64: string) {
  return Buffer.from(b64, "base64").toString("hex");
}
