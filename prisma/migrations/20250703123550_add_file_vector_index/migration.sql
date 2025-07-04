-- CreateTable
CREATE TABLE "FileVectorIndex" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "filePath" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "vectorId" INTEGER NOT NULL,
    "mtime" BIGINT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "FileVectorIndex_filePath_key" ON "FileVectorIndex"("filePath");
