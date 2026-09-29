-- CreateTable
CREATE TABLE "RateCard" (
    "id" SERIAL NOT NULL,
    "originZoneId" INTEGER NOT NULL,
    "destinationZoneId" INTEGER NOT NULL,
    "weightFrom" DOUBLE PRECISION NOT NULL,
    "weightTo" DOUBLE PRECISION NOT NULL,
    "baseAmountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateCard_originZoneId_destinationZoneId_idx" ON "RateCard"("originZoneId", "destinationZoneId");

-- CreateIndex
CREATE INDEX "RateCard_isActive_deletedAt_idx" ON "RateCard"("isActive", "deletedAt");

-- AddForeignKey
ALTER TABLE "RateCard" ADD CONSTRAINT "RateCard_originZoneId_fkey" FOREIGN KEY ("originZoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateCard" ADD CONSTRAINT "RateCard_destinationZoneId_fkey" FOREIGN KEY ("destinationZoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
