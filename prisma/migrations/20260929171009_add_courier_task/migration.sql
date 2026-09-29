-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('PICKUP', 'DELIVERY', 'RETURN');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "CourierTask" (
    "id" SERIAL NOT NULL,
    "shipmentId" INTEGER NOT NULL,
    "courierId" INTEGER NOT NULL,
    "assignedById" INTEGER NOT NULL,

    CONSTRAINT "CourierTask_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CourierTask" ADD CONSTRAINT "CourierTask_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierTask" ADD CONSTRAINT "CourierTask_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourierTask" ADD CONSTRAINT "CourierTask_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
