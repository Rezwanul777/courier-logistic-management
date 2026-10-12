
import type Stripe from "stripe";

import config from "../../config";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { stripe } from "../../utils/stripe";

import type { ICreateCheckout } from "./payment.interface";

// ----------------------------------------------
// Shared helpers
// ----------------------------------------------

function isPrismaError(
  error: unknown,
  code: string,
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

function getFrontendOrigin(): string {
  const value = config.frontend_url;

  if (!value) {
    throw new AppError(
      503,
      "FRONTEND_URL is not configured.",
    );
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new AppError(
      503,
      "Invalid FRONTEND_URL.",
    );
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new AppError(
      503,
      "Invalid frontend origin.",
    );
  }

  if (
    config.node_env === "production" &&
    url.protocol !== "https:"
  ) {
    throw new AppError(
      503,
      "Production checkout requires HTTPS.",
    );
  }

  return url.origin;
}

function checkoutIdempotencyKey(
  shipmentId: number,
  previousSessionId: string | null,
): string {
  return [
    "courierflow",
    "checkout",
    shipmentId,
    previousSessionId ?? "initial",
  ].join(":");
}

// ----------------------------------------------
// Create or reuse Stripe Checkout
// ----------------------------------------------

const createCheckout = async (
  userId: number,
  payload: ICreateCheckout,
) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: payload.shipmentId,
      customerId: userId,
      deletedAt: null,
    },
  });

  if (!shipment) {
    throw new AppError(
      404,
      "Shipment not found.",
    );
  }

  if (shipment.status !== "DRAFT") {
    throw new AppError(
      409,
      "Checkout is unavailable for this shipment.",
    );
  }

  if (
    !Number.isSafeInteger(shipment.quotedAmountMinor) ||
    shipment.quotedAmountMinor <= 0
  ) {
    throw new AppError(
      422,
      "Invalid shipment amount.",
    );
  }

  const previousPayment =
    await prisma.payment.findUnique({
      where: {
        shipmentId: shipment.id,
      },
    });

  if (
    previousPayment &&
    ["PAID", "REFUND_PENDING", "REFUNDED"].includes(
      previousPayment.status,
    )
  ) {
    throw new AppError(
      409,
      "This shipment already has a completed payment.",
    );
  }

  // Never silently reuse a session whose amount
  // differs from the current saved shipment.
  if (
    previousPayment &&
    (
      previousPayment.amountMinor !==
        shipment.quotedAmountMinor ||
      previousPayment.currency.toUpperCase() !==
        shipment.currency.toUpperCase()
    )
  ) {
    throw new AppError(
      409,
      "Stored payment amount does not match the shipment.",
    );
  }

  if (previousPayment?.checkoutSessionId) {
    const existingSession =
      await stripe.checkout.sessions.retrieve(
        previousPayment.checkoutSessionId,
      );

    if (
      existingSession.amount_total !==
        shipment.quotedAmountMinor ||
      existingSession.currency?.toUpperCase() !==
        shipment.currency.toUpperCase() ||
      existingSession.mode !== "payment"
    ) {
      throw new AppError(
        409,
        "Existing Checkout session does not match the shipment.",
      );
    }

    // A completed Checkout session must not be
    // replaced until its payment is reconciled.
    if (
      existingSession.status === "complete" ||
      existingSession.payment_status === "paid"
    ) {
      throw new AppError(
        409,
        "Previous checkout is being processed. Check payment status.",
      );
    }

    // Reuse an existing open session.
    if (
      existingSession.status === "open" &&
      existingSession.url
    ) {
      return {
        checkoutUrl: existingSession.url,
        sessionId: existingSession.id,
      };
    }

    // Only a confirmed expired session may be
    // replaced by a new session.
    if (existingSession.status !== "expired") {
      throw new AppError(
        409,
        "Previous Checkout session is not ready for replacement.",
      );
    }
  }

  const origin = getFrontendOrigin();

  // Requests for the same attempt use the same
  // Stripe idempotency key, even concurrently.
  const idempotencyKey = checkoutIdempotencyKey(
    shipment.id,
    previousPayment?.checkoutSessionId ?? null,
  );

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],

      client_reference_id: String(shipment.id),

      line_items: [
        {
          price_data: {
            currency: shipment.currency.toLowerCase(),

            product_data: {
              name:
                `Courier shipment ${shipment.trackingCode}`,
            },

            unit_amount: shipment.quotedAmountMinor,
          },

          quantity: 1,
        },
      ],

      success_url:
        `${origin}/payment/success?shipmentId=${shipment.id}`,

      cancel_url:
        `${origin}/payment/cancel?shipmentId=${shipment.id}`,

      metadata: {
        shipmentId: String(shipment.id),
      },
    },
    {
      idempotencyKey,
    },
  );

  if (!session.url) {
    throw new AppError(
      502,
      "Stripe did not return a checkout URL.",
    );
  }

  try {
    if (previousPayment) {
      // Compare-and-swap:
      // Only update the exact payment state and
      // session ID that we previously examined.
      const updated = await prisma.payment.updateMany({
        where: {
          id: previousPayment.id,
          shipmentId: shipment.id,
          status: previousPayment.status,
          checkoutSessionId:
            previousPayment.checkoutSessionId,
        },

        data: {
          status: "CHECKOUT_PENDING",
          checkoutSessionId: session.id,
          idempotencyKey: session.id,
          amountMinor: shipment.quotedAmountMinor,
          currency: shipment.currency,
        },
      });

      if (updated.count !== 1) {
        // A concurrent request or webhook changed
        // the payment state. Never overwrite it.
        const latest =
          await prisma.payment.findUnique({
            where: {
              shipmentId: shipment.id,
            },
          });

        if (
          latest?.status === "CHECKOUT_PENDING" &&
          latest.checkoutSessionId === session.id
        ) {
          return {
            checkoutUrl: session.url,
            sessionId: session.id,
          };
        }

        throw new AppError(
          409,
          "Payment state changed. Refresh and try again.",
        );
      }
    } else {
      // Two simultaneous first-time requests may
      // race here, but the unique shipmentId and
      // Stripe idempotency key prevent independent
      // payment records for the same attempt.
      await prisma.payment.create({
        data: {
          shipmentId: shipment.id,
          amountMinor: shipment.quotedAmountMinor,
          currency: shipment.currency,
          status: "CHECKOUT_PENDING",
          checkoutSessionId: session.id,
          idempotencyKey: session.id,
        },
      });
    }
  } catch (error: unknown) {
    if (isPrismaError(error, "P2002")) {
      const latest =
        await prisma.payment.findUnique({
          where: {
            shipmentId: shipment.id,
          },
        });

      if (
        latest?.status === "CHECKOUT_PENDING" &&
        latest.checkoutSessionId === session.id
      ) {
        return {
          checkoutUrl: session.url,
          sessionId: session.id,
        };
      }

      throw new AppError(
        409,
        "A concurrent checkout request changed the payment.",
      );
    }

    throw error;
  }

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
  };
};

