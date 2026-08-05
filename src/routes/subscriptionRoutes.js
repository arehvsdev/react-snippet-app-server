const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const subscriptionController = require("../controllers/subscriptionController");

/** GET /api/subscription — get authenticated user's subscription details */
router.get("/", protect, subscriptionController.getMySubscription);

module.exports = router;
