const express = require('express');
const router = express.Router();
const aiAgent = require('../services/aiAgentService');
const { startWatching, rebuildIndex } = require('../services/aiAgentWatcherService');

// 代码/文本语义检索
router.post('/search', async (req, res) => {
    const { query, type = 'code', top_k = 5 } = req.body;
    try {
        let vector;
        if (type === 'code') {
            vector = await aiAgent.vectorizeCode(query);
        } else {
            vector = await aiAgent.vectorizeText(query);
        }
        const results = await aiAgent.faissSearch(vector, top_k);
        res.json({ results });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 单文件代码补全
router.post('/complete', async (req, res) => {
    const { prompt, context = '' } = req.body;
    try {
        const result = await aiAgent.codeCompletion(prompt, context);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 多文件批量补全/修改
router.post('/batch-complete', async (req, res) => {
    const { prompt, files } = req.body;
    try {
        const result = await aiAgent.batchCodeCompletion(prompt, files);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 批量文件写入
router.post('/batch-write', async (req, res) => {
    const { files } = req.body;
    try {
        const result = await aiAgent.batchWriteFiles(files);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 设置监听目录
router.post('/set-watch-dir', (req, res) => {
    const { dir } = req.body;
    startWatching(dir);
    res.json({ success: true });
});

// 手动触发全量索引重建
router.post('/update-index', async (req, res) => {
    const { dir } = req.body;
    try {
        await rebuildIndex(dir);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;