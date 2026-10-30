/**
 * Test Suite: Parser Tricky Cases & Principles Enforcement
 * Uses Node.js native test runner (node:test and node:assert).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

const { parseBenefit } = require('../src/parsers/benefitParser');
const { parseEligibility } = require('../src/parsers/eligibilityParser');
const { parseIndianAmount, parseFrequency, parseInstalments, parseLandAcres } = require('../src/parsers/normalizers');
const { evaluateEligibility } = require('../src/evaluator/eligibilityEvaluator');
const { REVIEW_REASONS } = require('../src/config/constants');

describe('1. Normalizer & Unit Extraction Tests', () => {
  test('Parses Indian numbering scales: Lakhs, Lacs, Crores, and commas', () => {
    assert.strictEqual(parseIndianAmount('₹2.5 lakh'), 250000);
    assert.strictEqual(parseIndianAmount('Rs. 1.2 Lakhs'), 120000);
    assert.strictEqual(parseIndianAmount('Rs. 3.0 lacs'), 300000);
    assert.strictEqual(parseIndianAmount('₹6,000 a year'), 6000);
    assert.strictEqual(parseIndianAmount('Rs 2,50,000/- per annum'), 250000);
    assert.strictEqual(parseIndianAmount('10 crore grant'), 100000000);
  });

  test('Parses payment frequencies correctly', () => {
    assert.strictEqual(parseFrequency('₹6,000 a year'), 'annual');
    assert.strictEqual(parseFrequency('Rs. 1,000 per month'), 'monthly');
    assert.strictEqual(parseFrequency('₹2,000/- प्रतिमाह'), 'monthly');
    assert.strictEqual(parseFrequency('one-time grant of Rs. 25,000'), 'one_time');
    assert.strictEqual(parseFrequency('paid in 4-monthly instalments'), 'quarterly');
  });

  test('Parses instalments and instalment amounts correctly', () => {
    const res = parseInstalments('in three instalments of Rs. 2,000 each');
    assert.strictEqual(res.count, 3);
    assert.strictEqual(res.instalmentAmount, 2000);
  });

  test('Converts hectares to acres with 2 decimal precision', () => {
    // 2 ha * 2.47105 = 4.94 acres
    assert.strictEqual(parseLandAcres('cultivable land up to 2 hectares'), 4.94);
    assert.strictEqual(parseLandAcres('5 acres of agricultural land'), 5);
  });
});

describe('2. Benefit Extraction: Tricky Cases', () => {
  test('Case 1: ₹6,000 a year in three instalments (PM-KISAN format)', () => {
    const raw = {
      text: 'Financial assistance of ₹6,000 a year in three instalments of Rs. 2,000 each credited to bank account.',
      provenance: {
        documentName: 'PM-KISAN_Rev2023.pdf',
        pageNumber: 4,
        exactSnippet: 'Rs. 6000/- per annum per family will be released in three instalments of Rs. 2000/- each'
      }
    };

    const row = parseBenefit(raw);

    assert.strictEqual(row.category, 'direct_benefit_transfer');
    assert.strictEqual(row.type, 'cash');
    assert.strictEqual(row.amount, 6000);
    assert.strictEqual(row.currency, 'INR');
    assert.strictEqual(row.frequency, 'annual');
    assert.strictEqual(row.number_of_instalments, 3);
    assert.strictEqual(row.instalment_amount, 2000);
    assert.strictEqual(row.flaggedForReview, false);
    assert.strictEqual(row.provenance.documentName, 'PM-KISAN_Rev2023.pdf');
  });

  test('Case 2: Capped / ambiguous formula must NOT guess and MUST flag for review', () => {
    const raw = {
      text: 'Subsidy up to 40% of system cost or Rs. 50,000, whichever is less, payable as one-time grant.',
      provenance: {
        documentName: 'SolarRooftop_Notification.pdf',
        pageNumber: 15,
        exactSnippet: 'CFA up to 40% or max Rs. 50,000/- whichever is lower.'
      }
    };

    const row = parseBenefit(raw);

    // Must be flagged for human review because "whichever is less" cannot be resolved to a static flat amount
    assert.strictEqual(row.flaggedForReview, true);
    assert.ok(row.reviewReasons.some(r => r.code === REVIEW_REASONS.AMBIGUOUS_VALUE_OR_UNIT.code));
  });

  test('Case 3: Missing Provenance: Must leave fields empty and flag for review (Principle 2)', () => {
    const raw = {
      text: 'Grant of ₹10,000 one-time.',
      provenance: {
        documentName: null,
        pageNumber: null,
        exactSnippet: ''
      }
    };

    const row = parseBenefit(raw);

    // Strict no-guessing & provenance rule: Amount must NOT be filled without citation!
    assert.strictEqual(row.amount, null);
    assert.strictEqual(row.confidence, 0.0);
    assert.strictEqual(row.flaggedForReview, true);
    assert.ok(row.reviewReasons.some(r => r.code === REVIEW_REASONS.MISSING_PROVENANCE.code));
  });
});

describe('3. Eligibility Extraction: Tricky Cases', () => {
  test('Case 4: SC/ST families with income under ₹2.5 lakh', () => {
    const raw = {
      text: 'SC/ST families with income under ₹2.5 lakh pursuing post-matric courses.',
      provenance: {
        documentName: 'PostMatric_SC.pdf',
        pageNumber: 3,
        exactSnippet: 'Students belonging to SC/ST whose family income does not exceed Rs. 2,50,000/- per annum.'
      }
    };

    const result = parseEligibility(raw);

    assert.strictEqual(result.logicalOperator, 'AND');
    assert.strictEqual(result.flaggedForReview, false);

    // Verify Social Category condition
    const catCond = result.conditions.find(c => c.concept === 'social_category');
    assert.ok(catCond, 'Must contain social_category condition');
    assert.strictEqual(catCond.operator, 'IN');
    assert.deepStrictEqual(catCond.value, ['SC', 'ST']);

    // Verify Income condition
    const incomeCond = result.conditions.find(c => c.concept === 'family_annual_income');
    assert.ok(incomeCond, 'Must contain family_annual_income condition');
    assert.strictEqual(incomeCond.operator, '<=');
    assert.strictEqual(incomeCond.value, 250000);
    assert.strictEqual(incomeCond.unit, 'INR');
  });

  test('Case 5: Senior citizen aged 65 and above, living below poverty line (BPL) with domicile of Maharashtra', () => {
    const raw = {
      text: 'Senior citizen aged 65 and above, living below poverty line (BPL) with domicile of Maharashtra.',
      provenance: {
        documentName: 'NSAP_MH.pdf',
        pageNumber: 2,
        exactSnippet: 'Applicant must be 65 years or higher, residing in Maharashtra, below poverty line.'
      }
    };

    const result = parseEligibility(raw);

    const ageCond = result.conditions.find(c => c.concept === 'applicant_age');
    assert.strictEqual(ageCond.operator, '>=');
    assert.strictEqual(ageCond.value, 65);

    const bplCond = result.conditions.find(c => c.concept === 'bpl_status');
    assert.strictEqual(bplCond.operator, '==');
    assert.strictEqual(bplCond.value, true);

    const stateCond = result.conditions.find(c => c.concept === 'domicile_state');
    assert.strictEqual(stateCond.operator, '==');
    assert.strictEqual(stateCond.value, 'MAHARASHTRA');
  });

  test('Case 6: Subjective / unquantifiable criteria must NOT be guessed and MUST be flagged', () => {
    const raw = {
      text: 'Deserving meritorious students with good moral character from rural backgrounds.',
      provenance: {
        documentName: 'HigherEd_Merit.pdf',
        pageNumber: 3,
        exactSnippet: 'Candidate must possess good moral character and be deserving.'
      }
    };

    const result = parseEligibility(raw);

    assert.strictEqual(result.flaggedForReview, true);
    assert.ok(result.reviewReasons.some(r => r.code === REVIEW_REASONS.SUBJECTIVE_UNQUANTIFIABLE_CRITERIA.code));
    assert.ok(result.confidence < 0.5);
  });

  test('Case 7: Complex Multi-criteria with Marital Status & Age Range', () => {
    const raw = {
      text: 'Widows or divorced or deserted women aged between 18 and 60 years residing in Rajasthan with family income under ₹1.2 lakh.',
      provenance: {
        documentName: 'Rajasthan_SSP.pdf',
        pageNumber: 5,
        exactSnippet: 'Beneficiary should be widow or divorced or deserted female, aged 18 to 60 in Rajasthan with income up to 1.20 lakh.'
      }
    };

    const result = parseEligibility(raw);

    const genderCond = result.conditions.find(c => c.concept === 'gender');
    assert.strictEqual(genderCond.value, 'FEMALE');

    const maritalCond = result.conditions.find(c => c.concept === 'marital_status');
    assert.strictEqual(maritalCond.operator, 'IN');
    assert.deepStrictEqual(maritalCond.value, ['WIDOW', 'DIVORCED', 'DESERTED']);

    const ageCond = result.conditions.find(c => c.concept === 'applicant_age');
    assert.strictEqual(ageCond.operator, 'BETWEEN');
    assert.deepStrictEqual(ageCond.value, [18, 60]);

    const stateCond = result.conditions.find(c => c.concept === 'domicile_state');
    assert.strictEqual(stateCond.value, 'RAJASTHAN');

    const incomeCond = result.conditions.find(c => c.concept === 'family_annual_income');
    assert.strictEqual(incomeCond.value, 120000);
  });
});

describe('4. Automated Citizen Eligibility Evaluation', () => {
  const schemeTree = {
    logicalOperator: 'AND',
    conditions: [
      { concept: 'applicant_age', operator: '>=', value: 65 },
      { concept: 'bpl_status', operator: '==', value: true },
      { concept: 'domicile_state', operator: '==', value: 'MAHARASHTRA' }
    ]
  };

  test('Citizen satisfying all conditions is marked ELIGIBLE', () => {
    const citizen = {
      applicant_age: 68,
      bpl_status: true,
      domicile_state: 'MAHARASHTRA'
    };

    const res = evaluateEligibility(citizen, schemeTree);
    assert.strictEqual(res.isEligible, true);
    assert.strictEqual(res.failedCount, 0);
  });

  test('Citizen failing age threshold is marked INELIGIBLE with failure details', () => {
    const citizen = {
      applicant_age: 62, // Fails >= 65
      bpl_status: true,
      domicile_state: 'MAHARASHTRA'
    };

    const res = evaluateEligibility(citizen, schemeTree);
    assert.strictEqual(res.isEligible, false);
    assert.strictEqual(res.failedCount, 1);
    assert.strictEqual(res.failedConditions[0].concept, 'applicant_age');
  });
});
