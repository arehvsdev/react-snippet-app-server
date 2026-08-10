/**
 * Dedicated Hugging Face Communication & AI Analysis Service
 * Features robust error handling for:
 * - Hugging Face API unavailability / HTTP 5xx errors
 * - Invalid or missing API key
 * - Request timeouts via AbortController
 * - Empty comments
 * - API rate limits (HTTP 429 Too Many Requests)
 *
 * Gracefully falls back to local NLP heuristic scoring with logging.
 */

const hfConfig = require("../config/huggingFaceConfig");

class HuggingFaceService {
  constructor() {
    this.config = hfConfig;
  }

  /**
   * Primary interface to analyze a comment.
   * @param {string|object} comment - Raw comment text string or comment object with content/text field.
   * @returns {Promise<{ sentimentScore: number, toxicityScore: number, helpfulnessScore: number }>}
   */
  async analyzeComment(comment) {
    const text = typeof comment === "string" ? comment : (comment?.content || comment?.text || "");
    const trimmed = text ? text.trim() : "";

    // 1. Handle empty comments
    if (!trimmed) {
      console.info("[HuggingFaceService] Empty or whitespace comment provided. Returning default zero metrics.");
      return {
        sentimentScore: 0,
        toxicityScore: 0,
        helpfulnessScore: 0,
      };
    }

    // 2. Validate API key presence via configuration helper
    if (!this.config.isConfigured()) {
      console.warn("[HuggingFaceService] Missing or unconfigured HUGGINGFACE_API_KEY. Utilizing local NLP heuristic engine.");
      return this._fallbackAnalysis(trimmed);
    }

    // 3. Attempt Hugging Face REST API query with timeout and rate limit detection
    try {
      const [sentimentRes, toxicityRes] = await Promise.all([
        this._queryModelWithTimeout(this.config.model, trimmed),
        this._queryModelWithTimeout(this.config.toxicityModel, trimmed),
      ]);

      if (sentimentRes) {
        const { sentimentScore, posScore } = this._parseSentimentResponse(sentimentRes);
        const toxicityScore = this._parseToxicityResponse(toxicityRes);
        const helpfulnessScore = this._calculateHelpfulness(trimmed, posScore);

        return {
          sentimentScore,
          toxicityScore,
          helpfulnessScore,
        };
      }
    } catch (err) {
      console.error("[HuggingFaceService] Exception during Hugging Face API query:", err.message);
    }

    // 4. Fallback execution
    console.warn("[HuggingFaceService] Returning local heuristic analysis as API query did not succeed.");
    return this._fallbackAnalysis(trimmed);
  }

