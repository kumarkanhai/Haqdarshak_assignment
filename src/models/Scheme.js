/**
 * Mongoose Model: Scheme
 * The central database record for government welfare schemes.
 * Enforces status lifecycle: DRAFT -> PENDING_REVIEW -> APPROVED.
 * Only APPROVED records are served to agent apps, citizen chatbots, and external partners.
 */

const mongoose = require('mongoose');
const { SCHEME_STATUS } = require('../config/constants');

const ProvenanceSchema = new mongoose.Schema({
  documentName: { type: String, default: null },
  pageNumber: { type: Number, default: null },
  sourceUrl: { type: String, default: null },
  exactSnippet: { type: String, default: null }
}, { _id: false });

const BenefitRowSchema = new mongoose.Schema({
  category: { type: String, required: true },
  type: { type: String, enum: ['cash', 'in_kind', 'subsidy', 'insurance', 'voucher', 'other'], default: 'cash' },
  amount: { type: Number, default: null },
  currency: { type: String, default: 'INR' },
  frequency: { type: String, default: 'conditional' },
  number_of_instalments: { type: Number, default: null },
  instalment_amount: { type: Number, default: null },
  provenance: { type: ProvenanceSchema, required: true },
  confidence: { type: Number, min: 0, max: 1, default: 1.0 },
  flaggedForReview: { type: Boolean, default: false },
  reviewReasons: [{
    code: { type: String },
    message: { type: String }
  }]
}, { _id: false });

const ConditionNodeSchema = new mongoose.Schema({
  type: { type: String, default: 'CONDITION' },
  concept: { type: String },
  operator: { type: String },
  value: { type: mongoose.Schema.Types.Mixed },
  unit: { type: String },
  rawClause: { type: String },
  confidence: { type: Number, default: 1.0 }
}, { _id: false });

const EligibilityTreeSchema = new mongoose.Schema({
  logicalOperator: { type: String, enum: ['AND', 'OR'], default: 'AND' },
  conditions: [mongoose.Schema.Types.Mixed], // Can contain atomic ConditionNodeSchema or nested condition groups
  unmappedClauses: [{ type: String }],
  provenance: { type: ProvenanceSchema, required: true },
  confidence: { type: Number, min: 0, max: 1, default: 1.0 },
  flaggedForReview: { type: Boolean, default: false },
  reviewReasons: [{
    code: { type: String },
    message: { type: String }
  }]
}, { _id: false });

const SchemeSchema = new mongoose.Schema({
  schemeId: { type: String, required: true, unique: true, index: true },
  schemeName: { type: String, required: true, index: true },
  department: { type: String, required: true },
  jurisdiction: { type: String, enum: ['CENTRAL', 'STATE', 'STATE_CENTRAL_SHARED'], default: 'CENTRAL' },
  status: {
    type: String,
    enum: Object.values(SCHEME_STATUS),
    default: SCHEME_STATUS.DRAFT,
    index: true
  },
  benefits: [BenefitRowSchema],
  eligibility: EligibilityTreeSchema,
  rawSourceInput: {
    benefitText: String,
    eligibilityText: String
  },
  version: { type: Number, default: 1 },
  reviewedBy: { type: String, default: null },
  approvedBy: { type: String, default: null },
  approvedAt: { type: Date, default: null }
}, {
  timestamps: true
});

module.exports = mongoose.model('Scheme', SchemeSchema);
