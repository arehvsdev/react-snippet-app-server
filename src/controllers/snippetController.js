const Snippet = require("../models/Snippet");
const Bookmark = require("../models/Bookmark");
const Comment = require("../models/Comment");

/** POST /api/snippets — create a new snippet */
const createSnippet = async (req, res) => {
    const { title, description, language, code, tags, visibility } = req.body;

    const snippet = await Snippet.create({
        title,
        description,
        language,
        code,
        tags,
        visibility: visibility || "public",
        createdBy: req.user.id,
    });

    res.status(201).json(snippet);
};

/** GET /api/snippets — list snippets (public, or all for the owner) */
const getSnippets = async (req, res) => {
    const { userId, visibility } = req.query;

    const filter = {};
    if (userId) filter.createdBy = userId;
    if (visibility) filter.visibility = visibility;
    else if (!userId) filter.visibility = "public"; // default: public feed

    const snippets = await Snippet.find(filter)
        .sort({ createdAt: -1 })
        .populate("createdBy", "name username");

    res.json(snippets);
};

/** GET /api/snippets/:id — single snippet */
const getSnippetById = async (req, res) => {
    const snippet = await Snippet.findById(req.params.id)
        .populate("createdBy", "name username");

    if (!snippet) {
        return res.status(404).json({ message: "Snippet not found" });
    }
    res.json(snippet);
};

/** DELETE /api/snippets/:id — delete own snippet */
const deleteSnippet = async (req, res) => {
    const snippet = await Snippet.findById(req.params.id);
    if (!snippet) return res.status(404).json({ message: "Snippet not found" });

    if (String(snippet.createdBy) !== String(req.user.id)) {
        return res.status(403).json({ message: "Not authorised" });
    }

    await snippet.deleteOne();
    res.json({ message: "Snippet deleted" });
};

/** POST /api/snippets/:id/bookmarks — toggle bookmark */
const toggleBookmark = async (req, res) => {
    const { id: snippetId } = req.params;
    const userId = req.user.id;

    const existing = await Bookmark.findOne({ userId, snippetId });
    if (existing) {
        await existing.deleteOne();
        res.json({ bookmarked: false });
    } else {
        await Bookmark.create({ userId, snippetId });
        res.json({ bookmarked: true });
    }
};

/** GET /api/snippets/my/bookmarks — list bookmarks for logged-in user */
const getUserBookmarks = async (req, res) => {
    const bookmarks = await Bookmark.find({ userId: req.user.id })
        .populate({
            path: 'snippetId',
            populate: { path: 'createdBy', select: 'name username' }
        })
        .sort({ createdAt: -1 });

    res.json(bookmarks.map(b => b.snippetId).filter(s => s)); // Return populated snippets
};

/** POST /api/snippets/:id/comments — add a comment */
const addComment = async (req, res) => {
    const { id: snippetId } = req.params;
    const { content } = req.body;

    const comment = await Comment.create({
        userId: req.user.id,
        snippetId,
        content
    });

    const populated = await Comment.findById(comment._id).populate("userId", "name username");
    res.status(201).json(populated);
};

/** GET /api/snippets/:id/comments — get comments for snippet */
const getComments = async (req, res) => {
    const { id: snippetId } = req.params;
    const comments = await Comment.find({ snippetId })
        .populate("userId", "name username")
        .sort({ createdAt: -1 });
    res.json(comments);
};

module.exports = { 
    createSnippet, getSnippets, getSnippetById, deleteSnippet,
    toggleBookmark, getUserBookmarks, addComment, getComments
};