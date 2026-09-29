/*
  Warnings:

  - Added the required column `type` to the `CourierTask` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `CourierTask` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CourierTask" DROP CONSTRAINT "CourierTask_shipmentId_fkey";

-- AlterTable
ALTER TABLE "CourierTask" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "proof" TEXT,
ADD COLUMN     "status" "TaskStatus" NOT NULL DEFAULT 'ASSIGNED',
ADD COLUMN     "type" "TaskType" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "CourierTask_courierId_status_idx" ON "CourierTask"("courierId", "status");

-- CreateIndex
CREATE INDEX "CourierTask_shipmentId_idx" ON "CourierTask"("shipmentId");

-- AddForeignKey
ALTER TABLE "CourierTask" ADD CONSTRAINT "CourierTask_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
