const Snippet = require("../models/Snippet");
const Bookmark = require("../models/Bookmark");
const Comment = require("../models/Comment");
const User = require("../models/User");
const Like = require("../models/Like");

/** POST /api/snippets - create a new snippet */
const createSnippet = async (req, res, next) => {
    try {
        const { title, description, language, code, tags, visibility, category } = req.body;

        const snippet = await Snippet.create({
            title,
            description,
            language,
            code,
            tags,
            category,
            visibility: visibility || "public",
            createdBy: req.user.id,
        });

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

/** PUT /api/snippets/:id - update own snippet */
const updateSnippet = async (req, res, next) => {
    try {
        const snippet = await Snippet.findById(req.params.id);
        if (!snippet) {
            return res.status(404).json({
                success: false,
                message: "Snippet not found",
                errors: null
            });
        }

        if (String(snippet.createdBy) !== String(req.user.id)) {
            return res.status(403).json({
                success: false,
                message: "Not authorised",
                errors: null
            });
        }

        const allowedFields = [
            "title",
            "description",
            "language",
            "code",
            "tags",
            "visibility",
            "category"
        ];

        allowedFields.forEach(field => {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                snippet[field] = req.body[field];
            }
        });

        const updatedSnippet = await snippet.save();

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

const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/** GET /api/snippets - list snippets with advanced query filters, pagination and sorting */
const getSnippets = async (req, res, next) => {
    try {
        let decodedUser = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            try {
                const decoded = require("jsonwebtoken").verify(token, process.env.JWT_SECRET);
                decodedUser = decoded;
            } catch (err) {
                // Ignore invalid tokens for optional auth
            }
        }

        const allowedConditions = [{ visibility: "public" }];
        if (decodedUser && decodedUser.id) {
            allowedConditions.push({ visibility: "private", createdBy: decodedUser.id });
        }

        const filter = {
            $and: [
                { $or: allowedConditions }
            ]
        };

        const {
            userId,
            visibility,
            search,
            language,
            category,
            tags,
            author,
            page = 1,
            limit = 10,
            sortBy = "createdAt",
            sortOrder = "desc"
        } = req.query;

        // 1. Author ID Filter
        if (userId) {
            filter.$and.push({ createdBy: userId });
        }

        // 2. Visibility Filter
        if (visibility) {
            if (visibility === "private") {
                if (!decodedUser) {
                    return res.status(401).json({
                        success: false,
                        message: "Authentication required to view private snippets",
                        errors: null
                    });
                }
                filter.$and.push({ visibility: "private", createdBy: decodedUser.id });
            } else {
                filter.$and.push({ visibility: "public" });
            }
        }

        // 3. Category Filter
        if (category) {
            filter.$and.push({ category: category });
        }

        // 4. Language Filter
        if (language) {
            filter.$and.push({ language: new RegExp(`^${escapeRegExp(language)}$`, "i") });
        }

        // 5. Tags Filter
        if (tags) {
            const tagsArray = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
            if (tagsArray.length > 0) {
                filter.$and.push({ tags: { $in: tagsArray } });
            }
        }

        // 6. Title Search
        if (search) {
            filter.$and.push({ title: new RegExp(escapeRegExp(search), "i") });
        }

        // 7. Author Name Search
        if (author) {
            const users = await User.find({
                $or: [
                    { name: new RegExp(escapeRegExp(author), "i") },
                    { username: new RegExp(escapeRegExp(author), "i") }
                ]
            }).select("_id");
            const userIds = users.map(u => u._id);
            filter.$and.push({ createdBy: { $in: userIds } });
        }

        // Pagination parameters
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 10));
        const skip = (pageNum - 1) * limitNum;

        // Sorting options
        const allowedSortFields = ["createdAt", "title", "views", "likes"];
        const sortByField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const sortOrderVal = sortOrder === "asc" ? 1 : -1;
        const sortOption = { [sortByField]: sortOrderVal };

        const total = await Snippet.countDocuments(filter);
        const pages = Math.ceil(total / limitNum);

        const snippets = await Snippet.find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(limitNum)
            .populate("createdBy", "name username")
            .populate("category", "name");

        let likedSnippetIds = [];
        let bookmarkedSnippetIds = [];
        if (decodedUser && decodedUser.id) {
            const userLikes = await Like.find({
                userId: decodedUser.id,
                targetType: "Snippet",
                targetId: { $in: snippets.map(s => s._id) }
            }).select("targetId");
            likedSnippetIds = userLikes.map(l => String(l.targetId));

            const userBookmarks = await Bookmark.find({
                userId: decodedUser.id,
                snippetId: { $in: snippets.map(s => s._id) }
            }).select("snippetId");
            bookmarkedSnippetIds = userBookmarks.map(b => String(b.snippetId));
        }

        const snippetsWithStates = snippets.map(s => {
            const obj = s.toObject();
            obj.id = String(s._id);
            obj.isLiked = likedSnippetIds.includes(String(s._id));
            obj.isBookmarked = bookmarkedSnippetIds.includes(String(s._id));
            obj.bookmarksCount = s.bookmarksCount || 0;
            return obj;
        });

        res.status(200).json({
            success: true,
            pagination: {
                totalPages: pages,
                totalItems: total,
                currentPage: pageNum
            },
            data: snippetsWithStates,
            snippets: snippetsWithStates
        });
    } catch (error) {
        next(error);
    }
};

