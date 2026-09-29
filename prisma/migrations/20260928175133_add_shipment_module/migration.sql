-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('DRAFT', 'READY_FOR_PICKUP', 'PICKUP_ASSIGNED', 'PICKED_UP', 'AT_ORIGIN_HUB', 'IN_TRANSIT', 'AT_DESTINATION_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED', 'RETURN_IN_TRANSIT', 'RETURNED_TO_SENDER', 'CANCEL_REQUESTED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "Hub" DROP CONSTRAINT "Hub_zoneId_fkey";

-- CreateTable
CREATE TABLE "Shipment" (
    "id" SERIAL NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "originHubId" INTEGER NOT NULL,
    "destinationHubId" INTEGER NOT NULL,
    "description" TEXT,
    "weight" DOUBLE PRECISION NOT NULL,
    "pickupAddress" JSONB NOT NULL,
    "recipient" JSONB NOT NULL,
    "quotedAmountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'DRAFT',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" SERIAL NOT NULL,
    "shipmentId" INTEGER NOT NULL,
    "previousStatus" "ShipmentStatus",
    "newStatus" "ShipmentStatus" NOT NULL,
    "actorId" INTEGER,
    "reason" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_trackingCode_key" ON "Shipment"("trackingCode");

-- CreateIndex
CREATE INDEX "Shipment_customerId_createdAt_idx" ON "Shipment"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Shipment_status_createdAt_idx" ON "Shipment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TrackingEvent_shipmentId_occurredAt_idx" ON "TrackingEvent"("shipmentId", "occurredAt");

-- AddForeignKey
ALTER TABLE "Hub" ADD CONSTRAINT "Hub_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_originHubId_fkey" FOREIGN KEY ("originHubId") REFERENCES "Hub"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_destinationHubId_fkey" FOREIGN KEY ("destinationHubId") REFERENCES "Hub"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
