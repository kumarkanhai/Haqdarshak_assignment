/**
 * Scheme Knowledge Base API Routes
 */

const express = require('express');
const router = express.Router();
const {
  parseRawScheme,
  ingestDataset,
  getReviewQueue,
  resolveReviewItem,
  approveScheme,
  getLiveSchemes,
  evaluateCitizen
} = require('../controllers/schemeController');

// 1. Parsing & Draft generation
router.post('/parse-raw', parseRawScheme);

// 2. Batch ingestion
router.post('/ingest-batch', ingestDataset);

// 3. Human-in-the-loop review workflow
router.get('/review-queue', getReviewQueue);
router.post('/review-queue/:id/resolve', resolveReviewItem);
router.post('/:id/approve', approveScheme);

// 4. Live consumer endpoints (Agent app, citizen chatbot)
router.get('/live', getLiveSchemes);

// 5. Automated eligibility evaluation
router.post('/:id/evaluate', evaluateCitizen);

module.exports = router;
