const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdminMiddleware");
const {
    getSummary,
    getUserGrowth,
    getSnippetLanguages,
    getWeeklyActivity,
    getRecentActivity
} = require("../controllers/adminDashboardController");

// Secure all admin dashboard endpoints: authenticated and Admin role only
router.use(protect);
router.use(isAdmin);

router.get("/summary", getSummary);
router.get("/user-growth", getUserGrowth);
router.get("/snippet-languages", getSnippetLanguages);
router.get("/weekly-activity", getWeeklyActivity);
router.get("/recent-activity", getRecentActivity);

module.exports = router;
