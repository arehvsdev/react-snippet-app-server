const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
    createSnippet,
    getSnippets,
    getSnippetById,
    deleteSnippet,
    updateSnippet,
    toggleBookmark,
    getUserBookmarks,
    addComment,
    getComments
} = require("../controllers/snippetController");
const {
    mongoIdParam,
    validateSnippetList,
    validateCreateSnippet,
    validateUpdateSnippet,
    validateComment
} = require("../middleware/validators");

router.get("/", validateSnippetList, getSnippets);
router.get("/my/bookmarks", protect, getUserBookmarks); // Important: Place before /:id to prevent "my" from being treated as an ID
router.get("/:id", mongoIdParam("id"), getSnippetById);
router.post("/", protect, validateCreateSnippet, createSnippet);
router.put("/:id", protect, validateUpdateSnippet, updateSnippet);
router.delete("/:id", protect, mongoIdParam("id"), deleteSnippet);
router.post("/:id/bookmarks", protect, mongoIdParam("id"), toggleBookmark);
router.get("/:id/comments", mongoIdParam("id"), getComments);
router.post("/:id/comments", protect, validateComment, addComment);

module.exports = router;