  /**
   * Performs HTTP POST request to Hugging Face model endpoint with AbortController timeout
   * @private
   */
  async _queryModelWithTimeout(model, text) {
    const controller = new AbortController();
    const timeoutMs = this.config.timeoutMs || 5000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${model}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: text }),
          signal: controller.signal,
        }
      );

      clearTimeout(timer);

      // Handle specific HTTP error status codes
      if (response.status === 429) {
        console.warn(`[HuggingFaceService] Rate limit hit (HTTP 429 Too Many Requests) for model ${model}.`);
        return null;
      }

      if (response.status === 401 || response.status === 403) {
        console.warn(`[HuggingFaceService] Authorization failed (HTTP ${response.status}). Invalid API key.`);
        return null;
      }

      if (response.status >= 500) {
        console.warn(`[HuggingFaceService] Hugging Face service unavailable (HTTP ${response.status} Server Error).`);
        return null;
      }

      if (!response.ok) {
        console.warn(`[HuggingFaceService] Query to ${model} returned non-OK status: HTTP ${response.status}.`);
        return null;
      }

      return await response.json();
    } catch (err) {
      clearTimeout(timer);
      if (err.name === "AbortError") {
        console.warn(`[HuggingFaceService] Request to model ${model} timed out after ${this.timeoutMs}ms.`);
      } else {
        console.warn(`[HuggingFaceService] Network error querying model ${model}:`, err.message);
      }
      return null;
    }
  }

  /**
   * Parses sentiment response array into normalized float [-1.0 to 1.0]
   * @private
   */
  _parseSentimentResponse(res) {
    if (!Array.isArray(res) || !Array.isArray(res[0])) {
      return { sentimentScore: 0, posScore: 0 };
    }

    const scores = res[0];
    const pos = scores.find((s) => (s.label || "").toLowerCase().includes("positive"));
    const neg = scores.find((s) => (s.label || "").toLowerCase().includes("negative"));

    const posScore = pos ? pos.score : 0;
    const negScore = neg ? neg.score : 0;
    const sentimentScore = Math.round((posScore - negScore) * 100) / 100;

    return { sentimentScore, posScore };
  }

  /**
   * Parses toxicity response array into normalized float [0.0 to 1.0]
   * @private
   */
  _parseToxicityResponse(res) {
    if (!Array.isArray(res) || !Array.isArray(res[0])) {
      return 0;
    }

    const toxicObj = res[0].find((s) => (s.label || "").toLowerCase().includes("toxic"));
    return toxicObj ? Math.round(toxicObj.score * 100) / 100 : 0;
  }

  /**
   * Calculates normalized helpfulness float [0.0 to 1.0]
   * @private
   */
  _calculateHelpfulness(text, posScore) {
    const wordCount = text.split(/\s+/).length;
    const depthBoost = wordCount > 10 ? 0.4 : wordCount > 4 ? 0.2 : 0.1;
    const score = Math.min(1.0, 0.3 + depthBoost + posScore * 0.3);
    return Math.round(score * 100) / 100;
  }

  /**
   * Local rule-based NLP lexicon engine for fallback scoring
   * @private
   */
  _fallbackAnalysis(text) {
    const lower = text.toLowerCase();

    const positiveWords = [
      "great", "awesome", "excellent", "helpful", "good", "perfect", "clear",
      "love", "best", "thanks", "thank you", "nice", "useful", "working", "works",
      "solved", "cool", "clean", "brilliant", "fantastic", "superb"
    ];

    const negativeWords = [
      "bad", "terrible", "horrible", "worst", "broken", "useless", "confusing",
      "error", "bug", "wrong", "fail", "failed", "garbage", "trash", "hate"
    ];

    const toxicWords = [
      "stupid", "idiot", "dumb", "fool", "shut up", "ugly", "scam", "cheat",
      "moron", "lame", "abuse", "nasty", "toxic", "hate", "trash"
    ];

    const helpfulKeywords = [
      "example", "solution", "fixed", "step", "how to", "try", "use",
      "import", "return", "code", "function", "documentation", "link",
      "because", "reason", "detail", "explanation", "instead", "recommend"
    ];

    let posCount = 0;
    let negCount = 0;
    let toxicCount = 0;
    let helpfulCount = 0;

    positiveWords.forEach((w) => { if (lower.includes(w)) posCount++; });
    negativeWords.forEach((w) => { if (lower.includes(w)) negCount++; });
    toxicWords.forEach((w) => { if (lower.includes(w)) toxicCount++; });
    helpfulKeywords.forEach((w) => { if (lower.includes(w)) helpfulCount++; });

    let sentimentScore = 0;
    if (posCount > negCount) {
      sentimentScore = Math.min(1.0, 0.4 + (posCount - negCount) * 0.2);
    } else if (negCount > posCount) {
      sentimentScore = Math.max(-1.0, -0.4 - (negCount - posCount) * 0.2);
    }

    const wordCount = text.split(/\s+/).length;
    const helpfulnessScore = Math.min(1.0, Math.round(((helpfulCount * 0.25) + (wordCount > 10 ? 0.3 : 0.1)) * 100) / 100);
    const toxicityScore = toxicCount > 0 ? Math.min(1.0, Math.round((0.5 + toxicCount * 0.25) * 100) / 100) : 0.0;

    return {
      sentimentScore: Math.round(sentimentScore * 100) / 100,
      toxicityScore,
      helpfulnessScore,
    };
  }
}

module.exports = new HuggingFaceService();
