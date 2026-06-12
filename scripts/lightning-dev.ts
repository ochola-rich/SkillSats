import { config } from "dotenv";

import { b64ToHex, createLndClient, getLndClient, sendLndPayment } from "../src/lib/lnd.server";

config();
config({ path: ".local-lightning/app.env", override: true });

const [command, ...args] = process.argv.slice(2);

async function main() {
  switch (command) {
    case "check":
      await checkNodes();
      return;
    case "pay":
      await payInvoice(args[0]);
      return;
    case "invoice":
      await createInvoice(args[0], args.slice(1).join(" "));
      return;
    case "test":
      await testPaymentDirections();
      return;
    default:
      throw new Error(
        "Usage: lightning-dev.ts check | test | pay <bolt11> | invoice <amount-sats> [memo]",
      );
  }
}

async function checkNodes() {
  const [skillsats, payer] = await Promise.all([
    getLndClient().get("/v1/getinfo"),
    getPayerClient().get("/v1/getinfo"),
  ]);

  printNode("SkillSats", skillsats.data);
  printNode("Payer", payer.data);

  for (const node of [skillsats.data, payer.data]) {
    if (!node.synced_to_chain || Number(node.num_active_channels) < 1) {
      throw new Error(`${node.alias} is not synced with an active channel.`);
    }
  }
}

async function payInvoice(paymentRequest?: string) {
  if (!paymentRequest) throw new Error("A BOLT11 payment request is required.");

  const payment = await sendLndPayment(getPayerClient(), paymentRequest);

  console.log(`Payment sent: ${payment.paymentHash}`);
}

async function createInvoice(amountInput?: string, memo?: string) {
  const amount = Number(amountInput);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("Invoice amount must be a positive integer number of sats.");
  }

  const { data } = await getPayerClient().post("/v1/invoices", {
    value: amount,
    memo: memo || "SkillSats development withdrawal",
    expiry: 600,
  });

  console.log(data.payment_request);
}

async function testPaymentDirections() {
  const skillsats = getLndClient();
  const payer = getPayerClient();

  await checkNodes();
  await settleInvoice(skillsats, payer, "purchase");
  await settleInvoice(payer, skillsats, "withdrawal");

  console.log("Bidirectional Lightning payments settled successfully.");
}

async function settleInvoice(
  receiver: ReturnType<typeof getLndClient>,
  sender: ReturnType<typeof getLndClient>,
  memo: string,
) {
  const { data: invoice } = await receiver.post("/v1/invoices", {
    value: 25,
    memo: `SkillSats development ${memo} test`,
    expiry: 600,
  });
  console.log(`${memo}: invoice created`);
  await sendLndPayment(sender, invoice.payment_request);
  console.log(`${memo}: payment sent`);

  const { data: settled } = await receiver.get(`/v1/invoice/${b64ToHex(invoice.r_hash)}`);
  if (!settled.settled) throw new Error(`${memo} test invoice did not settle.`);
}

function getPayerClient() {
  return createLndClient({
    restHost: process.env.DEV_LND_PAYER_REST_HOST,
    macaroon: process.env.DEV_LND_PAYER_MACAROON,
    macaroonPath: process.env.DEV_LND_PAYER_MACAROON_PATH,
    tlsCertPath: process.env.DEV_LND_PAYER_TLS_CERT_PATH,
    allowInsecureTls: true,
  });
}

function printNode(label: string, node: Record<string, unknown>) {
  const activeChannels = node.num_active_channels ?? 0;
  const synced = node.synced_to_chain === true ? "synced" : "not synced";
  console.log(`${label}: ${node.alias} (${synced}, ${activeChannels} active channel(s))`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Lightning development command failed: ${message}`);
  process.exitCode = 1;
});
