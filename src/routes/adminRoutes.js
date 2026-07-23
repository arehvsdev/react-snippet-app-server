const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdminMiddleware");
const {
    getAllUsers,
    deleteAnySnippet
} = require("../controllers/adminController");

// Secure all admin routes with authentication and role-based authorization
router.use(protect);
router.use(isAdmin);

/** GET /api/admin/users — list all users */
router.get("/users", getAllUsers);

/** DELETE /api/admin/snippets/:id — force delete any snippet */
router.delete("/snippets/:id", deleteAnySnippet);

module.exports = router;
