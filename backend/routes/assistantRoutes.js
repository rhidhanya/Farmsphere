const express = require('express');
const router = express.Router();
const { queryAssistant } = require('../controllers/assistantController');
const { protect } = require('../middleware/authMiddleware');

// Authenticated voice assistant query endpoint
router.post('/query', protect, queryAssistant);

module.exports = router;
