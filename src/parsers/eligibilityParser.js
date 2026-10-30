/**
 * Eligibility Parser Engine
 * Converts unstructured messy eligibility criteria into structured condition trees:
 * concept, operator, value combined with AND / OR logic.
 * Adheres strictly to the principles of zero guessing and verifiable provenance.
 */

const { ELIGIBILITY_CONCEPTS, REVIEW_REASONS, CONFIDENCE_THRESHOLD } = require('../config/constants');
const { parseIndianAmount, parseLandAcres, normalizeState } = require('./normalizers');
const { validateProvenance } = require('./benefitParser');

// Subjective buzzwords that cannot be evaluated automatically
const SUBJECTIVE_TERMS = [
  'good moral character', 'meritorious', 'deserving', 'poor family',
  'needy', 'hard working', 'destitute without proof', 'satisfactory progress'
];

/**
 * Parses raw eligibility text into a structured Boolean condition tree.
 * @param {Object} rawEligibilityObj - { text, provenance: { documentName, pageNumber, sourceUrl, exactSnippet } }
 * @returns {Object} Structured AST containing logical groups and atomic conditions.
 */
function parseEligibility(rawEligibilityObj) {
  const { text = '', provenance = {} } = rawEligibilityObj || {};

  const result = {
    logicalOperator: 'AND',
    conditions: [],
    unmappedClauses: [],
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

  // PRINCIPLE 2 ENFORCEMENT: Missing provenance check
  if (!validateProvenance(provenance)) {
    result.confidence = 0.0;
    result.flaggedForReview = true;
    result.reviewReasons.push({
      code: REVIEW_REASONS.MISSING_PROVENANCE.code,
      message: 'No verifiable source document or excerpt provided for eligibility rules. Field marked empty.'
    });
    return result;
  }

  // CHECK: Detect subjective / unquantifiable terms (Do not guess!)
  const foundSubjective = SUBJECTIVE_TERMS.filter(term => text.toLowerCase().includes(term));
  if (foundSubjective.length > 0) {
    result.flaggedForReview = true;
    result.confidence = Math.min(result.confidence, 0.40);
    result.reviewReasons.push({
      code: REVIEW_REASONS.SUBJECTIVE_UNQUANTIFIABLE_CRITERIA.code,
      message: `Contains subjective criteria that cannot be calculated programmatically: "${foundSubjective.join(', ')}". Requires human policy interpretation.`
    });
  }

  const rawLower = text.toLowerCase();

  // 1. CONCEPT: Social Category (SC / ST / OBC / GENERAL / EWS)
  const socialCategories = [];
  if (/\b(?:sc\s*\/\s*st|sc\s+and\s+st|sc\s+or\s+st|scheduled\s+caste|scheduled\s+tribe)\b/i.test(text)) {
    socialCategories.push('SC', 'ST');
  } else {
    if (/\bsc\b|scheduled caste/i.test(text)) socialCategories.push('SC');
    if (/\bst\b|scheduled tribe/i.test(text)) socialCategories.push('ST');
  }
  if (/\bobc\b|other backward/i.test(text)) socialCategories.push('OBC');
  if (/\bews\b|economically weaker section/i.test(text)) socialCategories.push('EWS');

  if (socialCategories.length > 0) {
    result.conditions.push({
      type: 'CONDITION',
      concept: ELIGIBILITY_CONCEPTS.social_category.key,
      operator: socialCategories.length > 1 ? 'IN' : '==',
      value: socialCategories.length > 1 ? [...new Set(socialCategories)] : socialCategories[0],
      rawClause: socialCategories.join('/'),
      confidence: 0.98
    });
  }

  // 2. CONCEPT: Family Annual Income
  // Patterns: "income under ₹2.5 lakh", "income less than 3,00,000", "income not exceeding Rs. 1.2 lakh", "income <= 8 Lakhs"
  const incomeRegex = /(?:family\s*(?:annual\s*)?)?income\s*(?:from all sources\s*)?(?:is\s*)?(?:under|below|less than|not exceeding|up to|<=)\s*(?:₹|Rs\.?|INR)?\s*([0-9.,]+\s*(?:lakhs?|lacs?|crores?|k|thousand)?)/i;
  const incomeMatch = text.match(incomeRegex);
  if (incomeMatch) {
    const rawValStr = incomeMatch[1];
    const parsedIncome = parseIndianAmount(rawValStr);
    if (parsedIncome !== null) {
      result.conditions.push({
        type: 'CONDITION',
        concept: ELIGIBILITY_CONCEPTS.family_annual_income.key,
        operator: '<=',
        value: parsedIncome,
        unit: 'INR',
        rawClause: incomeMatch[0],
        confidence: 0.95
      });
    }
  }

  // 3. CONCEPT: Applicant Age
  // Pattern A: "between X and Y years" / "X to Y years"
  const ageBetweenRegex = /(?:aged|age)\s*(?:between)?\s*([0-9]{1,2})\s*(?:and|to|-)\s*([0-9]{1,2})\s*years?/i;
  const ageBetweenMatch = text.match(ageBetweenRegex);
  if (ageBetweenMatch) {
    result.conditions.push({
      type: 'CONDITION',
      concept: ELIGIBILITY_CONCEPTS.applicant_age.key,
      operator: 'BETWEEN',
      value: [parseInt(ageBetweenMatch[1], 10), parseInt(ageBetweenMatch[2], 10)],
      unit: 'years',
      rawClause: ageBetweenMatch[0],
      confidence: 0.95
    });
  } else {
    // Pattern B: "aged 65 and above", "aged >= 60", "age not less than 60"
    const ageMinRegex = /(?:aged?|age)\s*(?:>=|not less than|above|minimum|at least)?\s*([0-9]{1,2})\s*(?:and above|\+|years?)/i;
    const ageMinMatch = text.match(ageMinRegex);
    if (ageMinMatch) {
      result.conditions.push({
        type: 'CONDITION',
        concept: ELIGIBILITY_CONCEPTS.applicant_age.key,
        operator: '>=',
        value: parseInt(ageMinMatch[1], 10),
        unit: 'years',
        rawClause: ageMinMatch[0],
        confidence: 0.92
      });
    }
  }

  // 4. CONCEPT: Domicile State
  const detectedState = normalizeState(text);
  if (detectedState) {
    result.conditions.push({
      type: 'CONDITION',
      concept: ELIGIBILITY_CONCEPTS.domicile_state.key,
      operator: '==',
      value: detectedState,
      rawClause: `Domicile: ${detectedState}`,
      confidence: 0.96
    });
  }

  // 5. CONCEPT: Gender
  if (/\b(?:female|women|woman|girl|widow|deserted woman)\b/i.test(text)) {
    result.conditions.push({
      type: 'CONDITION',
      concept: ELIGIBILITY_CONCEPTS.gender.key,
      operator: '==',
      value: 'FEMALE',
      rawClause: 'Female applicant',
      confidence: 0.95
    });
  }

  // 6. CONCEPT: Marital Status (Widow, Divorced, Deserted)
  const maritalStatuses = [];
  if (/\bwidows?\b/i.test(text)) maritalStatuses.push('WIDOW');
  if (/\bdivorced?\b/i.test(text)) maritalStatuses.push('DIVORCED');
  if (/\bdeserted\b/i.test(text)) maritalStatuses.push('DESERTED');

  if (maritalStatuses.length > 0) {
    result.conditions.push({
      type: 'CONDITION',
      concept: ELIGIBILITY_CONCEPTS.marital_status.key,
      operator: maritalStatuses.length > 1 ? 'IN' : '==',
      value: maritalStatuses.length > 1 ? maritalStatuses : maritalStatuses[0],
      rawClause: maritalStatuses.join(' / '),
      confidence: 0.94
    });
  }

  // 7. CONCEPT: Land Holding (Acres / Hectares)
  const parsedAcres = parseLandAcres(text);
  if (parsedAcres !== null) {
    const isMax = /(?:up to|maximum|<=|not exceeding|less than)/i.test(text);
    result.conditions.push({
      type: 'CONDITION',
      concept: ELIGIBILITY_CONCEPTS.land_holding_acres.key,
      operator: isMax ? '<=' : '==',
      value: parsedAcres,
      unit: 'acres',
      rawClause: `Cultivable land <= ${parsedAcres} acres`,
      confidence: 0.93
    });
  }

  // 8. CONCEPT: BPL Status
  if (/\b(?:bpl|below poverty line|antyodaya)\b/i.test(text)) {
    result.conditions.push({
      type: 'CONDITION',
      concept: ELIGIBILITY_CONCEPTS.bpl_status.key,
      operator: '==',
      value: true,
      rawClause: 'Living below poverty line (BPL)',
      confidence: 0.95
    });
  }

  // 9. CONCEPT: Disability Benchmark
  const pwdMatch = text.match(/(?:disability|disabled|divyang).*?(?:>=|exceeding|above|at least)?\s*([0-9]{1,2})%/i);
  if (pwdMatch) {
    result.conditions.push({
      type: 'CONDITION',
      concept: ELIGIBILITY_CONCEPTS.disability_percentage.key,
      operator: '>=',
      value: parseInt(pwdMatch[1], 10),
      unit: '%',
      rawClause: pwdMatch[0],
      confidence: 0.95
    });
  }

  // Evaluate completeness & flag unmapped clauses
  if (result.conditions.length === 0 && !result.flaggedForReview) {
    result.confidence = 0.2;
    result.flaggedForReview = true;
    result.reviewReasons.push({
      code: REVIEW_REASONS.UNRECOGNIZED_CONCEPT.code,
      message: 'No standardized eligibility concepts could be identified with high confidence.'
    });
  }

  if (result.confidence < CONFIDENCE_THRESHOLD) {
    result.flaggedForReview = true;
    if (!result.reviewReasons.some(r => r.code === REVIEW_REASONS.LOW_PARSER_CONFIDENCE.code)) {
      result.reviewReasons.push({
        code: REVIEW_REASONS.LOW_PARSER_CONFIDENCE.code,
        message: `Overall parser confidence (${result.confidence.toFixed(2)}) is below acceptable threshold (${CONFIDENCE_THRESHOLD}).`
      });
    }
  }

  return result;
}

module.exports = {
  parseEligibility,
  SUBJECTIVE_TERMS
};
