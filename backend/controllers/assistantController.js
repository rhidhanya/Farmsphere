const { processAssistantQuery } = require('../services/voiceAssistantService');
const { publicServerError } = require('../utils/publicError');

/**
 * @desc    Handle voice/text query from authenticated farmer
 * @route   POST /api/assistant/query
 * @access  Private (FARMER / authenticated user)
 */
const queryAssistant = async (req, res) => {
  try {
    const farmerId = req.user?._id;
    if (!farmerId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to access the voice assistant.',
      });
    }

    const { query, language } = req.body || {};

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Query text is required.',
      });
    }

    const result = await processAssistantQuery({
      farmerId,
      query: query.trim(),
      language: language || 'ta',
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[VoiceAssistantController] Query processing failed:', error.message);
    return res.status(500).json({
      success: false,
      message: publicServerError(error, 'Failed to process voice assistant query. Please try again.'),
    });
  }
};

module.exports = {
  queryAssistant,
};
