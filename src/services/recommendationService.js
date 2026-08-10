const Snippet = require("../models/Snippet");
const Bookmark = require("../models/Bookmark");
const Like = require("../models/Like");

/**
 * Calculates global snippet rankings for all public snippets.
 * Reads stored AI metadata values directly from MongoDB indexed fields.
 * Bypasses Hugging Face API calls on homepage loads.
 *
 * @param {object} query - Pagination and filter parameters.
 * @returns {Promise<{ snippets: Array, pagination: object }>}
 */
const getRecommendedSnippets = async (query = {}) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  try {
    const total = await Snippet.countDocuments({ visibility: "public" });

    // Directly read pre-computed scores from MongoDB index
    const snippets = await Snippet.find({ visibility: "public" })
      .populate("createdBy", "name username avatar")
      .populate("category", "name description")
      .sort({ aiRecommendationScore: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const formattedSnippets = snippets.map((snippet) => {
      const recScore = snippet.ai?.recommendationScore ?? snippet.aiRecommendationScore ?? 0;
      return {
        ...snippet,
        id: String(snippet._id),
        recommendationScore: recScore,
        rankingScore: recScore,
      };
    });

    return {
      snippets: formattedSnippets,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  } catch (err) {
    console.error("[RecommendationService] Error fetching recommendations. Falling back to default sorting:", err.message);

    // Fallback: Query snippets sorted by createdAt desc (never break homepage)
    const total = await Snippet.countDocuments({ visibility: "public" });
    const fallbackSnippets = await Snippet.find({ visibility: "public" })
      .populate("createdBy", "name username avatar")
      .populate("category", "name description")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const normalized = fallbackSnippets.map((s) => ({
      ...s,
      id: String(s._id),
      recommendationScore: 0,
      rankingScore: 0,
    }));

    return {
      snippets: normalized,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }
};

/**
 * Calculates personalized AI recommendations for a logged-in user.
 * Analyzes user bookmarks, likes, and created snippets to compute preference weights.
 */
const getRecommendedSnippetsForUser = async (userId, query = {}) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // 1. Gather user interaction history
  const [userBookmarks, userLikes, userCreated] = await Promise.all([
    Bookmark.find({ userId }).select("snippetId").lean(),
    Like.find({ userId, targetType: "Snippet" }).select("targetId").lean(),
    Snippet.find({ createdBy: userId }).select("_id").lean(),
  ]);

  const bookmarkedIds = userBookmarks.map((b) => String(b.snippetId));
  const likedIds = userLikes.map((l) => String(l.targetId));
  const createdIds = userCreated.map((s) => String(s._id));

  // Combined set of snippet IDs the user has already interacted with
  const interactedIdsSet = new Set([...bookmarkedIds, ...likedIds, ...createdIds]);

  // Fetch full details of interacted snippets to extract user preference profile
  const seedSnippetIds = Array.from(interactedIdsSet);
  const seedSnippets = await Snippet.find({ _id: { $in: seedSnippetIds } })
    .select("language tags category")
    .lean();

  const languageWeights = new Map();
  const tagWeights = new Map();
  const categoryWeights = new Map();

  seedSnippets.forEach((s) => {
    if (s.language) {
      const lang = s.language.toLowerCase();
      languageWeights.set(lang, (languageWeights.get(lang) || 0) + 3);
    }
    if (s.category) {
      const catStr = String(s.category);
      categoryWeights.set(catStr, (categoryWeights.get(catStr) || 0) + 2);
    }
    if (Array.isArray(s.tags)) {
      s.tags.forEach((tag) => {
        const t = tag.toLowerCase().trim();
        if (t) tagWeights.set(t, (tagWeights.get(t) || 0) + 1);
      });
    }
  });

  // 2. Query public snippets directly using index
  const candidates = await Snippet.find({
    visibility: "public",
    createdBy: { $ne: userId },
  })
    .populate("createdBy", "name username avatar")
    .populate("category", "name description")
    .sort({ aiRecommendationScore: -1 })
    .lean();

  // 3. Apply lightweight user preference affinity boost
  const scoredCandidates = candidates.map((snippet) => {
    let score = snippet.ai?.recommendationScore ?? snippet.aiRecommendationScore ?? 0;

    if (snippet.language) {
      const lang = snippet.language.toLowerCase();
      score += languageWeights.get(lang) || 0;
    }

    if (snippet.category) {
      const catId = String(snippet.category._id || snippet.category);
      score += categoryWeights.get(catId) || 0;
    }

    if (Array.isArray(snippet.tags)) {
      snippet.tags.forEach((tag) => {
        const t = tag.toLowerCase().trim();
        score += tagWeights.get(t) || 0;
      });
    }

    const isBookmarked = bookmarkedIds.includes(String(snippet._id));

    return {
      ...snippet,
      id: String(snippet._id),
      isBookmarked,
      recommendationScore: Math.round(score * 10) / 10,
    };
  });

  scoredCandidates.sort((a, b) => b.recommendationScore - a.recommendationScore);

  const total = scoredCandidates.length;
  const paginatedSnippets = scoredCandidates.slice(skip, skip + limit);

  return {
    snippets: paginatedSnippets,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Calculates content-based similar snippets for a target snippet.
 */
const getSimilarSnippets = async (snippetId, limit = 5) => {
  const target = await Snippet.findById(snippetId).lean();
  if (!target) {
    return [];
  }

  const candidates = await Snippet.find({
    _id: { $ne: snippetId },
    visibility: "public",
  })
    .populate("createdBy", "name username avatar")
    .populate("category", "name description")
    .limit(50)
    .lean();

  const targetTagsSet = new Set((target.tags || []).map((t) => t.toLowerCase().trim()));
  const targetLang = (target.language || "").toLowerCase();
  const targetCat = target.category ? String(target.category) : "";

  const scored = candidates.map((snippet) => {
    let similarityScore = 0;

    if (snippet.language && snippet.language.toLowerCase() === targetLang) {
      similarityScore += 10;
    }

    if (snippet.category && String(snippet.category._id || snippet.category) === targetCat) {
      similarityScore += 5;
    }

    if (Array.isArray(snippet.tags)) {
      snippet.tags.forEach((tag) => {
        if (targetTagsSet.has(tag.toLowerCase().trim())) {
          similarityScore += 4;
        }
      });
    }

    return {
      ...snippet,
      id: String(snippet._id),
      similarityScore,
    };
  });

  scored.sort((a, b) => b.similarityScore - a.similarityScore);
  return scored.slice(0, limit);
};

module.exports = {
  getRecommendedSnippets,
  getRecommendedSnippetsForUser,
  getSimilarSnippets,
};
