import Stripe from "stripe";
import { prisma } from "../../lib/prisma";
import { stripe } from "../../utils/stripe";
import { ICreateCheckout } from "./payment.interface";

const createCheckout = async (userId: number, payload: ICreateCheckout) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: payload.shipmentId,
      customerId: userId,
      deletedAt: null,
    },
  });

  if (!shipment) {
    throw new Error("Shipment not found");
  }

  if (shipment.status !== "DRAFT") {
    throw new Error("Payment unavailable");
  }

  const payment = await prisma.payment.findFirst({
    where: {
      shipmentId: shipment.id,
    },
  });

  if (payment?.status === "PAID") {
    throw new Error("Already paid");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",

    line_items: [
      {
        price_data: {
          currency: shipment.currency.toLowerCase(),

          product_data: {
            name: `Courier shipment ${shipment.trackingCode}`,
          },

          unit_amount: shipment.quotedAmountMinor,
        },

        quantity: 1,
      },
    ],

    success_url: "http://localhost:3000/payment/success",

    cancel_url: "http://localhost:3000/payment/cancel",

    metadata: {
      shipmentId: String(shipment.id),
    },
  });

  await prisma.payment.upsert({
    where: {
      shipmentId: shipment.id,
    },

    create: {
      shipmentId: shipment.id,

      amountMinor: shipment.quotedAmountMinor,

      currency: shipment.currency,

      status: "CHECKOUT_PENDING",

      checkoutSessionId: session.id,

      idempotencyKey: session.id,
    },

    update: {
      checkoutSessionId: session.id,

      status: "CHECKOUT_PENDING",
    },
  });

  return {
    checkoutUrl: session.url,

    sessionId: session.id,
  };
};

const getPayment = async (userId: number, shipmentId: number) => {
  return prisma.payment.findFirst({
    where: {
      shipmentId,

      shipment: {
        customerId: userId,
      },
    },
  });
};

const handleWebhook = async (rawBody: Buffer, signature: string) => {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,

      signature,

      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error) {
    throw new Error("Invalid Stripe webhook signature");
  }

  const existingEvent = await prisma.webhookEvent.findUnique({
    where: {
      providerEventId: event.id,
    },
  });

  if (existingEvent) {
    return {
      message: "Event already processed",
    };
  }

  await prisma.webhookEvent.create({
    data: {
      providerEventId: event.id,

      type: event.type,

      outcome: "PROCESSING",
    },
  });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const shipmentId = Number(session.metadata?.shipmentId);

    if (!shipmentId) {
      throw new Error("Shipment ID missing");
    }

    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: {
          checkoutSessionId: session.id,
        },
      });

      if (!payment) {
        throw new Error("Payment not found");
      }

      if (payment.status === "PAID") {
        return;
      }

      await tx.payment.update({
        where: {
          id: payment.id,
        },

        data: {
          status: "PAID",

          providerPaymentId: session.payment_intent as string,

          paidAt: new Date(),
        },
      });

      const shipment = await tx.shipment.findUnique({
        where: {
          id: shipmentId,
        },
      });

      if (!shipment) {
        throw new Error("Shipment not found");
      }

      await tx.shipment.update({
        where: {
          id: shipmentId,
        },

        data: {
          status: "READY_FOR_PICKUP",
        },
      });

      await tx.trackingEvent.create({
        data: {
          shipmentId,

          previousStatus: shipment.status,

          newStatus: "READY_FOR_PICKUP",

          reason: "Payment completed via Stripe webhook",
        },
      });

      await tx.webhookEvent.update({
        where: {
          providerEventId: event.id,
        },

        data: {
          outcome: "SUCCESS",
        },
      });
    });
  }

  return {
    message: "Webhook processed successfully",
  };
};

export const PaymentService = {
  createCheckout,

  getPayment,
  handleWebhook,
};
