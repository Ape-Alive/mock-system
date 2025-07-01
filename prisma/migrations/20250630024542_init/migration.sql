-- CreateTable
CREATE TABLE "LocalDirectory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "directory" TEXT NOT NULL,
    "projectName" TEXT,
    "updatedAt" DATETIME NOT NULL
);
