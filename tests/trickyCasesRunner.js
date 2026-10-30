/**
 * Interactive Tricky Cases Demonstration Script
 * Demonstrates parsing real-world messy government scheme data into:
 * - Structured Benefit Rows (category, type, amount, currency, frequency, number_of_instalments)
 * - Structured Eligibility Condition Trees (concept, operator, value, AND / OR logic)
 * - Human-in-the-loop review items with provenance and explicit flag reasons (No guessing!)
 */

const { MESSY_SCHEMES_DATASET } = require('../src/data/messySchemesDataset');
const { parseBenefit } = require('../src/parsers/benefitParser');
const { parseEligibility } = require('../src/parsers/eligibilityParser');
const { evaluateEligibility } = require('../src/evaluator/eligibilityEvaluator');

console.log('='.repeat(90));
console.log(' GOVERNMENT SCHEME KNOWLEDGE BASE: PARSING ENGINE & REVIEW QUEUE DEMO');
console.log('='.repeat(90));
console.log('Principle 1: Human-in-the-loop (Draft state -> Review queue -> Approved)');
console.log('Principle 2: Uncompromising Provenance (Facts must point to source doc/page; otherwise leave empty)');
console.log('='.repeat(90));

const reviewQueue = [];

MESSY_SCHEMES_DATASET.forEach((scheme, idx) => {
  console.log(`\n\x1b[36m[SCHEME #${idx + 1}] ${scheme.schemeName} (${scheme.jurisdiction})\x1b[0m`);
  console.log(`Department: ${scheme.department}`);

  // 1. Parse Benefits
  console.log('\n--- 1. BENEFIT EXTRACTION ---');
  console.log(`\x1b[33mRaw Input:\x1b[0m "${scheme.rawBenefit.text}"`);
  console.log(`\x1b[33mSource Doc:\x1b[0m ${scheme.rawBenefit.provenance.documentName || '[MISSING SOURCE]'}`);

  const benefitRow = parseBenefit(scheme.rawBenefit);
  console.log('Structured Benefit Row:');
  console.table([{
    Category: benefitRow.category,
    Type: benefitRow.type,
    Amount: benefitRow.amount !== null ? `₹${benefitRow.amount.toLocaleString('en-IN')}` : '[EMPTY]',
    Currency: benefitRow.currency,
    Frequency: benefitRow.frequency,
    Instalments: benefitRow.number_of_instalments || 'N/A',
    InstalmentAmt: benefitRow.instalment_amount ? `₹${benefitRow.instalment_amount.toLocaleString('en-IN')}` : 'N/A',
    Confidence: benefitRow.confidence.toFixed(2),
    FlaggedForReview: benefitRow.flaggedForReview
  }]);

  if (benefitRow.flaggedForReview) {
    console.log(`\x1b[31m⚠️  FLAGGED FOR HUMAN REVIEW:\x1b[0m`);
    benefitRow.reviewReasons.forEach(r => console.log(`   - [${r.code}] ${r.message}`));
    reviewQueue.push({
      schemeId: scheme.id,
      schemeName: scheme.schemeName,
      field: 'BENEFIT',
      reasons: benefitRow.reviewReasons,
      source: benefitRow.provenance
    });
  }

  // 2. Parse Eligibility
  console.log('\n--- 2. ELIGIBILITY EXTRACTION ---');
  console.log(`\x1b[33mRaw Input:\x1b[0m "${scheme.rawEligibility.text}"`);
  console.log(`\x1b[33mSource Doc:\x1b[0m ${scheme.rawEligibility.provenance.documentName || '[MISSING SOURCE]'}`);

  const eligibilityTree = parseEligibility(scheme.rawEligibility);
  console.log(`Logical Operator: ${eligibilityTree.logicalOperator}`);
  console.log(`Structured Conditions (${eligibilityTree.conditions.length}):`);
  
  if (eligibilityTree.conditions.length > 0) {
    console.table(eligibilityTree.conditions.map(c => ({
      Concept: c.concept,
      Operator: c.operator,
      Value: Array.isArray(c.value) ? JSON.stringify(c.value) : c.value,
      Unit: c.unit || '-',
      Confidence: c.confidence
    })));
  } else {
    console.log('   (No conditions accepted - left empty to prevent guessing)');
  }

  if (eligibilityTree.flaggedForReview) {
    console.log(`\x1b[31m⚠️  FLAGGED FOR HUMAN REVIEW:\x1b[0m`);
    eligibilityTree.reviewReasons.forEach(r => console.log(`   - [${r.code}] ${r.message}`));
    reviewQueue.push({
      schemeId: scheme.id,
      schemeName: scheme.schemeName,
      field: 'ELIGIBILITY',
      reasons: eligibilityTree.reviewReasons,
      source: eligibilityTree.provenance
    });
  }

  console.log('-'.repeat(90));
});

// Summary of Review Queue
console.log('\n' + '='.repeat(90));
console.log(`\x1b[32mREVIEW QUEUE AUDIT (Human-in-the-Loop Safeguard)\x1b[0m`);
console.log(`Total Flagged Items requiring human validation: ${reviewQueue.length}`);
console.log('='.repeat(90));
console.table(reviewQueue.map(item => ({
  Scheme: item.schemeName,
  Field: item.field,
  ReasonCode: item.reasons.map(r => r.code).join(' | '),
  SourceDoc: item.source.documentName || 'NONE (Uncited)'
})));

// 3. Citizen Profile Automated Evaluation Demo
console.log('\n' + '='.repeat(90));
console.log('\x1b[32mAUTOMATED ELIGIBILITY CHECKING ENGINE DEMO\x1b[0m');
console.log('='.repeat(90));

const sampleCitizen = {
  applicant_age: 68,
  family_annual_income: 180000,
  social_category: 'SC',
  domicile_state: 'MAHARASHTRA',
  bpl_status: true,
  land_holding_acres: 1.5,
  gender: 'MALE'
};

console.log('Citizen Profile under evaluation:');
console.log(JSON.stringify(sampleCitizen, null, 2));

const testSchemes = [
  { id: 'SCHEME-001', name: 'PM-KISAN' },
  { id: 'SCHEME-002', name: 'Post-Matric Scholarship' },
  { id: 'SCHEME-003', name: 'Indira Gandhi Old Age Pension (IGNOAPS)' }
];

testSchemes.forEach(ts => {
  const schemeData = MESSY_SCHEMES_DATASET.find(s => s.id === ts.id);
  const parsed = parseEligibility(schemeData.rawEligibility);
  const evalResult = evaluateEligibility(sampleCitizen, parsed);

  console.log(`\nEvaluating against: \x1b[35m${ts.name}\x1b[0m`);
  console.log(`Result: ${evalResult.isEligible ? '\x1b[32m✅ ELIGIBLE\x1b[0m' : '\x1b[31m❌ NOT ELIGIBLE\x1b[0m'}`);
  console.log(`Matched Conditions: ${evalResult.matchedCount}, Failed Conditions: ${evalResult.failedCount}`);
  if (evalResult.failedConditions.length > 0) {
    evalResult.failedConditions.forEach(f => {
      console.log(`   - Failed ${f.concept}: citizen had ${f.citizenValue}, required ${f.operator} ${f.requiredValue}`);
    });
  }
});

console.log('\n' + '='.repeat(90));
console.log('All demonstrations completed successfully.');
console.log('='.repeat(90));
