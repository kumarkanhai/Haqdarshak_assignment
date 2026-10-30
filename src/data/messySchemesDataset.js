/**
 * Messy Field Values Dataset
 * Reflects real-world government scheme documents (PDFs, notifications, state portals, MyScheme)
 * containing formatting artifacts, Indian number scales ('lakh', 'crore'), colloquial phrasing,
 * multi-instalments, and edge cases.
 */

const MESSY_SCHEMES_DATASET = [
  {
    id: 'SCHEME-001',
    schemeName: 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
    department: 'Ministry of Agriculture and Farmers Welfare',
    jurisdiction: 'CENTRAL',
    rawBenefit: {
      text: 'Financial assistance of ₹6,000 a year in three instalments of Rs. 2,000 each credited directly to Aadhaar seeded bank account.',
      provenance: {
        documentName: 'PM-KISAN_Operational_Guidelines_Rev2023.pdf',
        pageNumber: 4,
        sourceUrl: 'https://pmkisan.gov.in/Documents_guidelines.pdf',
        exactSnippet: '...financial benefit of Rs. 6000/- per annum per family will be released in three 4-monthly instalments of Rs. 2000/- each...'
      }
    },
    rawEligibility: {
      text: 'All landholding farmer families having cultivable landholding up to 2 hectares (approx 4.94 acres) across all States/UTs.',
      provenance: {
        documentName: 'PM-KISAN_Operational_Guidelines_Rev2023.pdf',
        pageNumber: 6,
        sourceUrl: 'https://pmkisan.gov.in/Documents_guidelines.pdf',
        exactSnippet: '...Small and Marginal Landholder Farmer Families having cultivable land up to 2 hectares...'
      }
    }
  },
  {
    id: 'SCHEME-002',
    schemeName: 'Post-Matric Scholarship for SC/ST Students',
    department: 'Ministry of Social Justice and Empowerment',
    jurisdiction: 'CENTRAL',
    rawBenefit: {
      text: 'Maintenance allowance of Rs. 13,500 per annum plus full compulsory non-refundable fees reimbursement paid yearly.',
      provenance: {
        documentName: 'PostMatric_SC_Guidelines_2022.pdf',
        pageNumber: 12,
        sourceUrl: 'https://socialjustice.gov.in/schemes/post-matric-sc.pdf',
        exactSnippet: 'Annual maintenance allowance up to Rs. 13,500/- per annum along with compulsory course fee...'
      }
    },
    rawEligibility: {
      text: 'SC/ST families with income under ₹2.5 lakh pursuing recognized post-matriculation courses.',
      provenance: {
        documentName: 'PostMatric_SC_Guidelines_2022.pdf',
        pageNumber: 3,
        sourceUrl: 'https://socialjustice.gov.in/schemes/post-matric-sc.pdf',
        exactSnippet: 'Scholarships will be paid to students belonging to SC/ST whose parents/guardians income from all sources does not exceed Rs. 2,50,000/- per annum.'
      }
    }
  },
  {
    id: 'SCHEME-003',
    schemeName: 'Indira Gandhi National Old Age Pension Scheme (IGNOAPS)',
    department: 'Ministry of Rural Development / State Social Welfare',
    jurisdiction: 'STATE_CENTRAL_SHARED',
    rawBenefit: {
      text: 'Monthly financial assistance of ₹1,000 per month (combined central + state share) credited monthly.',
      provenance: {
        documentName: 'NSAP_Guidelines_Maharashtra.pdf',
        pageNumber: 8,
        sourceUrl: 'https://nsap.nic.in/guidelines_updated.pdf',
        exactSnippet: 'Eligible elderly beneficiaries will receive a monthly pension of Rs 1,000/- per month...'
      }
    },
    rawEligibility: {
      text: 'The applicant must be a senior citizen aged 65 and above, living below poverty line (BPL) with domicile of Maharashtra.',
      provenance: {
        documentName: 'NSAP_Guidelines_Maharashtra.pdf',
        pageNumber: 2,
        sourceUrl: 'https://nsap.nic.in/guidelines_updated.pdf',
        exactSnippet: 'Applicant must be of age 65 years or higher, residing in Maharashtra, belonging to a household below the poverty line.'
      }
    }
  },
  {
    id: 'SCHEME-004',
    schemeName: 'Gruha Lakshmi Scheme',
    department: 'Department of Women & Child Development, Karnataka',
    jurisdiction: 'STATE',
    rawBenefit: {
      text: 'Direct cash transfer of Rs 2,000/- per month directly into bank account of the woman head of house.',
      provenance: {
        documentName: 'GruhaLakshmi_Karnataka_Gazette_2023.pdf',
        pageNumber: 3,
        sourceUrl: 'https://sevasindhu.karnataka.gov.in/Gruhalakshmi.pdf',
        exactSnippet: 'Monthly DBT assistance of Rs 2,000/- to woman head of the family on monthly basis.'
      }
    },
    rawEligibility: {
      text: 'Female head of household residing in Karnataka with family annual income under ₹3,00,000.',
      provenance: {
        documentName: 'GruhaLakshmi_Karnataka_Gazette_2023.pdf',
        pageNumber: 5,
        sourceUrl: 'https://sevasindhu.karnataka.gov.in/Gruhalakshmi.pdf',
        exactSnippet: '...woman resident of Karnataka state with family annual income not exceeding Rs. 3,00,000/-...'
      }
    }
  },
  {
    id: 'SCHEME-005',
    schemeName: 'Solar Rooftop Subsidy Scheme (Tricky Capped Amount Case)',
    department: 'Ministry of New and Renewable Energy',
    jurisdiction: 'CENTRAL',
    rawBenefit: {
      text: 'Subsidy up to 40% of system cost or Rs. 50,000, whichever is less, payable as one-time grant.',
      provenance: {
        documentName: 'MNRE_Rooftop_Solar_Notification_2024.pdf',
        pageNumber: 15,
        sourceUrl: 'https://solarrooftop.gov.in/circulars/cfa_2024.pdf',
        exactSnippet: 'Central Financial Assistance (CFA) up to 40% or max Rs. 50,000/- whichever is lower.'
      }
    },
    rawEligibility: {
      text: 'Residential consumers having family annual income under Rs 8 Lakhs.',
      provenance: {
        documentName: 'MNRE_Rooftop_Solar_Notification_2024.pdf',
        pageNumber: 7,
        sourceUrl: 'https://solarrooftop.gov.in/circulars/cfa_2024.pdf',
        exactSnippet: 'Eligibility restricted to residential connections with family annual income <= Rs 8,00,000/-'
      }
    }
  },
  {
    id: 'SCHEME-006',
    schemeName: 'Mukhyamantri Medhavi Vidyarthi Protsahan (Subjective / Vague Case)',
    department: 'Higher Education Department',
    jurisdiction: 'STATE',
    rawBenefit: {
      text: 'Lump-sum reward of ₹25,000 one-time for purchasing study materials.',
      provenance: {
        documentName: 'HigherEd_Merit_Circular_2023.pdf',
        pageNumber: 2,
        sourceUrl: 'https://hed.gov.in/merit_circular.pdf',
        exactSnippet: 'A one-time award of Rs. 25,000 shall be conferred.'
      }
    },
    rawEligibility: {
      // Intentionally contains subjective unquantifiable conditions ("good moral character", "meritorious")
      text: 'Deserving meritorious students with good moral character from rural backgrounds having low income.',
      provenance: {
        documentName: 'HigherEd_Merit_Circular_2023.pdf',
        pageNumber: 3,
        sourceUrl: 'https://hed.gov.in/merit_circular.pdf',
        exactSnippet: 'Candidate must possess good moral character and be a deserving student from rural background.'
      }
    }
  },
  {
    id: 'SCHEME-007',
    schemeName: 'Widow & Destitute Women Pension (Nested Logic Case)',
    department: 'Department of Social Justice, Rajasthan',
    jurisdiction: 'STATE',
    rawBenefit: {
      text: 'Monthly financial pension of Rs. 1,500/- per month.',
      provenance: {
        documentName: 'Rajasthan_Social_Security_Rules.pdf',
        pageNumber: 11,
        sourceUrl: 'https://ssp.rajasthan.gov.in/rules.pdf',
        exactSnippet: 'Monthly pension of Rs. 1,500 per month will be sanctioned.'
      }
    },
    rawEligibility: {
      // Complex boolean: (Widows OR Divorced OR Deserted) AND age between 18 and 60 AND state == RJ AND income <= 1.2 Lakh
      text: 'Widows or divorced or deserted women aged between 18 and 60 years residing in Rajasthan with family income under ₹1.2 lakh.',
      provenance: {
        documentName: 'Rajasthan_Social_Security_Rules.pdf',
        pageNumber: 5,
        sourceUrl: 'https://ssp.rajasthan.gov.in/rules.pdf',
        exactSnippet: 'Beneficiary should be widow or divorced or deserted female, aged between 18 and 60 years, resident of Rajasthan with annual family income up to 1.20 lakh.'
      }
    }
  },
  {
    id: 'SCHEME-008',
    schemeName: 'Unverified Youth Livelihood Grant (Missing Provenance Case)',
    department: 'Skill Development & Entrepreneurship',
    jurisdiction: 'CENTRAL',
    rawBenefit: {
      // Missing provenance text: simulates text entered without source citation
      text: 'Skill equipment grant of ₹10,000 one-time.',
      provenance: {
        documentName: null,
        pageNumber: null,
        sourceUrl: null,
        exactSnippet: ''
      }
    },
    rawEligibility: {
      text: 'Unemployed youth aged 18 to 35 years.',
      provenance: {
        documentName: null,
        pageNumber: null,
        sourceUrl: null,
        exactSnippet: ''
      }
    }
  }
];

module.exports = { MESSY_SCHEMES_DATASET };
