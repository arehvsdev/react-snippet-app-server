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
    getComments,
    toggleSnippetLike,
    toggleCommentLike,
    updateComment,
    deleteComment
} = require("../controllers/snippetController");
const {
    mongoIdParam,
    validateSnippetList,
    validateCreateSnippet,
    validateUpdateSnippet,
    validateComment,
    validateCommentBody,
    validateBookmarkToggle
} = require("../middleware/validators");

router.get("/", validateSnippetList, getSnippets);
router.get("/my/bookmarks", protect, getUserBookmarks); // Important: Place before /:id to prevent "my" from being treated as an ID
router.get("/:id", mongoIdParam("id"), getSnippetById);
router.post("/", protect, validateCreateSnippet, createSnippet);
router.put("/:id", protect, validateUpdateSnippet, updateSnippet);
router.delete("/:id", protect, mongoIdParam("id"), deleteSnippet);
router.post("/:id/bookmarks", protect, validateBookmarkToggle, toggleBookmark);
router.post("/:id/like", protect, mongoIdParam("id"), toggleSnippetLike);
router.get("/:id/comments", mongoIdParam("id"), getComments);
router.post("/:id/comments", protect, validateComment, addComment);
router.put("/comments/:commentId", protect, validateCommentBody, updateComment);
router.delete("/comments/:commentId", protect, mongoIdParam("commentId"), deleteComment);
router.post("/comments/:commentId/like", protect, mongoIdParam("commentId"), toggleCommentLike);

module.exports = router;
