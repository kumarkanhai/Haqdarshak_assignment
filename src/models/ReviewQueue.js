/**
 * Mongoose Model: ReviewQueue
 * Captures all fields flagged with low confidence, unmapped concepts, missing citations, or ambiguous logic.
 * Enables the human reviewer portal to audit, edit, and approve drafts before live release.
 */

const mongoose = require('mongoose');

const ReviewQueueSchema = new mongoose.Schema({
  schemeId: { type: String, required: true, index: true },
  schemeName: { type: String, required: true },
  fieldType: { type: String, enum: ['BENEFIT', 'ELIGIBILITY'], required: true },
  rawText: { type: String, required: true },
  reasons: [{
    code: { type: String, required: true },
    severity: { type: String, default: 'MEDIUM' },
    message: { type: String, required: true }
  }],
  suggestedDraft: { type: mongoose.Schema.Types.Mixed },
  sourceProvenance: {
    documentName: String,
    pageNumber: Number,
    sourceUrl: String,
    exactSnippet: String
  },
  status: {
    type: String,
    enum: ['PENDING_HUMAN_REVIEW', 'APPROVED_AS_IS', 'MANUALLY_EDITED', 'REJECTED'],
    default: 'PENDING_HUMAN_REVIEW',
    index: true
  },
  reviewerNotes: { type: String, default: null },
  reviewedBy: { type: String, default: null },
  resolvedAt: { type: Date, default: null }
}, {
  timestamps: true
});

module.exports = mongoose.model('ReviewQueue', ReviewQueueSchema);
