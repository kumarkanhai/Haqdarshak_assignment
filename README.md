# Scheme Knowledge Base (Ingestion & Structured Parsing Engine)

A MERN stack backend engine designed to convert unstructured, messy government welfare scheme data (PDFs, portals, guidelines) into high-fidelity structured rules for automated citizen eligibility checking and agent applications.

---

## Core System Principles

1. **Human-in-the-Loop Safeguard**: A human policy researcher always verifies and approves drafts before anything reaches the agent app, citizen chatbot, or external partners.
2. **Uncompromising Provenance**: Every extracted fact strictly points back to its source document, page, and exact text excerpt. If a fact lacks a verifiable source, the field is left empty and flagged for human review. **The system never guesses or hallucinates.**

---

## Architecture & Code Structure

```
interview/
├── src/
│   ├── config/
│   │   └── constants.js             # Eligibility concepts, benefit categories, operators, review reason codes
│   ├── data/
│   │   └── messySchemesDataset.js   # Realistic messy real-world scheme text snippets & provenance
│   ├── models/
│   │   ├── Scheme.js                # Mongoose schema for scheme drafts, benefits rows, and condition AST
│   │   └── ReviewQueue.js           # Mongoose schema for flagged review items awaiting human action
│   ├── parsers/
│   │   ├── normalizers.js           # Currency, Indian numbering (Lakhs/Crores), frequencies, states
│   │   ├── benefitParser.js         # Benefits -> Structured rows (category, type, amount, frequency, instalments)
│   │   └── eligibilityParser.js     # Eligibility -> Structured condition AST (concept, op, value, AND/OR)
│   ├── evaluator/
│   │   └── eligibilityEvaluator.js  # Evaluates citizen profiles deterministically against condition ASTs
│   ├── controllers/
│   │   └── schemeController.js      # REST API handlers for ingestion, parsing, human review, evaluation
│   ├── routes/
│   │   └── schemeRoutes.js          # Express route definitions
│   └── server.js                    # Express application entrypoint
├── tests/
│   ├── parser.test.js               # Node.js native unit test suite (13 tests)
│   └── trickyCasesRunner.js         # Standalone console demonstration runner
└── package.json
```

---

## Running the Code

### 1. Run Unit Tests (13 test cases)
```bash
npm test
```

### 2. Run Interactive Tricky Cases Demonstration
```bash
npm run test:tricky
```

### 3. Start Express Server
```bash
npm start
```
The server will run on `http://localhost:5000` (or `PORT` specified in `.env`).

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/schemes/parse-raw` | Parse raw benefit/eligibility text and return proposed draft + review items |
| `POST` | `/api/schemes/ingest-batch` | Batch process scheme records into MongoDB drafts and populates `ReviewQueue` |
| `GET` | `/api/schemes/review-queue` | List pending review items for policy researchers |
| `POST` | `/api/schemes/review-queue/:id/resolve` | Human reviewer resolves an item (`APPROVE`, `EDIT`, or `REJECT`) |
| `POST` | `/api/schemes/:id/approve` | Final sign-off approving scheme for live release |
| `GET` | `/api/schemes/live` | Public/consumer endpoint returning **only approved** schemes |
| `POST` | `/api/schemes/:id/evaluate` | Evaluates a citizen profile against the scheme's condition tree |