/** GET /api/snippets/:id - single snippet */
const getSnippetById = async (req, res, next) => {
    try {
        const snippet = await Snippet.findById(req.params.id)
            .populate("createdBy", "name username");

        if (!snippet) {
            return res.status(404).json({
                success: false,
                message: "Snippet not found",
                errors: null
            });
        }

        let isLiked = false;
        let isBookmarked = false;
        let decodedUserId = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            try {
                const decoded = require("jsonwebtoken").verify(token, process.env.JWT_SECRET);
                decodedUserId = decoded.id;
            } catch (err) {}
        }

        if (decodedUserId) {
            const like = await Like.findOne({
                userId: decodedUserId,
                targetId: snippet._id,
                targetType: "Snippet"
            });
            isLiked = !!like;

            const bookmark = await Bookmark.findOne({
                userId: decodedUserId,
                snippetId: snippet._id
            });
            isBookmarked = !!bookmark;
        }

        const snippetObj = snippet.toObject();
        snippetObj.id = String(snippet._id);
        snippetObj.isLiked = isLiked;
        snippetObj.isBookmarked = isBookmarked;
        snippetObj.bookmarksCount = snippet.bookmarksCount || 0;

        res.status(200).json({
            success: true,
            data: snippetObj,
            snippet: snippetObj
        });
    } catch (error) {
        next(error);
    }
};

