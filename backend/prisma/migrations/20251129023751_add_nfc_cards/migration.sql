-- CreateTable
CREATE TABLE "nfc_cards" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cardId" TEXT NOT NULL,
    "cardType" TEXT NOT NULL DEFAULT 'NTag215',
    "frequency" TEXT NOT NULL DEFAULT '13.56MHz',
    "userId" INTEGER,
    "cardStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "balance" REAL NOT NULL DEFAULT 0,
    "lastUsed" DATETIME,
    "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "isPhysical" BOOLEAN NOT NULL DEFAULT true,
    "cardData" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "nfc_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "nfc_transactions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cardId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "amount" REAL,
    "balanceBefore" REAL NOT NULL,
    "balanceAfter" REAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "location" TEXT,
    "ipAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "fraudScore" REAL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "nfc_transactions_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "nfc_cards" ("cardId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "nfc_cards_cardId_key" ON "nfc_cards"("cardId");

-- CreateIndex
CREATE INDEX "nfc_cards_cardId_idx" ON "nfc_cards"("cardId");

-- CreateIndex
CREATE INDEX "nfc_cards_userId_idx" ON "nfc_cards"("userId");

-- CreateIndex
CREATE INDEX "nfc_cards_cardStatus_idx" ON "nfc_cards"("cardStatus");

-- CreateIndex
CREATE INDEX "nfc_transactions_cardId_idx" ON "nfc_transactions"("cardId");

-- CreateIndex
CREATE INDEX "nfc_transactions_createdAt_idx" ON "nfc_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "transactions_senderId_idx" ON "transactions"("senderId");

-- CreateIndex
CREATE INDEX "transactions_receiverId_idx" ON "transactions"("receiverId");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");
