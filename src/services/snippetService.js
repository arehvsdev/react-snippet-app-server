const Snippet = require("../models/Snippet");
const Bookmark = require("../models/Bookmark");
const Comment = require("../models/Comment");
const Like = require("../models/Like");
const User = require("../models/User");

const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const createSnippet = async (data, userId) => {
    const { title, description, language, code, tags, visibility, category } = data;
    return Snippet.create({
        title,
        description,
        language,
        code,
        tags,
        category,
        visibility: visibility || "public",
        createdBy: userId
    });
};

const updateSnippet = async (id, data, userId) => {
    const snippet = await Snippet.findById(id);
    if (!snippet) {
        const error = new Error("Snippet not found");
        error.statusCode = 404;
        throw error;
    }

    if (String(snippet.createdBy) !== String(userId)) {
        const error = new Error("Not authorised");
        error.statusCode = 403;
        throw error;
    }

    const allowedFields = ["title", "description", "language", "code", "tags", "visibility", "category"];
    allowedFields.forEach(field => {
        if (Object.prototype.hasOwnProperty.call(data, field)) {
            snippet[field] = data[field];
        }
    });

    return snippet.save();
};

const getSnippets = async (query, decodedUser) => {
    const allowedConditions = [{ visibility: "public" }];
    if (decodedUser && decodedUser.id) {
        allowedConditions.push({ visibility: "private", createdBy: decodedUser.id });
    }

    const filter = { $and: [{ $or: allowedConditions }] };
    const { userId, visibility, search, language, category, tags, author } = query;

    if (userId) filter.$and.push({ createdBy: userId });

    if (visibility) {
        if (visibility === "private") {
            if (!decodedUser || !decodedUser.id) {
                const error = new Error("Authentication required to view private snippets");
                error.statusCode = 401;
                throw error;
            }
            if (userId && userId !== decodedUser.id) {
                const error = new Error("Not authorized to view another user's private snippets");
                error.statusCode = 403;
                throw error;
            }
            filter.$and.push({ createdBy: decodedUser.id });
        }
        filter.$and.push({ visibility });
    }

    if (search && search.trim()) {
        const words = search.trim().split(/\s+/).filter(Boolean);
        words.forEach(word => {
            const safeWord = escapeRegExp(word);
            const wordRegex = new RegExp(safeWord, "i");
            filter.$and.push({
                $or: [
                    { title: wordRegex },
                    { description: wordRegex },
                    { code: wordRegex },
                    { tags: wordRegex }
                ]
            });
        });
    }

    if (language) filter.$and.push({ language: new RegExp(`^${escapeRegExp(language.trim())}$`, "i") });
    if (category) filter.$and.push({ category });

    if (tags) {
        const tagList = Array.isArray(tags) ? tags : String(tags).split(",").map(t => t.trim()).filter(Boolean);
        if (tagList.length > 0) {
            filter.$and.push({ tags: { $in: tagList } });
        }
    }

    if (author) {
        const authorUser = await User.findOne({ username: new RegExp(`^${escapeRegExp(author.trim())}$`, "i") });
        if (authorUser) {
            filter.$and.push({ createdBy: authorUser._id });
        } else {
            filter.$and.push({ createdBy: null });
        }
    }

    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const allowedSortFields = ["createdAt", "likes", "views", "bookmarksCount", "title"];
    const sortBy = allowedSortFields.includes(query.sortBy) ? query.sortBy : "createdAt";
    const sortOrder = query.sortOrder === "asc" ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    const total = await Snippet.countDocuments(filter);
    const snippets = await Snippet.find(filter)
        .populate("createdBy", "name username avatar")
        .populate("category", "name description")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

    if (decodedUser && decodedUser.id) {
        const snippetIds = snippets.map(s => s._id);
        const userBookmarks = await Bookmark.find({ userId: decodedUser.id, snippetId: { $in: snippetIds } }).select("snippetId").lean();
        const bookmarkedSet = new Set(userBookmarks.map(b => String(b.snippetId)));
        snippets.forEach(s => {
            s.isBookmarked = bookmarkedSet.has(String(s._id));
        });
    }

    return {
        snippets,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    };
};

const getSnippetById = async (id, decodedUser) => {
    const snippet = await Snippet.findById(id)
        .populate("createdBy", "name username avatar")
        .populate("category", "name description");

    if (!snippet) {
        const error = new Error("Snippet not found");
        error.statusCode = 404;
        throw error;
    }

    if (snippet.visibility === "private") {
        if (!decodedUser || String(snippet.createdBy._id || snippet.createdBy) !== String(decodedUser.id)) {
            const error = new Error("Not authorized to access this private snippet");
            error.statusCode = 403;
            throw error;
        }
    }

    snippet.views = (snippet.views || 0) + 1;
    await snippet.save();

    const snippetObj = snippet.toObject();
    if (decodedUser && decodedUser.id) {
        const isBookmarked = await Bookmark.exists({ userId: decodedUser.id, snippetId: snippet._id });
        snippetObj.isBookmarked = !!isBookmarked;
    } else {
        snippetObj.isBookmarked = false;
    }

    return snippetObj;
};

const deleteSnippet = async (id, user) => {
    const snippet = await Snippet.findById(id);
    if (!snippet) {
        const error = new Error("Snippet not found");
        error.statusCode = 404;
        throw error;
    }

    const isOwner = String(snippet.createdBy) === String(user.id);
    const isAdmin = user.role === "admin";

    if (!isOwner && !isAdmin) {
        const error = new Error("Not authorized to delete this snippet");
        error.statusCode = 403;
        throw error;
    }

    await Snippet.findByIdAndDelete(id);
    await Bookmark.deleteMany({ snippetId: id });
    await Comment.deleteMany({ snippetId: id });
    await Like.deleteMany({ targetId: id, targetType: "Snippet" });

    return true;
};