// ----------------------------------------------
// Get payment for authenticated customer
// ----------------------------------------------

const getPayment = async (
  userId: number,
  shipmentId: number,
) => {
  return prisma.payment.findFirst({
    where: {
      shipmentId,

      shipment: {
        customerId: userId,
        deletedAt: null,
      },
    },
  });
};

// ----------------------------------------------
// Stripe webhook events
// ----------------------------------------------

const supportedEvents = new Set<string>([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);

function isPaidEvent(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
): boolean {
  return (
    (
      event.type === "checkout.session.completed" ||
      event.type ===
        "checkout.session.async_payment_succeeded"
    ) &&
    session.payment_status === "paid"
  );
}

function isFailedEvent(
  event: Stripe.Event,
): boolean {
  return (
    event.type ===
      "checkout.session.async_payment_failed" ||
    event.type === "checkout.session.expired"
  );
}

// ----------------------------------------------
// Process webhook atomically
// ----------------------------------------------

const handleWebhook = async (
  rawBody: Buffer,
  signature: string,
) => {
  if (!config.stripe_webhook_secret) {
    throw new AppError(
      503,
      "Stripe webhook secret is not configured.",
    );
  }

  if (!signature) {
    throw new AppError(
      400,
      "Missing Stripe signature.",
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.stripe_webhook_secret,
    );
  } catch {
    throw new AppError(
      400,
      "Invalid Stripe webhook signature.",
    );
  }

  if (!supportedEvents.has(event.type)) {
    return {
      message: "Stripe event not applicable.",
    };
  }

  const session =
    event.data.object as Stripe.Checkout.Session;

  const shipmentId = Number(
    session.metadata?.shipmentId,
  );

  if (
    !Number.isSafeInteger(shipmentId) ||
    shipmentId <= 0 ||
    !session.id
  ) {
    throw new AppError(
      400,
      "Invalid Stripe Checkout metadata.",
    );
  }

  if (
    session.client_reference_id &&
    session.client_reference_id !== String(shipmentId)
  ) {
    throw new AppError(
      409,
      "Stripe Checkout reference does not match.",
    );
  }

  // Retry transaction conflicts a limited number
  // of times. Do not retry Stripe charges here.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existingEvent =
            await tx.webhookEvent.findUnique({
              where: {
                providerEventId: event.id,
              },
            });

          if (existingEvent?.outcome === "SUCCESS") {
            return {
              message: "Event already processed.",
            };
          }

          // Claim the event INSIDE the transaction.
          // The unique providerEventId prevents two
          // concurrent deliveries from processing
          // the same event independently.
          //
          // This claim is rolled back if any
          // subsequent operation fails.
          if (existingEvent) {
            const claimed =
              await tx.webhookEvent.updateMany({
                where: {
                  id: existingEvent.id,
                  outcome: {
                    not: "SUCCESS",
                  },
                },
                data: {
                  outcome: "SUCCESS",
                },
              });

            if (claimed.count !== 1) {
              return {
                message: "Event already processed.",
              };
            }
          } else {
            await tx.webhookEvent.create({
              data: {
                providerEventId: event.id,
                type: event.type,
                outcome: "SUCCESS",
              },
            });
          }

          const payment =
            await tx.payment.findUnique({
              where: {
                shipmentId,
              },
            });

          const paidEvent = isPaidEvent(
            event,
            session,
          );

          // An event from a replaced session must
          // not modify the current payment.
          if (
            !payment ||
            payment.checkoutSessionId !== session.id
          ) {
            if (
              paidEvent ||
              session.payment_status === "paid"
            ) {
              // Roll back the event claim so Stripe
              // retries while this is investigated.
              throw new AppError(
                409,
                "Paid Stripe session is not linked to the current payment. Reconciliation required.",
              );
            }

            return {
              message:
                "Obsolete non-paid Checkout event ignored.",
            };
          }

          if (paidEvent && payment.status !== "PAID") {
            if (
              session.mode !== "payment" ||
              session.amount_total !==
                payment.amountMinor ||
              session.currency?.toUpperCase() !==
                payment.currency.toUpperCase()
            ) {
              throw new AppError(
                409,
                "Stripe payment amount or currency does not match.",
              );
            }

            const shipment =
              await tx.shipment.findFirst({
                where: {
                  id: shipmentId,
                  status: "DRAFT",
                  deletedAt: null,
                },
              });

            if (
              !shipment ||
              shipment.quotedAmountMinor !==
                payment.amountMinor ||
              shipment.currency.toUpperCase() !==
                payment.currency.toUpperCase()
            ) {
              throw new AppError(
                409,
                "Shipment and payment details do not match.",
              );
            }

            if (
              ![
                "UNPAID",
                "CHECKOUT_PENDING",
                "FAILED",
              ].includes(payment.status)
            ) {
              throw new AppError(
                409,
                "Payment cannot transition to PAID.",
              );
            }

            const paymentIntentId =
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id ?? null;

            const updatedPayment =
              await tx.payment.updateMany({
                where: {
                  id: payment.id,
                  checkoutSessionId: session.id,
                  status: {
                    in: [
                      "UNPAID",
                      "CHECKOUT_PENDING",
                      "FAILED",
                    ],
                  },
                },

                data: {
                  status: "PAID",
                  providerPaymentId: paymentIntentId,
                  paidAt: new Date(),
                },
              });

            if (updatedPayment.count !== 1) {
              throw new AppError(
                409,
                "Concurrent payment update detected.",
              );
            }

            const updatedShipment =
              await tx.shipment.updateMany({
                where: {
                  id: shipmentId,
                  status: "DRAFT",
                  deletedAt: null,
                },

                data: {
                  status: "READY_FOR_PICKUP",
                },
              });

            if (updatedShipment.count !== 1) {
              throw new AppError(
                409,
                "Concurrent shipment update detected.",
              );
            }

            await tx.trackingEvent.create({
              data: {
                shipmentId,
                previousStatus: "DRAFT",
                newStatus: "READY_FOR_PICKUP",
                reason:
                  "Payment verified by Stripe webhook",
              },
            });
          } else if (
            isFailedEvent(event) &&
            payment.status === "CHECKOUT_PENDING"
          ) {
            await tx.payment.updateMany({
              where: {
                id: payment.id,
                checkoutSessionId: session.id,
                status: "CHECKOUT_PENDING",
              },

              data: {
                status: "FAILED",
              },
            });
          }

          return {
            message:
              "Webhook processed successfully.",
          };
        },
        {
          timeout: 10_000,
        },
      );
    } catch (error: unknown) {
      // Another delivery may have committed the
      // same webhook event first.
      if (isPrismaError(error, "P2002")) {
        const processed =
          await prisma.webhookEvent.findUnique({
            where: {
              providerEventId: event.id,
            },
          });

        if (processed?.outcome === "SUCCESS") {
          return {
            message: "Event already processed.",
          };
        }
      }

      // Prisma transaction conflict/deadlock.
      if (
        isPrismaError(error, "P2034") &&
        attempt < 2
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new AppError(
    503,
    "Webhook processing could not complete.",
  );
};

// ----------------------------------------------
// Exports
// ----------------------------------------------

export const PaymentService = {
  createCheckout,
  getPayment,
  handleWebhook,
};





