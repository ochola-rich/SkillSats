import axios from "axios";
import https from "https";

if (!process.env.LND_REST_HOST || !process.env.LND_MACAROON) {
  console.warn("[LND] Warning: LND_REST_HOST or LND_MACAROON env vars are missing.");
}

export const lnd = axios.create({
  baseURL: process.env.LND_REST_HOST,
  headers: {
    "Grpc-Metadata-Macaroon": process.env.LND_MACAROON ?? "",
    "Content-Type": "application/json",
  },
  // Skip TLS cert verification for local Polar dev node only
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 10000,
});

// LND API reference used in this project:
// POST /v1/invoices               → create invoice (returns payment_request + r_hash)
// GET  /v1/invoice/{r_hash_hex}  → check settlement status (returns { settled: bool })
// POST /v1/channels/transactions  → send payment to external wallet (withdrawal)
// GET  /v1/getinfo               → node health check

export async function lndHealthCheck() {
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