/** DELETE /api/snippets/:id - delete own snippet */
const deleteSnippet = async (req, res, next) => {
    try {
        const snippet = await Snippet.findById(req.params.id);
        if (!snippet) {
            return res.status(404).json({
                success: false,
                message: "Snippet not found",
                errors: null
            });
        }

        if (String(snippet.createdBy) !== String(req.user.id)) {
            return res.status(403).json({
                success: false,
                message: "Not authorised",
                errors: null
            });
        }

        await snippet.deleteOne();

        res.status(200).json({
            success: true,
            message: "Snippet deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

/** POST /api/snippets/:id/bookmarks - toggle bookmark */
const toggleBookmark = async (req, res, next) => {
    try {
        const { id: snippetId } = req.params;
        const userId = req.user.id;

        const snippet = await Snippet.findById(snippetId);
        if (!snippet) {
            return res.status(404).json({
                success: false,
                message: "Snippet not found",
                errors: null
            });
        }

        const existing = await Bookmark.findOne({ userId, snippetId });
        let bookmarked = false;
        if (existing) {
            await existing.deleteOne();
            if (snippet.bookmarksCount > 0) {
                snippet.bookmarksCount -= 1;
                await snippet.save();
            }
        } else {
            await Bookmark.create({ userId, snippetId });
            snippet.bookmarksCount = (snippet.bookmarksCount || 0) + 1;
            await snippet.save();
            bookmarked = true;
        }

        res.status(200).json({
            success: true,
            bookmarked,
            bookmarksCount: snippet.bookmarksCount,
            message: bookmarked ? "Bookmark added successfully" : "Bookmark deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

/** GET /api/snippets/my/bookmarks - list bookmarks for logged-in user with pagination */
const getUserBookmarks = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalItems = await Bookmark.countDocuments({ userId: req.user.id });
        const totalPages = Math.ceil(totalItems / limit);

        const bookmarks = await Bookmark.find({ userId: req.user.id })
            .populate({
                path: "snippetId",
                populate: { path: "createdBy", select: "name username" }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const snippets = bookmarks.map(b => {
            if (!b.snippetId) return null;
            const obj = b.snippetId.toObject();
            obj.id = String(b.snippetId._id);
            obj.isBookmarked = true;
            obj.bookmarksCount = b.snippetId.bookmarksCount || 0;
            return obj;
        }).filter(s => s);

        res.status(200).json({
            success: true,
            pagination: {
                totalPages,
                totalItems,
                currentPage: page
            },
            data: snippets,
            bookmarks: snippets
        });
    } catch (error) {
        next(error);
    }
};

/** POST /api/snippets/:id/comments - add a comment or reply */
const addComment = async (req, res, next) => {
    try {
        const { id: snippetId } = req.params;
        const { content, parentId = null } = req.body;

        const snippet = await Snippet.findById(snippetId);
        if (!snippet) {
            return res.status(404).json({
                success: false,
                message: "Snippet not found",
                errors: null
            });
        }

        if (parentId) {
            const parent = await Comment.findById(parentId);
            if (!parent) {
                return res.status(404).json({
                    success: false,
                    message: "Parent comment not found",
                    errors: null
                });
            }
        }

        const comment = await Comment.create({
            userId: req.user.id,
            snippetId,
            content,
            parentId
        });

        const populated = await Comment.findById(comment._id).populate("userId", "name username");

        res.status(201).json({
            success: true,
            message: "Comment added successfully",
            data: populated,
            comment: populated
        });
    } catch (error) {
        next(error);
    }
};

/** GET /api/snippets/:id/comments - get comments for snippet */
const getComments = async (req, res, next) => {
    try {
        const { id: snippetId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const snippet = await Snippet.findById(snippetId);
        if (!snippet) {
            return res.status(404).json({
                success: false,
                message: "Snippet not found",
                errors: null
            });
        }

        const totalItems = await Comment.countDocuments({ snippetId });
        const totalPages = Math.ceil(totalItems / limit);

        const comments = await Comment.find({ snippetId })
            .populate("userId", "name username")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        let decodedUser = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            try {
                const decoded = require("jsonwebtoken").verify(token, process.env.JWT_SECRET);
                decodedUser = decoded;
            } catch (err) {}
        }

        let likedCommentIds = [];
        if (decodedUser && decodedUser.id) {
            const userLikes = await Like.find({
                userId: decodedUser.id,
                targetType: "Comment",
                targetId: { $in: comments.map(c => c._id) }
            }).select("targetId");
            likedCommentIds = userLikes.map(l => String(l.targetId));
        }

        const commentsWithLikeState = [];
        for (const c of comments) {
            const count = await Like.countDocuments({
                targetId: c._id,
                targetType: "Comment"
            });
            const obj = c.toObject();
            obj.id = String(c._id);
            obj.likes = count;
            obj.isLiked = likedCommentIds.includes(String(c._id));
            commentsWithLikeState.push(obj);
        }

        res.status(200).json({
            success: true,
            pagination: {
                totalPages,
                totalItems,
                currentPage: page
            },
            data: commentsWithLikeState,
            comments: commentsWithLikeState
        });
    } catch (error) {
        next(error);
    }
};

const toggleSnippetLike = async (req, res, next) => {
    try {
        const { id: snippetId } = req.params;
        const userId = req.user.id;

        const snippet = await Snippet.findById(snippetId);
        if (!snippet) {
            return res.status(404).json({
                success: false,
                message: "Snippet not found",
                errors: null
            });
        }

        const existing = await Like.findOne({ userId, targetId: snippetId, targetType: "Snippet" });
        let liked = false;
        if (existing) {
            await existing.deleteOne();
            if (snippet.likes > 0) {
                snippet.likes -= 1;
                await snippet.save();
            }
        } else {
            await Like.create({ userId, targetId: snippetId, targetType: "Snippet" });
            snippet.likes += 1;
            await snippet.save();
            liked = true;
        }

        res.status(200).json({
            success: true,
            liked,
            likes: snippet.likes,
            message: liked ? "Snippet liked successfully" : "Snippet unliked successfully"
        });
    } catch (error) {
        next(error);
    }
};

const toggleCommentLike = async (req, res, next) => {
    try {
        const { commentId } = req.params;
        const userId = req.user.id;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: "Comment not found",
                errors: null
            });
        }

        const existing = await Like.findOne({ userId, targetId: commentId, targetType: "Comment" });
        let liked = false;
        if (existing) {
            await existing.deleteOne();
        } else {
            await Like.create({ userId, targetId: commentId, targetType: "Comment" });
            liked = true;
        }

        const likes = await Like.countDocuments({ targetId: commentId, targetType: "Comment" });

        res.status(200).json({
            success: true,
            liked,
            likes,
            message: liked ? "Comment liked successfully" : "Comment unliked successfully"
        });
    } catch (error) {
        next(error);
    }
};

const updateComment = async (req, res, next) => {
    try {
        const { commentId } = req.params;
        const { content } = req.body;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: "Comment not found",
                errors: null
            });
        }

        if (String(comment.userId) !== String(req.user.id)) {
            return res.status(403).json({
                success: false,
                message: "Not authorised to edit this comment",
                errors: null
            });
        }

        comment.content = content;
        await comment.save();

        const populated = await Comment.findById(commentId).populate("userId", "name username");
        const likesCount = await Like.countDocuments({ targetId: commentId, targetType: "Comment" });
        const existingLike = await Like.findOne({ userId: req.user.id, targetId: commentId, targetType: "Comment" });

        const commentObj = populated.toObject();
        commentObj.id = String(populated._id);
        commentObj.likes = likesCount;
        commentObj.isLiked = !!existingLike;

        res.status(200).json({
            success: true,
            message: "Comment updated successfully",
            data: commentObj,
            comment: commentObj
        });
    } catch (error) {
        next(error);
    }
};

const deleteComment = async (req, res, next) => {
    try {
        const { commentId } = req.params;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: "Comment not found",
                errors: null
            });
        }

        const snippet = await Snippet.findById(comment.snippetId);
        const isCommentOwner = String(comment.userId) === String(req.user.id);
        const isSnippetOwner = snippet && String(snippet.createdBy) === String(req.user.id);

        if (!isCommentOwner && !isSnippetOwner) {
            return res.status(403).json({
                success: false,
                message: "Not authorised to delete this comment",
                errors: null
            });
        }

        await comment.deleteOne();
        await Comment.deleteMany({ parentId: commentId });
        await Like.deleteMany({ targetId: commentId, targetType: "Comment" });

        res.status(200).json({
            success: true,
            message: "Comment deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
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
};
