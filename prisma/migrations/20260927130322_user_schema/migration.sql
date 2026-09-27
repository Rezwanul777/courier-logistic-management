/*
  Warnings:

  - The values [SUPER_ADMIN,DOCTOR,PATIENT] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[googleId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
BEGIN;

-- A previous failed attempt may already have created this enum.
DO $$
BEGIN
    CREATE TYPE "AuthProvider" AS ENUM ('CREDENTIAL', 'GOOGLE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Replace the unused healthcare Role enum.
-- No CASCADE: PostgreSQL will stop if another column uses it.
DROP TYPE "Role";

CREATE TYPE "Role" AS ENUM (
    'CUSTOMER',
    'COURIER',
    'ADMIN'
);

ALTER TABLE "User"
    ADD COLUMN "authProvider" "AuthProvider" NOT NULL DEFAULT 'CREDENTIAL',
    ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "deletedAt" TIMESTAMP(3),
    ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "googleId" TEXT,
    ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "passwordHash" TEXT,
    ADD COLUMN "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Existing rows receive a timestamp; Prisma handles future updates.
ALTER TABLE "User"
    ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE TABLE "RefreshSession" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RefreshSession_tokenHash_key"
    ON "RefreshSession"("tokenHash");

CREATE INDEX "RefreshSession_userId_revokedAt_idx"
    ON "RefreshSession"("userId", "revokedAt");

CREATE UNIQUE INDEX "User_googleId_key"
    ON "User"("googleId");

CREATE INDEX "User_role_isActive_idx"
    ON "User"("role", "isActive");

ALTER TABLE "RefreshSession"
    ADD CONSTRAINT "RefreshSession_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

COMMIT;
