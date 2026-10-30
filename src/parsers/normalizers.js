/**
 * Normalizers and text extraction utilities
 * Handles Indian currency formats, number scales ('lakh', 'crore'), frequency indicators, and text tokens.
 */

// Word to number mapping
const WORD_NUMBERS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, '३': 3, 'तीन': 3, 'दो': 2, 'चार': 4
};

/**
 * Extracts and standardizes financial amounts into a numeric value (INR).
 * Correctly computes 'lakh', 'crore', and parses Indian comma groupings (e.g. 2,50,000).
 */
function parseIndianAmount(text) {
  if (!text || typeof text !== 'string') return null;

  const cleanText = text.replace(/,/g, '').trim();

  // Pattern 1: e.g. "₹2.5 lakh", "Rs. 1.2 Lakhs", "3.0 lacs", "10 crore"
  const scaleRegex = /(?:₹|Rs\.?|INR)?\s*([0-9]+(?:\.[0-9]+)?)\s*(lakhs?|lacs?|crores?|cr|thousand|k)\b/i;
  const scaleMatch = cleanText.match(scaleRegex);
  if (scaleMatch) {
    const baseValue = parseFloat(scaleMatch[1]);
    const unit = scaleMatch[2].toLowerCase();

    if (unit.startsWith('lakh') || unit.startsWith('lac')) {
      return baseValue * 100000;
    }
    if (unit.startsWith('crore') || unit === 'cr') {
      return baseValue * 10000000;
    }
    if (unit === 'thousand' || unit === 'k') {
      return baseValue * 1000;
    }
  }

  // Pattern 2: Explicit currency figures: "₹6,000", "Rs. 2,000/-", "13500 per annum"
  const rawNumRegex = /(?:₹|Rs\.?|INR)\s*([0-9]+(?:\.[0-9]{1,2})?)/i;
  const rawNumMatch = cleanText.match(rawNumRegex);
  if (rawNumMatch) {
    return parseFloat(rawNumMatch[1]);
  }

  // Pattern 3: Standalone numbers following amounts
  const generalNumRegex = /\b([0-9]+(?:\.[0-9]{1,2})?)\s*(?:\/-\b|\bper\b|\ba year\b|\ba month\b)/i;
  const generalMatch = cleanText.match(generalNumRegex);
  if (generalMatch) {
    return parseFloat(generalMatch[1]);
  }

  // Pattern 4: Direct numeric strings (e.g. "2000" or "2000.50")
  if (/^[0-9]+(?:\.[0-9]+)?$/.test(cleanText)) {
    return parseFloat(cleanText);
  }

  return null;
}

/**
 * Normalizes payment frequency into standard enum values:
 * 'annual' | 'monthly' | 'quarterly' | 'one_time' | 'per_semester' | 'conditional'
 */
function parseFrequency(text) {
  if (!text) return null;
  const lower = text.toLowerCase();

  if (lower.includes('one-time') || lower.includes('one time') || lower.includes('lump-sum') || lower.includes('lumpsum') || lower.includes('one-off')) {
    return 'one_time';
  }
  if (lower.includes('quarter') || lower.includes('4-month') || lower.includes('three months')) {
    return 'quarterly';
  }
  if (lower.includes('month') || lower.includes('p.m.') || lower.includes('प्रतिमाह')) {
    return 'monthly';
  }
  if (lower.includes('year') || lower.includes('annual') || lower.includes('p.a.') || lower.includes('yearly') || lower.includes('प्रतिवर्ष')) {
    return 'annual';
  }
  if (lower.includes('semester')) {
    return 'per_semester';
  }

  return null;
}

/**
 * Parses number of instalments and per-instalment amounts:
 * e.g. "three instalments of Rs. 2,000 each" -> { count: 3, instalmentAmount: 2000 }
 */
function parseInstalments(text) {
  if (!text) return { count: null, instalmentAmount: null };

  let count = null;
  let instalmentAmount = null;

  // Search for numeric or word counts before instalments/tranches/किश्तों
  const instalmentRegex = /\b(\d+|three|two|four|five|six|३|तीन|दो|चार)\s*(?:equal\s*)?(?:instalments?|installments?|tranches?|किश्तों)/i;
  const match = text.match(instalmentRegex);
  if (match) {
    const rawVal = match[1].toLowerCase();
    count = WORD_NUMBERS[rawVal] !== undefined ? WORD_NUMBERS[rawVal] : parseInt(rawVal, 10);
  }

  // Search for instalment amount: "of Rs. 2,000 each"
  const instAmtRegex = /(?:of\s*(?:₹|Rs\.?|INR)?\s*([0-9,]+(?:\.[0-9]+)?)\s*(?:each|\/-\s*each))/i;
  const amtMatch = text.match(instAmtRegex);
  if (amtMatch) {
    instalmentAmount = parseIndianAmount(amtMatch[1]);
  }

  return { count, instalmentAmount };
}

/**
 * Converts hectares to standard acres. 1 hectare = 2.47105 acres.
 */
function parseLandAcres(text) {
  if (!text) return null;

  // Check hectares
  const haRegex = /([0-9]+(?:\.[0-9]+)?)\s*(?:hectares?|ha\b)/i;
  const haMatch = text.match(haRegex);
  if (haMatch) {
    const ha = parseFloat(haMatch[1]);
    return Math.round(ha * 2.47105 * 100) / 100; // 2 decimal precision
  }

  // Check direct acres
  const acreRegex = /([0-9]+(?:\.[0-9]+)?)\s*acres?\b/i;
  const acreMatch = text.match(acreRegex);
  if (acreMatch) {
    return parseFloat(acreMatch[1]);
  }

  return null;
}

/**
 * Normalizes state name to standard enum key.
 */
function normalizeState(stateText) {
  if (!stateText) return null;
  const upper = stateText.toUpperCase().trim();

  // First check pan-India / all-states phrases
  if (/\b(?:ALL\s+INDIA|ACROSS\s+INDIA|ALL\s+STATES(?:\/UTS)?|ACROSS\s+ALL\s+STATES(?:\/UTS)?)\b/i.test(upper)) {
    return 'ALL_INDIA';
  }

  // State definitions with explicit word boundaries
  const stateRegexes = [
    { pattern: /\bKARNATAKA\b/i, state: 'KARNATAKA' },
    { pattern: /\bMAHARASHTRA\b/i, state: 'MAHARASHTRA' },
    { pattern: /\bRAJASTHAN\b/i, state: 'RAJASTHAN' },
    { pattern: /\bDELHI\b/i, state: 'DELHI' },
    { pattern: /\bTAMIL\s*NADU\b/i, state: 'TAMIL_NADU' },
    { pattern: /\bUTTAR\s+PRADESH\b/i, state: 'UTTAR_PRADESH' },
    { pattern: /\bBIHAR\b/i, state: 'BIHAR' },
    { pattern: /\bKERALA\b/i, state: 'KERALA' },
    { pattern: /\bGUJARAT\b/i, state: 'GUJARAT' },
    // Strict abbreviation for UP: must not be followed by 'to' (e.g. 'up to')
    { pattern: /\bU\.?P\.?\b(?!\s*to\b)/i, state: 'UTTAR_PRADESH' },
    { pattern: /\bM\.?P\.?\b/i, state: 'MADHYA_PRADESH' }
  ];

  for (const item of stateRegexes) {
    if (item.pattern.test(upper)) {
      return item.state;
    }
  }

  return null;
}

module.exports = {
  parseIndianAmount,
  parseFrequency,
  parseInstalments,
  parseLandAcres,
  normalizeState,
  WORD_NUMBERS
};
