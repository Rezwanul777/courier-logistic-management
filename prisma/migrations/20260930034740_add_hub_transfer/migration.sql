-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('DISPATCHED', 'RECEIVED');

-- CreateTable
CREATE TABLE "HubTransfer" (
    "id" SERIAL NOT NULL,
    "shipmentId" INTEGER NOT NULL,
    "fromHubId" INTEGER NOT NULL,
    "toHubId" INTEGER NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'DISPATCHED',
    "createdById" INTEGER NOT NULL,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HubTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HubTransfer_shipmentId_idx" ON "HubTransfer"("shipmentId");

-- AddForeignKey
ALTER TABLE "HubTransfer" ADD CONSTRAINT "HubTransfer_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubTransfer" ADD CONSTRAINT "HubTransfer_fromHubId_fkey" FOREIGN KEY ("fromHubId") REFERENCES "Hub"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubTransfer" ADD CONSTRAINT "HubTransfer_toHubId_fkey" FOREIGN KEY ("toHubId") REFERENCES "Hub"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
