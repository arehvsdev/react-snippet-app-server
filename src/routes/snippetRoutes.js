const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
    createSnippet,
    getSnippets,
    getSnippetById,
    deleteSnippet,
    toggleBookmark,
    getUserBookmarks,
    addComment,
    getComments
} = require("../controllers/snippetController");

router.get("/", getSnippets);
router.get("/my/bookmarks", protect, getUserBookmarks); // Important: Place before /:id to prevent "my" from being treated as an ID
router.get("/:id", getSnippetById);
router.post("/", protect, createSnippet);
router.delete("/:id", protect, deleteSnippet);
router.post("/:id/bookmarks", protect, toggleBookmark);
router.get("/:id/comments", getComments);
router.post("/:id/comments", protect, addComment);

module.exports = router;