
import "dotenv/config";
import Stripe from "stripe";

const eventId = process.argv[2];

const stripeKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret =
  process.env.STRIPE_WEBHOOK_SECRET;

const webhookUrl =
  "http://127.0.0.1:5000/api/v1/payments/webhook";

if (!stripeKey?.startsWith("sk_test_")) {
  throw new Error(
    "Only Stripe test-mode keys are allowed.",
  );
}

if (!webhookSecret?.startsWith("whsec_")) {
  throw new Error(
    "STRIPE_WEBHOOK_SECRET is missing.",
  );
}

if (!/^evt_[a-zA-Z0-9]+$/.test(eventId ?? "")) {
  throw new Error(
    "Provide a valid Stripe event ID.",
  );
}

const stripe = new Stripe(stripeKey);

// Retrieve the previously completed event.
// No new payment is created.
const event = await stripe.events.retrieve(eventId);

const session = event.data.object;

if (
  event.livemode ||
  event.type !== "checkout.session.completed" ||
  session.object !== "checkout.session" ||
  session.metadata?.shipmentId !== "2" ||
  session.payment_status !== "paid" ||
  session.amount_total !== 12000 ||
  session.currency !== "bdt"
) {
  throw new Error(
    "Event does not match the expected paid test shipment #2.",
  );
}

// Sign a copy using our LOCAL test webhook secret.
// The Express webhook will verify this signature.
const payload = JSON.stringify(event);

const signature =
  stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret,
  });

console.log("Replaying existing Stripe test event...");
console.log("Event ID:", event.id);
console.log("Shipment ID: 2");
console.log("No new Stripe charge will be created.");

const response = await fetch(webhookUrl, {
  method: "POST",

  headers: {
    "Content-Type": "application/json",
    "Stripe-Signature": signature,
  },

  body: payload,
  signal: AbortSignal.timeout(10000),
});

const result = await response.text();

console.log("HTTP Status:", response.status);
console.log("Webhook Response:", result);

if (!response.ok) {
  process.exitCode = 1;
}
