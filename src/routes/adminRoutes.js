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
    deleteAnySnippet,
    getActivityLogs,
    getAuditLogs,
    getAuditLogById,
    getEmailLogs
} = require("../controllers/adminController");
const {
    getAllSubscriptions,
    getFreeSubscriptions,
    getProSubscriptions,
    getSubscriptionStats,
    getAllPayments,
    updateUserSubscription
} = require("../controllers/adminSubscriptionController");
const { mongoIdParam } = require("../middleware/validators");

// Secure all admin routes with authentication and role-based authorization
router.use(protect);
router.use(isAdmin);

/** GET /api/admin/logs, /api/admin/audit-logs & /api/admin/email-logs — list system activity & email audit logs */
router.get("/logs", getActivityLogs);
router.get("/audit-logs", getAuditLogs);
router.get("/audit-logs/:id", mongoIdParam("id"), getAuditLogById);
router.get("/email-logs", getEmailLogs);

/** GET /api/admin/users — list all users with pagination, filters, and search */
router.get("/users", getUsers);

/** GET /api/admin/users/:id — get single user details */
router.get("/users/:id", mongoIdParam("id"), getUserById);

/** PUT /api/admin/users/:id/role — change user role */
router.put("/users/:id/role", mongoIdParam("id"), updateUserRole);

/** PUT /api/admin/users/:id/status — enable/disable user status */
router.put("/users/:id/status", mongoIdParam("id"), toggleUserStatus);

/** PUT /api/admin/users/:id/subscription — update user subscription plan/status */
router.put("/users/:id/subscription", mongoIdParam("id"), updateUserSubscription);

/** DELETE /api/admin/users/:id — soft delete user account */
router.delete("/users/:id", mongoIdParam("id"), deleteUser);

/** DELETE /api/admin/snippets/:id — force delete any snippet */
router.delete("/snippets/:id", mongoIdParam("id"), deleteAnySnippet);

/** GET /api/admin/subscriptions/stats — summary statistics for subscriptions */
router.get("/subscriptions/stats", getSubscriptionStats);

/** GET /api/admin/subscriptions — list all user subscriptions with pagination */
router.get("/subscriptions", getAllSubscriptions);

/** GET /api/admin/subscriptions/free — list FREE plan users */
router.get("/subscriptions/free", getFreeSubscriptions);

/** GET /api/admin/subscriptions/pro — list PRO plan users */
router.get("/subscriptions/pro", getProSubscriptions);

/** GET /api/admin/payments — list all payment transaction records for admin */
router.get("/payments", getAllPayments);

module.exports = router;

