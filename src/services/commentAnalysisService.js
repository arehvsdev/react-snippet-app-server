const Comment = require("../models/Comment");
const Snippet = require("../models/Snippet");
const huggingFaceService = require("./huggingFaceService");

/**
 * Optimized Background Service for Batch Comment AI Analysis & Snippet Recommendation Scoring.
 * Features:
 * - Duplicate analysis prevention (skips completed or already-queued comments)
 * - Intelligent batch queueing (aggregates multiple comment requests to reduce DB load)
 * - Zero Hugging Face calls during homepage requests
 */
class CommentAnalysisService {
  constructor() {
    this.batchQueue = [];
    this.processingSet = new Set();
    this.batchTimeout = null;
    this.batchDelayMs = 1000; // Batch collection window
    this.maxBatchSize = 10;   // Trigger batch immediately if queue reaches 10
  }

  /**
   * Enqueues a comment for background analysis with deduplication.
   */
  analyzeCommentInBackground(commentId, snippetId) {
    const commentIdStr = String(commentId);

    // 1. Prevent duplicate analysis if already in queue or processing
    if (this.processingSet.has(commentIdStr)) {
      console.info(`[CommentAnalysisService] Skipping duplicate analysis for comment ${commentIdStr}`);
      return;
    }

    this.processingSet.add(commentIdStr);
    this.batchQueue.push({ commentId: commentIdStr, snippetId: String(snippetId) });

    // 2. Trigger immediate batch processing if queue is full
    if (this.batchQueue.length >= this.maxBatchSize) {
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
        this.batchTimeout = null;
      }
      this.processBatch();
    } else if (!this.batchTimeout) {
      // 3. Otherwise schedule batch processing after collection window
      this.batchTimeout = setTimeout(() => {
        this.batchTimeout = null;
        this.processBatch();
      }, this.batchDelayMs);
    }
  }

  /**
   * Processes all queued comment items in a batch.
   * Performs deduplication check against DB, batch HuggingFace analysis, and updates MongoDB.
   */
  async processBatch() {
    if (this.batchQueue.length === 0) return;

    const currentBatch = [...this.batchQueue];
    this.batchQueue = []; // Clear queue

    const commentIds = currentBatch.map((item) => item.commentId);
    const affectedSnippetIds = new Set(currentBatch.map((item) => item.snippetId));

    try {
      // Fetch comment documents from MongoDB
      const comments = await Comment.find({
        _id: { $in: commentIds },
      });

      // Filter out comments that were already completed (Deduplication)
      const pendingComments = comments.filter(
        (c) => !c.aiAnalysis || c.aiAnalysis.status !== "completed"
      );

      if (pendingComments.length > 0) {
        console.info(`[CommentAnalysisService] Processing batch of ${pendingComments.length} comments.`);

        // Analyze comments concurrently via HuggingFace service
        await Promise.all(
          pendingComments.map(async (comment) => {
            try {
              const { sentimentScore, helpfulnessScore, toxicityScore } =
                await huggingFaceService.analyzeComment(comment.content);

              comment.aiAnalysis = {
                sentiment: sentimentScore,
                helpfulness: helpfulnessScore,
                toxicity: toxicityScore,
                status: "completed",
                analyzedAt: new Date(),
              };
              await comment.save();
            } catch (err) {
              console.warn(`[CommentAnalysisService] Analysis failed for comment ${comment._id}:`, err.message);
              comment.aiAnalysis = {
                sentiment: 0,
                helpfulness: 0,
                toxicity: 0,
                status: "failed",
                analyzedAt: new Date(),
              };
              await comment.save();
            }
          })
        );
      }

      // Recalculate recommendation scores for affected snippets once per batch
      for (const snippetId of affectedSnippetIds) {
        if (snippetId && snippetId !== "null" && snippetId !== "undefined") {
          await this.recalculateSnippetRecommendationScore(snippetId);
        }
      }
    } catch (batchErr) {
      console.error("[CommentAnalysisService] Error processing comment analysis batch:", batchErr.message);
    } finally {
      // Remove processed items from memory tracking set
      commentIds.forEach((id) => this.processingSet.delete(id));
    }
  }

  /**
   * Recalculates aggregate AI metrics and recommendation score for a snippet in MongoDB.
   */
  async recalculateSnippetRecommendationScore(snippetId) {
    try {
      const snippet = await Snippet.findById(snippetId);
      if (!snippet) return;

      // Fetch all completed analyzed comments for this snippet
      const analyzedComments = await Comment.find({
        snippetId,
        "aiAnalysis.status": "completed",
      }).lean();

      let avgSentiment = 0;
      let avgHelpfulness = 0;
      let avgToxicity = 0;
      const count = analyzedComments.length;

      let positiveComments = 0;
      let negativeComments = 0;

      if (count > 0) {
        const totalSentiment = analyzedComments.reduce((acc, c) => acc + (c.aiAnalysis?.sentiment || 0), 0);
        const totalHelpfulness = analyzedComments.reduce((acc, c) => acc + (c.aiAnalysis?.helpfulness || 0), 0);
        const totalToxicity = analyzedComments.reduce((acc, c) => acc + (c.aiAnalysis?.toxicity || 0), 0);

        avgSentiment = Math.round((totalSentiment / count) * 100) / 100;
        avgHelpfulness = Math.round((totalHelpfulness / count) * 100) / 100;
        avgToxicity = Math.round((totalToxicity / count) * 100) / 100;

        analyzedComments.forEach((c) => {
          if ((c.aiAnalysis?.sentiment || 0) > 0) positiveComments++;
          if ((c.aiAnalysis?.sentiment || 0) < 0) negativeComments++;
        });
      }

      // Recommendation Score Formula based STRICTLY on Comment Sentiment (60%) and Likes (40%)
      const normSentiment = (avgSentiment + 1) / 2; // Maps [-1, 1] -> [0, 1]
      const normLikes = Math.min(1.0, Math.log((snippet.likes || 0) + 1) / Math.log(50));

      const compositeScore = (
        0.60 * normSentiment +
        0.40 * normLikes
      ) * 100;

      const finalScore = Math.round(compositeScore * 10) / 10;

      snippet.aiRecommendationScore = finalScore;
      snippet.ai = {
        recommendationScore: finalScore,
        sentimentScore: avgSentiment,
        helpfulnessScore: avgHelpfulness,
        toxicityScore: avgToxicity,
        positiveComments,
        negativeComments,
        lastAnalyzed: new Date(),
      };

      await snippet.save();
      return finalScore;
    } catch (err) {
      console.warn(`[CommentAnalysisService] Failed to recalculate score for snippet ${snippetId}:`, err.message);
    }
  }
}

module.exports = new CommentAnalysisService();
