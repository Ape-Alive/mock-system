const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function upsertFile(filePath, fileHash, vectorId, mtime) {
    return await prisma.fileVectorIndex.upsert({
        where: { filePath },
        update: { fileHash, vectorId, mtime },
        create: { filePath, fileHash, vectorId, mtime },
    });
}

async function getFileByPath(filePath) {
    return await prisma.fileVectorIndex.findUnique({ where: { filePath } });
}

async function getFileByVectorId(vectorId) {
    return await prisma.fileVectorIndex.findFirst({ where: { vectorId } });
}

async function deleteFileByPath(filePath) {
    return await prisma.fileVectorIndex.delete({ where: { filePath } });
}

async function deleteFileByVectorId(vectorId) {
    const record = await prisma.fileVectorIndex.findFirst({ where: { vectorId } });
    if (record) {
        return await prisma.fileVectorIndex.delete({ where: { filePath: record.filePath } });
    }
    return null;
}

async function listAllFiles() {
    return await prisma.fileVectorIndex.findMany();
}

module.exports = {
    upsertFile,
    getFileByPath,
    getFileByVectorId,
    deleteFileByPath,
    deleteFileByVectorId,
    listAllFiles,
};