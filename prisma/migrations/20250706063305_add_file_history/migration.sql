-- CreateTable
CREATE TABLE "FileHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "filePath" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "operator" TEXT,
    "newPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
