/**
 * Scheme Knowledge Base - Core Taxonomies & Ontologies
 * Defines standard eligibility concepts, benefit categories, operators, and review flag codes.
 */

const ELIGIBILITY_CONCEPTS = {
  applicant_age: {
    key: 'applicant_age',
    label: 'Applicant Age',
    type: 'number',
    unit: 'years',
    allowedOperators: ['==', '!=', '<', '<=', '>', '>=', 'BETWEEN'],
    description: 'Age of the primary applicant in completed years.'
  },
  family_annual_income: {
    key: 'family_annual_income',
    label: 'Family Annual Income',
    type: 'number',
    unit: 'INR',
    allowedOperators: ['<', '<=', '>', '>='],
    description: 'Total combined annual income of the applicant household in INR.'
  },
  social_category: {
    key: 'social_category',
    label: 'Social Category / Caste Group',
    type: 'enum',
    allowedValues: ['GENERAL', 'OBC', 'SC', 'ST', 'EWS', 'MINORITY'],
    allowedOperators: ['==', '!=', 'IN', 'NOT_IN'],
    description: 'Recognized affirmative action / constitutional social reservation category.'
  },
  domicile_state: {
    key: 'domicile_state',
    label: 'Domicile State / Territory',
    type: 'enum',
    allowedValues: [
      'ALL_INDIA', 'ANDHRA_PRADESH', 'ARUNACHAL_PRADESH', 'ASSAM', 'BIHAR', 
      'CHHATTISGARH', 'GOA', 'GUJARAT', 'HARYANA', 'HIMACHAL_PRADESH', 
      'JHARKHAND', 'KARNATAKA', 'KERALA', 'MADHYA_PRADESH', 'MAHARASHTRA', 
      'MANIPUR', 'MEGHALAYA', 'MIZORAM', 'NAGALAND', 'ODISHA', 'PUNJAB', 
      'RAJASTHAN', 'SIKKIM', 'TAMIL_NADU', 'TELANGANA', 'TRIPURA', 
      'UTTAR_PRADESH', 'UTTARAKHAND', 'WEST_BENGAL', 'DELHI', 'JAMMU_AND_KASHMIR'
    ],
    allowedOperators: ['==', '!=', 'IN'],
    description: 'State or Union Territory of permanent residence/domicile.'
  },
  gender: {
    key: 'gender',
    label: 'Gender',
    type: 'enum',
    allowedValues: ['FEMALE', 'MALE', 'TRANSGENDER', 'ANY'],
    allowedOperators: ['==', 'IN'],
    description: 'Target gender for affirmative action or targeted welfare.'
  },
  land_holding_acres: {
    key: 'land_holding_acres',
    label: 'Cultivable Land Holding (Acres)',
    type: 'number',
    unit: 'acres',
    allowedOperators: ['<=', '<', '>', '>=', '=='],
    description: 'Total cultivable land owned by the farming household in acres (1 ha = 2.471 acres).'
  },
  disability_percentage: {
    key: 'disability_percentage',
    label: 'Disability Benchmark Percentage',
    type: 'number',
    unit: '%',
    allowedOperators: ['>=', '>'],
    description: 'Certified benchmark disability percentage as recognized under RPwD Act.'
  },
  bpl_status: {
    key: 'bpl_status',
    label: 'Below Poverty Line (BPL) Status',
    type: 'boolean',
    allowedValues: [true, false],
    allowedOperators: ['=='],
    description: 'Whether the household holds an active BPL or Antyodaya Anna Yojana (AAY) ration card.'
  },
  marital_status: {
    key: 'marital_status',
    label: 'Marital Status',
    type: 'enum',
    allowedValues: ['WIDOW', 'DIVORCED', 'DESERTED', 'UNMARRIED', 'MARRIED'],
    allowedOperators: ['==', 'IN'],
    description: 'Civil marital status of applicant.'
  },
  occupation: {
    key: 'occupation',
    label: 'Primary Occupation',
    type: 'enum',
    allowedValues: ['FARMER', 'STUDENT', 'CONSTRUCTION_WORKER', 'ARTISAN', 'UNORGANIZED_WORKER', 'FISHERMAN'],
    allowedOperators: ['==', 'IN'],
    description: 'Primary livelihood category of applicant.'
  }
};

const BENEFIT_CATEGORIES = {
  direct_benefit_transfer: {
    code: 'direct_benefit_transfer',
    label: 'Direct Benefit Transfer (DBT)',
    defaultType: 'cash'
  },
  pension: {
    code: 'pension',
    label: 'Social Security Pension',
    defaultType: 'cash'
  },
  scholarship: {
    code: 'scholarship',
    label: 'Educational Scholarship',
    defaultType: 'cash'
  },
  subsidy: {
    code: 'subsidy',
    label: 'Financial Subsidy',
    defaultType: 'subsidy'
  },
  health_insurance: {
    code: 'health_insurance',
    label: 'Health & Medical Cover',
    defaultType: 'insurance'
  },
  in_kind_goods: {
    code: 'in_kind_goods',
    label: 'In-Kind Equipment or Asset',
    defaultType: 'in_kind'
  },
  loan_interest_subvention: {
    code: 'loan_interest_subvention',
    label: 'Interest Subvention / Credit',
    defaultType: 'subsidy'
  }
};

const REVIEW_REASONS = {
  MISSING_PROVENANCE: {
    code: 'MISSING_PROVENANCE',
    severity: 'CRITICAL',
    message: 'Field value cannot be traced to a verifiable source document, page, or text excerpt.'
  },
  UNRECOGNIZED_CONCEPT: {
    code: 'UNRECOGNIZED_CONCEPT',
    severity: 'HIGH',
    message: 'Rule references an attribute or requirement not in the standardized concept taxonomy.'
  },
  SUBJECTIVE_UNQUANTIFIABLE_CRITERIA: {
    code: 'SUBJECTIVE_UNQUANTIFIABLE_CRITERIA',
    severity: 'HIGH',
    message: 'Requirement contains subjective or non-computable phrases (e.g. "meritorious", "destitute", "good character").'
  },
  AMBIGUOUS_VALUE_OR_UNIT: {
    code: 'AMBIGUOUS_VALUE_OR_UNIT',
    severity: 'MEDIUM',
    message: 'Benefit amount or formula is ambiguous (e.g. "up to 40% or ₹50,000 whichever is less", "subject to funds").'
  },
  LOW_PARSER_CONFIDENCE: {
    code: 'LOW_PARSER_CONFIDENCE',
    severity: 'MEDIUM',
    message: 'Parser confidence score is below the strict operational threshold (0.85).'
  },
  CONTRADICTORY_RULES: {
    code: 'CONTRADICTORY_RULES',
    severity: 'CRITICAL',
    message: 'Extracted rule contains logically impossible or conflicting conditions within the same clause branch.'
  }
};

const SCHEME_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

const CONFIDENCE_THRESHOLD = 0.85;

module.exports = {
  ELIGIBILITY_CONCEPTS,
  BENEFIT_CATEGORIES,
  REVIEW_REASONS,
  SCHEME_STATUS,
  CONFIDENCE_THRESHOLD
};
