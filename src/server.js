/**
 * Scheme Knowledge Base Server
 * Main Express server entrypoint.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const schemeRoutes = require('./routes/schemeRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/scheme_knowledge_base';

// Middleware
app.use(cors());
app.use(express.json());

// Healthcheck & Metadata
app.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Scheme Knowledge Base API',
    principles: [
      '1. Human-in-the-loop: A person always checks before anything goes live.',
      '2. Uncompromising Provenance: Every fact points back to its source document/page.'
    ],
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/schemes', schemeRoutes);

// Database connection logic with graceful fallback
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000
    });
    console.log('✅ Connected to MongoDB at:', MONGODB_URI);
  } catch (err) {
    console.warn('⚠️  MongoDB connection failed or not running locally:', err.message);
    console.warn('ℹ️  The parsing engine, normalizers, and evaluation APIs operate in in-memory mode.');
  }
}

if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Scheme Knowledge Base backend listening on port ${PORT}`);
    });
  });
}

module.exports = app;
