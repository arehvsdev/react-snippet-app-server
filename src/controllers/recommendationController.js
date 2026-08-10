const recommendationService = require("../services/recommendationService");

/**
 * Controller to fetch global ranked snippet recommendations.
 * Endpoint: GET /api/recommendations
 */
const getRecommendedSnippets = async (req, res, next) => {
  try {
    const result = await recommendationService.getRecommendedSnippets(req.query);

    res.json({
      success: true,
      data: result.snippets,
      snippets: result.snippets,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller to fetch personalized AI snippet recommendations for the logged-in user.
 * Endpoint: GET /api/recommendations/user
 */
const getRecommendedSnippetsForUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await recommendationService.getRecommendedSnippetsForUser(userId, req.query);

    res.json({
      success: true,
      data: result.snippets,
      snippets: result.snippets,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller to fetch similar snippets for a specific snippet.
 * Endpoint: GET /api/recommendations/similar/:id
 */
const getSimilarSnippets = async (req, res, next) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit, 10) || 5;

    const snippets = await recommendationService.getSimilarSnippets(id, limit);

    res.json({
      success: true,
      data: snippets,
      snippets,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getRecommendedSnippets,
  getRecommendedSnippetsForUser,
  getSimilarSnippets,
};
