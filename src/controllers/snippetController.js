/**
 * Snippet Controller Module
 * Express route handlers for snippet CRUD, bookmarking, commenting, and liking.
 */
const snippetService = require("../services/snippetService");
const jwt = require("jsonwebtoken");

/**
 * Utility helper to decode user payload from authorization header safely without throwing.
 */
const getDecodedUser = (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return null;
        }
    }
    return null;
};

/**
 * Creates a new code snippet for authenticated user.
 */
const createSnippet = async (req, res, next) => {
    try {
        const snippet = await snippetService.createSnippet(req.body, req.user.id);
        res.status(201).json({
            success: true,
            message: "Snippet created successfully",
            data: snippet,
            snippet
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Updates an existing code snippet.
 */
const updateSnippet = async (req, res, next) => {
    try {
        const updatedSnippet = await snippetService.updateSnippet(req.params.id, req.body, req.user.id);
        res.status(200).json({
            success: true,
            message: "Snippet updated successfully",
            data: updatedSnippet,
            snippet: updatedSnippet
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Retrieves paginated list of code snippets with optional filters (category, language, tag, search query).
 */
const getSnippets = async (req, res, next) => {
    try {
        const decodedUser = getDecodedUser(req);
        const result = await snippetService.getSnippets(req.query, decodedUser);
        res.status(200).json({
            success: true,
            data: result.snippets,
            snippets: result.snippets,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Fetches single snippet detail by ID and increments view count.
 */
const getSnippetById = async (req, res, next) => {
    try {
        const decodedUser = getDecodedUser(req);
        const snippet = await snippetService.getSnippetById(req.params.id, decodedUser);
        res.status(200).json({
            success: true,
            data: snippet,
            snippet
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Deletes snippet by ID (Owner or Admin only).
 */
const deleteSnippet = async (req, res, next) => {
    try {
        await snippetService.deleteSnippet(req.params.id, req.user);
        res.status(200).json({
            success: true,
            message: "Snippet deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Toggles bookmark status of a snippet for the logged-in user.
 */
const toggleBookmark = async (req, res, next) => {
    try {
        const result = await snippetService.toggleBookmark(req.params.id, req.user.id);
        res.status(200).json({
            success: true,
            message: result.bookmarked ? "Snippet bookmarked" : "Bookmark removed",
            data: result,
            bookmarked: result.bookmarked,
            bookmarksCount: result.bookmarksCount
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Fetches all bookmarked snippets for the authenticated user.
 */
const getUserBookmarks = async (req, res, next) => {
    try {
        const result = await snippetService.getUserBookmarks(req.user.id, req.query);
        res.status(200).json({
            success: true,
            data: result.snippets,
            bookmarks: result.snippets,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Fetches comments for a specific snippet.
 */
const getComments = async (req, res, next) => {
    try {
        const decodedUser = getDecodedUser(req);
        const result = await snippetService.getComments(req.params.id, req.query, decodedUser);
        res.status(200).json({
            success: true,
            data: result.comments,
            comments: result.comments,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Adds a new comment or reply to a snippet.
 */
const addComment = async (req, res, next) => {
    try {
        const comment = await snippetService.addComment(req.params.id, req.body, req.user.id);
        res.status(201).json({
            success: true,
            message: "Comment added successfully",
            data: comment,
            comment
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Updates content of an existing comment.
 */
const updateComment = async (req, res, next) => {
    try {
        const commentId = req.params.commentId || req.params.id;
        const comment = await snippetService.updateComment(commentId, req.body.content, req.user.id);
        res.status(200).json({
            success: true,
            message: "Comment updated successfully",
            data: comment,
            comment
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Deletes a comment.
 */
const deleteComment = async (req, res, next) => {
    try {
        const commentId = req.params.commentId || req.params.id;
        await snippetService.deleteComment(commentId, req.user);
        res.status(200).json({
            success: true,
            message: "Comment deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Toggles like status on a snippet.
 */
const toggleSnippetLike = async (req, res, next) => {
    try {
        const result = await snippetService.toggleSnippetLike(req.params.id, req.user.id);
        res.status(200).json({
            success: true,
            message: result.liked ? "Snippet liked" : "Snippet unliked",
            data: result,
            liked: result.liked,
            likes: result.likes
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Toggles like status on a comment.
 */
const toggleCommentLike = async (req, res, next) => {
    try {
        const commentId = req.params.commentId || req.params.id;
        const result = await snippetService.toggleCommentLike(commentId, req.user.id);
        res.status(200).json({
            success: true,
            message: result.liked ? "Comment liked" : "Comment unliked",
            data: result,
            liked: result.liked,
            likes: result.likes
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createSnippet,
    updateSnippet,
    getSnippets,
    getSnippetById,
    deleteSnippet,
    toggleBookmark,
    getUserBookmarks,
    getComments,
    addComment,
    updateComment,
    deleteComment,
    toggleSnippetLike,
    toggleCommentLike
};
