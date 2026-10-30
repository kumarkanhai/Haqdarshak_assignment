/**
 * Benefit Parser Engine
 * Converts unstructured messy benefit text into structured rows with strict provenance checks.
 * Adheres strictly to the two core principles:
 * 1. Human verification draft model.
 * 2. Uncompromising provenance: No citation => Leave empty + flag with reason.
 */

const { BENEFIT_CATEGORIES, REVIEW_REASONS, CONFIDENCE_THRESHOLD } = require('../config/constants');
const { parseIndianAmount, parseFrequency, parseInstalments } = require('./normalizers');

/**
 * Validates whether the field has verifiable provenance citations.
 */
function validateProvenance(provenance) {
  if (!provenance) return false;
  if (!provenance.documentName || provenance.documentName.trim() === '') return false;
  if (!provenance.exactSnippet || provenance.exactSnippet.trim() === '') return false;
  return true;
}

/**
 * Transforms messy benefit text into a structured row.
 * @param {Object} rawBenefitObj - { text, provenance: { documentName, pageNumber, sourceUrl, exactSnippet } }
 * @returns {Object} Structured benefit row with metadata and review flags.
 */
function parseBenefit(rawBenefitObj) {
  const { text = '', provenance = {} } = rawBenefitObj || {};

  // Default empty structured row
  const row = {
    category: null,
    type: null,
    amount: null,
    currency: 'INR',
    frequency: null,
    number_of_instalments: null,
    instalment_amount: null,
    provenance: {
      documentName: provenance?.documentName || null,
      pageNumber: provenance?.pageNumber || null,
      sourceUrl: provenance?.sourceUrl || null,
      exactSnippet: provenance?.exactSnippet || null
    },
    confidence: 1.0,
    flaggedForReview: false,
    reviewReasons: []
  };

  // PRINCIPLE 2 ENFORCEMENT: If no traceable source, leave empty and flag!
  if (!validateProvenance(provenance)) {
    row.confidence = 0.0;
    row.flaggedForReview = true;
    row.reviewReasons.push({
      code: REVIEW_REASONS.MISSING_PROVENANCE.code,
      message: 'Cannot verify provenance. Government scheme guidelines mandate every benefit fact must cite document and snippet.'
    });
    return row;
  }

  const lowerText = text.toLowerCase();

  // 1. Detect Category & Default Type
  if (lowerText.includes('scholarship') || lowerText.includes('allowance') || lowerText.includes('tuition')) {
    row.category = BENEFIT_CATEGORIES.scholarship.code;
    row.type = 'cash';
  } else if (lowerText.includes('pension')) {
    row.category = BENEFIT_CATEGORIES.pension.code;
    row.type = 'cash';
  } else if (lowerText.includes('subsidy') || lowerText.includes('grant') || lowerText.includes('cfa')) {
    row.category = BENEFIT_CATEGORIES.subsidy.code;
    row.type = 'subsidy';
  } else if (lowerText.includes('insurance') || lowerText.includes('medical cover') || lowerText.includes('ayushman')) {
    row.category = BENEFIT_CATEGORIES.health_insurance.code;
    row.type = 'insurance';
  } else if (lowerText.includes('assistance') || lowerText.includes('dbt') || lowerText.includes('transfer') || lowerText.includes('samman')) {
    row.category = BENEFIT_CATEGORIES.direct_benefit_transfer.code;
    row.type = 'cash';
  } else {
    // Unclassified benefit category
    row.category = 'other_assistance';
    row.type = 'cash';
    row.confidence -= 0.2;
  }

  // 2. Check for Ambiguous / Capped formulas (Do not guess!)
  // e.g. "subsidy up to 40% or Rs. 50,000 whichever is less"
  const isCappedOrComparative = /(?:whichever is (?:less|lower|more|greater)|up to\s*\d+%\s*or)/i.test(text);
  if (isCappedOrComparative) {
    row.flaggedForReview = true;
    row.confidence = Math.min(row.confidence, 0.65);
    row.reviewReasons.push({
      code: REVIEW_REASONS.AMBIGUOUS_VALUE_OR_UNIT.code,
      message: 'Formula contains relative capping ("whichever is less/lower" or percentage cap). Requires human verification before publishing.'
    });
  }

  // 3. Extract Amount
  const parsedAmt = parseIndianAmount(text);
  if (parsedAmt !== null) {
    row.amount = parsedAmt;
  } else {
    row.confidence -= 0.35;
    row.reviewReasons.push({
      code: REVIEW_REASONS.AMBIGUOUS_VALUE_OR_UNIT.code,
      message: 'Could not extract deterministic currency amount from benefit text.'
    });
  }

  // 4. Extract Frequency
  const freq = parseFrequency(text);
  if (freq) {
    row.frequency = freq;
  } else {
    // Frequency could not be resolved confidently
    row.frequency = 'conditional';
    row.confidence -= 0.2;
  }

  // 5. Extract Instalments
  const instalments = parseInstalments(text);
  if (instalments.count) {
    row.number_of_instalments = instalments.count;
    row.instalment_amount = instalments.instalmentAmount || (row.amount ? Math.round(row.amount / instalments.count) : null);
  }

  // 6. Final Confidence Threshold Evaluation
  if (row.confidence < CONFIDENCE_THRESHOLD) {
    row.flaggedForReview = true;
    if (!row.reviewReasons.some(r => r.code === REVIEW_REASONS.LOW_PARSER_CONFIDENCE.code)) {
      row.reviewReasons.push({
        code: REVIEW_REASONS.LOW_PARSER_CONFIDENCE.code,
        message: `Overall parser confidence (${row.confidence.toFixed(2)}) is below acceptable threshold (${CONFIDENCE_THRESHOLD}).`
      });
    }
  }

  return row;
}

module.exports = {
  parseBenefit,
  validateProvenance
};
