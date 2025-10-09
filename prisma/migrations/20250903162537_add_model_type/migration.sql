-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AIModel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "providerId" INTEGER NOT NULL,
    "modelType" TEXT NOT NULL DEFAULT 'LLM',
    "isBeta" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIModel_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AIProvider" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AIModel" ("createdAt", "displayName", "id", "isActive", "isBeta", "name", "providerId", "updatedAt") SELECT "createdAt", "displayName", "id", "isActive", "isBeta", "name", "providerId", "updatedAt" FROM "AIModel";
DROP TABLE "AIModel";
ALTER TABLE "new_AIModel" RENAME TO "AIModel";
CREATE UNIQUE INDEX "AIModel_name_providerId_key" ON "AIModel"("name", "providerId");
CREATE TABLE "new_LocalDirectory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "directory" TEXT NOT NULL,
    "projectName" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_LocalDirectory" ("directory", "id", "projectName", "updatedAt") SELECT "directory", "id", "projectName", "updatedAt" FROM "LocalDirectory";
DROP TABLE "LocalDirectory";
ALTER TABLE "new_LocalDirectory" RENAME TO "LocalDirectory";
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "apiKeys" JSONB,
    "customApi" JSONB,
    "defaultModel" TEXT,
    "modelParams" JSONB,
    "general" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("apiKeys", "createdAt", "customApi", "defaultModel", "general", "id", "modelParams", "provider", "updatedAt") SELECT "apiKeys", "createdAt", "customApi", "defaultModel", "general", "id", "modelParams", "provider", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
