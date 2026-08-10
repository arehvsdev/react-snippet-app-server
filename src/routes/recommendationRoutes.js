const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { mongoIdParam } = require("../middleware/validators");
const {
  getRecommendedSnippets,
  getRecommendedSnippetsForUser,
  getSimilarSnippets,
} = require("../controllers/recommendationController");

// Global recommendation ranking endpoint (Public)
router.get("/", getRecommendedSnippets);

// Endpoint for personalized user recommendations (requires authentication)
router.get("/user", protect, getRecommendedSnippetsForUser);

// Endpoint for similar snippet recommendations
router.get("/similar/:id", mongoIdParam("id"), getSimilarSnippets);

module.exports = router;
