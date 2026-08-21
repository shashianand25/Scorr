const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const officeParser = require('officeparser');
const pptToText = require('ppt-to-text');
const logger = require('../utils/logger');

const upload = multer({ storage: multer.memoryStorage() });

// ── PDF Parsing ────────────────────────────────────────────────────────────
router.post('/api/parse-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const data = await pdfParse(req.file.buffer);
    res.json({ text: data.text });
  } catch (err) {
    logger.error('Parse', 'PDF Parse Error', err);
    res.status(500).json({ error: err.message });
  }
});

// ── PPT/PPTX Parsing ────────────────────────────────────────────────────────────
router.post('/api/parse-ppt', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const originalName = req.file.originalname ? req.file.originalname.toLowerCase() : '';
    
    // Fallback for legacy .ppt files since officeparser only supports .pptx
    if (originalName.endsWith('.ppt') && !originalName.endsWith('.pptx')) {
      try {
        const text = pptToText.extractText(req.file.buffer);
        if (text) {
          return res.json({ text });
        }
      } catch (fallbackErr) {
        logger.warn('Parse', 'ppt-to-text fallback error', { error: fallbackErr.message });
      }
    }

    const ext = originalName.split('.').pop();
    const parseResult = await officeParser.parseOffice(req.file.buffer, { fileType: ext });
    const text = typeof parseResult === 'string' ? parseResult : (parseResult.toText ? parseResult.toText() : '');
    res.json({ text });
  } catch (err) {
    logger.error('Parse', 'PPT Parse Error', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