const toggleBookmark = async (snippetId, userId) => {
    const snippet = await Snippet.findById(snippetId);
    if (!snippet) {
        const error = new Error("Snippet not found");
        error.statusCode = 404;
        throw error;
    }

    const existing = await Bookmark.findOne({ userId, snippetId });
    let bookmarked = false;

    if (existing) {
        await Bookmark.deleteOne({ _id: existing._id });
        snippet.bookmarksCount = Math.max(0, (snippet.bookmarksCount || 0) - 1);
        bookmarked = false;
    } else {
        await Bookmark.create({ userId, snippetId });
        snippet.bookmarksCount = (snippet.bookmarksCount || 0) + 1;
        bookmarked = true;
    }

    await snippet.save();
    return { bookmarked, bookmarksCount: snippet.bookmarksCount };
};

const getUserBookmarks = async (userId, query) => {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await Bookmark.countDocuments({ userId });
    const bookmarks = await Bookmark.find({ userId })
        .populate({
            path: "snippetId",
            populate: [
                { path: "createdBy", select: "name username avatar" },
                { path: "category", select: "name description" }
            ]
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const snippets = bookmarks
        .map(b => b.snippetId)
        .filter(Boolean)
        .map(s => ({ ...s, isBookmarked: true }));

    return {
        snippets,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    };
};

const getComments = async (snippetId, query, decodedUser) => {
    const snippet = await Snippet.findById(snippetId);
    if (!snippet) {
        const error = new Error("Snippet not found");
        error.statusCode = 404;
        throw error;
    }

    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await Comment.countDocuments({ snippetId });
    const comments = await Comment.find({ snippetId })
        .populate("userId", "name username avatar")
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean();

    if (decodedUser && decodedUser.id) {
        const commentIds = comments.map(c => c._id);
        const userLikes = await Like.find({ userId: decodedUser.id, targetId: { $in: commentIds }, targetType: "Comment" }).select("targetId").lean();
        const likedSet = new Set(userLikes.map(l => String(l.targetId)));
        comments.forEach(c => {
            c.isLiked = likedSet.has(String(c._id));
        });
    }

    return {
        comments,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    };
};

const addComment = async (snippetId, { content, parentId }, userId) => {
    const snippet = await Snippet.findById(snippetId);
    if (!snippet) {
        const error = new Error("Snippet not found");
        error.statusCode = 404;
        throw error;
    }

    if (parentId) {
        const parentComment = await Comment.findById(parentId);
        if (!parentComment) {
            const error = new Error("Parent comment not found");
            error.statusCode = 404;
            throw error;
        }
    }

    const comment = await Comment.create({
        userId,
        snippetId,
        content,
        parentId: parentId || null
    });

    return Comment.findById(comment._id).populate("userId", "name username avatar");
};

const updateComment = async (commentId, content, userId) => {
    const comment = await Comment.findById(commentId);
    if (!comment) {
        const error = new Error("Comment not found");
        error.statusCode = 404;
        throw error;
    }

    if (String(comment.userId) !== String(userId)) {
        const error = new Error("Not authorized to update this comment");
        error.statusCode = 403;
        throw error;
    }

    comment.content = content;
    await comment.save();

    return Comment.findById(commentId).populate("userId", "name username avatar");
};

const deleteComment = async (commentId, user) => {
    const comment = await Comment.findById(commentId);
    if (!comment) {
        const error = new Error("Comment not found");
        error.statusCode = 404;
        throw error;
    }

    const isOwner = String(comment.userId) === String(user.id);
    const isAdmin = user.role === "admin";

    if (!isOwner && !isAdmin) {
        const error = new Error("Not authorized to delete this comment");
        error.statusCode = 403;
        throw error;
    }

    await Comment.findByIdAndDelete(commentId);
    await Comment.deleteMany({ parentId: commentId });
    await Like.deleteMany({ targetId: commentId, targetType: "Comment" });

    return true;
};

const toggleSnippetLike = async (snippetId, userId) => {
    const snippet = await Snippet.findById(snippetId);
    if (!snippet) {
        const error = new Error("Snippet not found");
        error.statusCode = 404;
        throw error;
    }

    const existing = await Like.findOne({ userId, targetId: snippetId, targetType: "Snippet" });
    let liked = false;

    if (existing) {
        await Like.deleteOne({ _id: existing._id });
        snippet.likes = Math.max(0, (snippet.likes || 0) - 1);
        liked = false;
    } else {
        await Like.create({ userId, targetId: snippetId, targetType: "Snippet" });
        snippet.likes = (snippet.likes || 0) + 1;
        liked = true;
    }

    await snippet.save();
    return { liked, likes: snippet.likes };
};

const toggleCommentLike = async (commentId, userId) => {
    const comment = await Comment.findById(commentId);
    if (!comment) {
        const error = new Error("Comment not found");
        error.statusCode = 404;
        throw error;
    }

    const existing = await Like.findOne({ userId, targetId: commentId, targetType: "Comment" });
    let liked = false;

    if (existing) {
        await Like.deleteOne({ _id: existing._id });
        liked = false;
    } else {
        await Like.create({ userId, targetId: commentId, targetType: "Comment" });
        liked = true;
    }

    const totalLikes = await Like.countDocuments({ targetId: commentId, targetType: "Comment" });
    return { liked, likes: totalLikes };
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
