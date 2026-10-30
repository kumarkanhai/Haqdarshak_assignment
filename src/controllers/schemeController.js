/**
 * Scheme Knowledge Base Controller
 * Handles ingestion, automated parsing, human-in-the-loop review actions, and eligibility verification.
 */

const Scheme = require('../models/Scheme');
const ReviewQueue = require('../models/ReviewQueue');
const { parseBenefit } = require('../parsers/benefitParser');
const { parseEligibility } = require('../parsers/eligibilityParser');
const { evaluateEligibility } = require('../evaluator/eligibilityEvaluator');
const { MESSY_SCHEMES_DATASET } = require('../data/messySchemesDataset');
const { SCHEME_STATUS } = require('../config/constants');

/**
 * 1. Parse raw scheme text into structured draft.
 * Does not write to DB; returns proposed draft + review items.
 */
async function parseRawScheme(req, res) {
  try {
    const { schemeId, schemeName, department, jurisdiction, rawBenefit, rawEligibility } = req.body;

    const parsedBenefitRow = parseBenefit(rawBenefit);
    const parsedEligibilityTree = parseEligibility(rawEligibility);

    const reviewItems = [];

    if (parsedBenefitRow.flaggedForReview) {
      reviewItems.push({
        schemeId,
        schemeName,
        fieldType: 'BENEFIT',
        rawText: rawBenefit?.text || '',
        reasons: parsedBenefitRow.reviewReasons,
        suggestedDraft: parsedBenefitRow,
        sourceProvenance: rawBenefit?.provenance || null
      });
    }

    if (parsedEligibilityTree.flaggedForReview) {
      reviewItems.push({
        schemeId,
        schemeName,
        fieldType: 'ELIGIBILITY',
        rawText: rawEligibility?.text || '',
        reasons: parsedEligibilityTree.reviewReasons,
        suggestedDraft: parsedEligibilityTree,
        sourceProvenance: rawEligibility?.provenance || null
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        schemeId,
        schemeName,
        department,
        jurisdiction,
        benefits: [parsedBenefitRow],
        eligibility: parsedEligibilityTree,
        needsHumanReview: reviewItems.length > 0,
        reviewItems
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 2. Ingest & process batch dataset into MongoDB.
 * Saves schemes as DRAFT or PENDING_REVIEW and populates ReviewQueue.
 */
async function ingestDataset(req, res) {
  try {
    const dataset = req.body?.dataset || MESSY_SCHEMES_DATASET;
    const results = [];

    for (const item of dataset) {
      const parsedBenefitRow = parseBenefit(item.rawBenefit);
      const parsedEligibilityTree = parseEligibility(item.rawEligibility);

      const hasReviewFlags = parsedBenefitRow.flaggedForReview || parsedEligibilityTree.flaggedForReview;
      const initialStatus = hasReviewFlags ? SCHEME_STATUS.PENDING_REVIEW : SCHEME_STATUS.DRAFT;

      // Upsert Scheme document
      const schemeDoc = await Scheme.findOneAndUpdate(
        { schemeId: item.id },
        {
          schemeId: item.id,
          schemeName: item.schemeName,
          department: item.department,
          jurisdiction: item.jurisdiction,
          status: initialStatus,
          benefits: [parsedBenefitRow],
          eligibility: parsedEligibilityTree,
          rawSourceInput: {
            benefitText: item.rawBenefit?.text || '',
            eligibilityText: item.rawEligibility?.text || ''
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Create ReviewQueue entries if flagged
      if (parsedBenefitRow.flaggedForReview) {
        await ReviewQueue.create({
          schemeId: item.id,
          schemeName: item.schemeName,
          fieldType: 'BENEFIT',
          rawText: item.rawBenefit?.text || '',
          reasons: parsedBenefitRow.reviewReasons,
          suggestedDraft: parsedBenefitRow,
          sourceProvenance: item.rawBenefit?.provenance,
          status: 'PENDING_HUMAN_REVIEW'
        });
      }

      if (parsedEligibilityTree.flaggedForReview) {
        await ReviewQueue.create({
          schemeId: item.id,
          schemeName: item.schemeName,
          fieldType: 'ELIGIBILITY',
          rawText: item.rawEligibility?.text || '',
          reasons: parsedEligibilityTree.reviewReasons,
          suggestedDraft: parsedEligibilityTree,
          sourceProvenance: item.rawEligibility?.provenance,
          status: 'PENDING_HUMAN_REVIEW'
        });
      }

      results.push({
        schemeId: item.id,
        schemeName: item.schemeName,
        status: initialStatus,
        benefitsParsed: parsedBenefitRow.amount ? 1 : 0,
        conditionsParsed: parsedEligibilityTree.conditions.length,
        flaggedForReview: hasReviewFlags
      });
    }

    return res.status(201).json({
      success: true,
      message: `Successfully processed and ingested ${results.length} schemes.`,
      summary: {
        total: results.length,
        flaggedForReview: results.filter(r => r.flaggedForReview).length,
        cleanDrafts: results.filter(r => !r.flaggedForReview).length
      },
      results
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 3. List all pending review queue items for researchers.
 */
async function getReviewQueue(req, res) {
  try {
    const { status = 'PENDING_HUMAN_REVIEW' } = req.query;
    const items = await ReviewQueue.find({ status }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 4. Resolve a review queue item (Approve / Edit / Reject).
 */
async function resolveReviewItem(req, res) {
  try {
    const { id } = req.params;
    const { action, reviewerName, reviewerNotes, editedPayload } = req.body;

    const reviewItem = await ReviewQueue.findById(id);
    if (!reviewItem) {
      return res.status(404).json({ success: false, message: 'Review queue item not found.' });
    }

    reviewItem.status = action === 'APPROVE' ? 'APPROVED_AS_IS' : (action === 'EDIT' ? 'MANUALLY_EDITED' : 'REJECTED');
    reviewItem.reviewedBy = reviewerName || 'Researcher_Reviewer';
    reviewItem.reviewerNotes = reviewerNotes || null;
    reviewItem.resolvedAt = new Date();
    await reviewItem.save();

    // If edited or approved, update the scheme draft
    if (action === 'EDIT' && editedPayload) {
      const scheme = await Scheme.findOne({ schemeId: reviewItem.schemeId });
      if (scheme) {
        if (reviewItem.fieldType === 'BENEFIT') {
          scheme.benefits = [editedPayload];
        } else if (reviewItem.fieldType === 'ELIGIBILITY') {
          scheme.eligibility = editedPayload;
        }
        await scheme.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: `Review item successfully resolved with action: ${action}`,
      data: reviewItem
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 5. Approve Scheme for live publication (Principle 1: Human Approval).
 */
async function approveScheme(req, res) {
  try {
    const { id } = req.params;
    const { approvedBy = 'Senior_Policy_Officer' } = req.body;

    const scheme = await Scheme.findOne({ schemeId: id });
    if (!scheme) {
      return res.status(404).json({ success: false, message: 'Scheme not found.' });
    }

    // Check if any pending review items remain for this scheme
    const pendingReviews = await ReviewQueue.countDocuments({
      schemeId: id,
      status: 'PENDING_HUMAN_REVIEW'
    });

    if (pendingReviews > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot approve scheme. There are still ${pendingReviews} unresolved review queue items.`
      });
    }

    scheme.status = SCHEME_STATUS.APPROVED;
    scheme.approvedBy = approvedBy;
    scheme.approvedAt = new Date();
    scheme.version += 1;
    await scheme.save();

    return res.status(200).json({
      success: true,
      message: `Scheme ${scheme.schemeName} approved and published to live services.`,
      data: scheme
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 6. Get live approved schemes for Citizen Chatbot & Agent App.
 * Principle 1 Enforcement: Strictly returns only APPROVED records.
 */
async function getLiveSchemes(req, res) {
  try {
    const schemes = await Scheme.find({ status: SCHEME_STATUS.APPROVED });
    return res.status(200).json({
      success: true,
      count: schemes.length,
      data: schemes
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 7. Automated Citizen Eligibility Evaluation Endpoint.
 * Evaluates a citizen profile against the scheme's condition tree.
 */
async function evaluateCitizen(req, res) {
  try {
    const { id } = req.params;
    const { citizenProfile } = req.body;

    if (!citizenProfile || typeof citizenProfile !== 'object') {
      return res.status(400).json({ success: false, message: 'Missing citizenProfile object in request body.' });
    }

    const scheme = await Scheme.findOne({ schemeId: id });
    if (!scheme) {
      return res.status(404).json({ success: false, message: 'Scheme not found.' });
    }

    const evaluation = evaluateEligibility(citizenProfile, scheme.eligibility);

    return res.status(200).json({
      success: true,
      schemeId: scheme.schemeId,
      schemeName: scheme.schemeName,
      status: scheme.status,
      citizenProfile,
      evaluationResult: evaluation
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  parseRawScheme,
  ingestDataset,
  getReviewQueue,
  resolveReviewItem,
  approveScheme,
  getLiveSchemes,
  evaluateCitizen
};
