-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'CHECKOUT_PENDING', 'PAID', 'REFUND_PENDING', 'REFUNDED', 'FAILED');

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "shipmentId" INTEGER NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "provider" TEXT NOT NULL DEFAULT 'STRIPE',
    "checkoutSessionId" TEXT,
    "providerPaymentId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" SERIAL NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" TEXT NOT NULL,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_shipmentId_key" ON "Payment"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_checkoutSessionId_key" ON "Payment"("checkoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_providerEventId_key" ON "WebhookEvent"("providerEventId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
