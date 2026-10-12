
import "dotenv/config";
import Stripe from "stripe";

const SHIPMENT_ID = 2;

const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!stripeKey?.startsWith("sk_test_")) {
  throw new Error(
    "This test requires a Stripe Sandbox secret key.",
  );
}

const stripe = new Stripe(stripeKey);

// Read existing Stripe events.
// This does NOT create a payment.
const events = await stripe.events.list({
  type: "checkout.session.completed",
  limit: 100,
});

const matchingEvents = events.data.filter((event) => {
  const session = event.data.object;

  return (
    session.object === "checkout.session" &&
    session.metadata?.shipmentId ===
      String(SHIPMENT_ID)
  );
});

if (matchingEvents.length === 0) {
  console.log(
    "No completed Checkout events found for shipment #2 in the latest 100 events.",
  );
  process.exit(0);
}

console.log(`Shipment #${SHIPMENT_ID} Stripe events:`);

for (const event of matchingEvents) {
  const session = event.data.object;

  console.log({
    eventId: event.id,
    eventType: event.type,
    sessionId: session.id,
    paymentStatus: session.payment_status,
    checkoutStatus: session.status,
    amountMinor: session.amount_total,
    currency: session.currency,
  });
}
