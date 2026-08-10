/**
 * Hugging Face Configuration Helper
 * Centralizes environment variables, API endpoints, timeout settings, and model defaults.
 * Prevents hardcoding secrets or model names in application business logic.
 */

module.exports = {
  apiKey: process.env.HUGGINGFACE_API_KEY || "",
  model: process.env.HUGGINGFACE_MODEL || "cardiffnlp/twitter-roberta-base-sentiment-latest",
  toxicityModel: process.env.HUGGINGFACE_TOXICITY_MODEL || "martin-ha/toxic-comment-model",
  timeoutMs: parseInt(process.env.HUGGINGFACE_TIMEOUT_MS, 10) || 5000,
  
  /**
   * Helper check to verify if valid API key is present in environment
   */
  isConfigured: function() {
    return Boolean(this.apiKey && this.apiKey.trim() !== "" && this.apiKey !== "undefined");
  }
};
