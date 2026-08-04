const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdminMiddleware");
const {
    getDashboardSummary,
    getDashboardUserGrowth,
    getDashboardSnippetLanguages,
    getDashboardWeeklyActivity,
    getDashboardRecentActivity,
    getUsers,
    getUserById,
    updateUserRole,
    toggleUserStatus,
    deleteUser,
    deleteAnySnippet
} = require("../controllers/adminController");
const { mongoIdParam } = require("../middleware/validators");

// Secure all admin routes with authentication and role-based authorization
router.use(protect);
router.use(isAdmin);

/** GET /api/admin/dashboard/summary */
router.get("/dashboard/summary", getDashboardSummary);

/** GET /api/admin/dashboard/user-growth */
router.get("/dashboard/user-growth", getDashboardUserGrowth);

/** GET /api/admin/dashboard/snippet-languages */
router.get("/dashboard/snippet-languages", getDashboardSnippetLanguages);

/** GET /api/admin/dashboard/weekly-activity */
router.get("/dashboard/weekly-activity", getDashboardWeeklyActivity);

/** GET /api/admin/dashboard/recent-activity */
router.get("/dashboard/recent-activity", getDashboardRecentActivity);

/** GET /api/admin/users — list all users with pagination, filters, and search */
router.get("/users", getUsers);

/** GET /api/admin/users/:id — get single user details */
router.get("/users/:id", mongoIdParam("id"), getUserById);

/** PUT /api/admin/users/:id/role — change user role */
router.put("/users/:id/role", mongoIdParam("id"), updateUserRole);

/** PUT /api/admin/users/:id/status — enable/disable user status */
router.put("/users/:id/status", mongoIdParam("id"), toggleUserStatus);

/** DELETE /api/admin/users/:id — soft delete user account */
router.delete("/users/:id", mongoIdParam("id"), deleteUser);

/** DELETE /api/admin/snippets/:id — force delete any snippet */
router.delete("/snippets/:id", mongoIdParam("id"), deleteAnySnippet);

module.exports = router;
