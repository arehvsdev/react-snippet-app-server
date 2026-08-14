const mongoose = require("mongoose");
const Snippet = require("../models/Snippet");
const Bookmark = require("../models/Bookmark");
const Comment = require("../models/Comment");
const Like = require("../models/Like");
const User = require("../models/User");

const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const Tag = require("../models/Tag");
const Category = require("../models/Category");
const commentAnalysisService = require("./commentAnalysisService");

/**
 * Automatically checks and saves any new tags attached to a snippet into the Tag collection,
 * so they are persisted in DB and available for future snippet creation autocomplete.
 */
const autoSaveNewTags = async (tags, userId) => {
    if (!Array.isArray(tags) || tags.length === 0) return;
    
    const tagColors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#06B6D4"];

    for (let rawTag of tags) {
        if (typeof rawTag !== "string") continue;
        const cleanedName = rawTag.trim().toLowerCase().replace(/^#/, '');
        if (!cleanedName) continue;

        try {
            const existing = await Tag.findOne({ name: cleanedName });
            if (!existing) {
                const randomColor = tagColors[Math.floor(Math.random() * tagColors.length)];
                await Tag.create({
                    name: cleanedName,
                    color: randomColor,
                    isActive: true,
                    createdBy: userId
                });
                console.log(`Auto-persisted new tag in DB: #${cleanedName}`);
            }
        } catch (err) {
            if (err.code !== 11000) {
                console.error(`Error auto-saving tag ${cleanedName}:`, err);
            }
        }
    }
};

const createSnippet = async (data, userId) => {
    const { title, description, language, code, tags, visibility, category } = data;
    const targetVisibility = visibility || "public";

    let targetCategory = category;
    if (!targetCategory && language) {
        const matchedCat = await Category.findOne({ name: new RegExp(`^${escapeRegExp(language.trim())}$`, "i") });
        if (matchedCat) {
            targetCategory = matchedCat._id;
        }
    }

    const user = await User.findById(userId);
    const userPlan = user?.subscription?.plan || "FREE";
    const userRole = user?.role || "user";
    const isAdmin = userRole === "admin";

    // Enforce total snippet limit for FREE plan users (max 3) - Skip for Admin
    if (!isAdmin && userPlan !== "PRO") {
        const totalCount = await Snippet.countDocuments({ createdBy: userId });

        if (totalCount >= 3) {
            const error = new Error("Snippet limit reached. Free plan users can create a maximum of 3 snippets. Please upgrade to PRO for unlimited snippets.");
            error.statusCode = 400;
            throw error;
        }
    }

    // Enforce private snippet limit for FREE plan users on backend - Skip for Admin
    if (targetVisibility === "private" && !isAdmin && userPlan !== "PRO") {
        const privateCount = await Snippet.countDocuments({
            createdBy: userId,
            visibility: "private"
        });

        if (privateCount >= 5) {
            const error = new Error("Private snippet limit reached. Free plan users can create a maximum of 5 private snippets. Please upgrade to PRO for unlimited private storage.");
            error.statusCode = 400;
            throw error;
        }
    }

    if (tags && Array.isArray(tags)) {
        await autoSaveNewTags(tags, userId);
    }

    const createdSnippet = await Snippet.create({
        title,
        description,
        language,
        code,
        tags,
        category: targetCategory,
        visibility: targetVisibility,
        createdBy: userId
    });

    const activityLogService = require("./activityLogService");
    await activityLogService.logActivity({
        userId,
        actionType: "snippet_create",
        description: `Created new snippet: "${createdSnippet.title}" (${createdSnippet.language})`,
        details: {
            snippetId: createdSnippet._id,
            title: createdSnippet.title,
            language: createdSnippet.language,
            visibility: createdSnippet.visibility
        }
    });

    const auditLogService = require("./auditLogService");
    await auditLogService.recordAuditLog({
        userId,
        userName: user?.name || user?.username || "User",
        userEmail: user?.email || "",
        type: "Snippet",
        action: "SNIPPET_CREATE",
        resourceType: "Snippet",
        resourceId: createdSnippet._id,
        resourceName: createdSnippet.title,
        status: "Success",
        details: {
            snippetId: createdSnippet._id,
            title: createdSnippet.title,
            language: createdSnippet.language,
            visibility: createdSnippet.visibility
        }
    });

    return createdSnippet;
};

const updateSnippet = async (id, data, userId) => {
    const snippet = await Snippet.findById(id);
    if (!snippet) {
        const error = new Error("Snippet not found");
        error.statusCode = 404;
        throw error;
    }

    const user = await User.findById(userId);
    const userRole = (user?.role || "").toLowerCase();
    const isAdmin = userRole === "admin";
    const isOwner = String(snippet.createdBy) === String(userId);

    if (!isOwner && !isAdmin) {
        const error = new Error("Not authorised to edit this snippet");
        error.statusCode = 403;
        throw error;
    }

    // Enforce private snippet limit if converting public to private - Skip for Admin
    if (data.visibility === "private" && snippet.visibility !== "private") {
        const user = await User.findById(userId);
        const userPlan = user?.subscription?.plan || "FREE";
        const userRole = user?.role || "user";
        const isAdmin = userRole === "admin";

        if (!isAdmin && userPlan !== "PRO") {
            const privateCount = await Snippet.countDocuments({
                createdBy: userId,
                visibility: "private"
            });

            if (privateCount >= 5) {
                const error = new Error("Private snippet limit reached. Free plan users can create a maximum of 5 private snippets. Please upgrade to PRO for unlimited private storage.");
                error.statusCode = 400;
                throw error;
            }
        }
    }

    const allowedFields = ["title", "description", "language", "code", "tags", "visibility", "category"];
    allowedFields.forEach(field => {
        if (Object.prototype.hasOwnProperty.call(data, field)) {
            snippet[field] = data[field];
        }
    });

    if (!snippet.category && snippet.language) {
        const matchedCat = await Category.findOne({ name: new RegExp(`^${escapeRegExp(snippet.language.trim())}$`, "i") });
        if (matchedCat) {
            snippet.category = matchedCat._id;
        }
    }

    if (data.tags && Array.isArray(data.tags)) {
        await autoSaveNewTags(data.tags, userId);
    }

    const updatedSnippet = await snippet.save();

    const activityLogService = require("./activityLogService");
    await activityLogService.logActivity({
        userId,
        actionType: "snippet_edit",
        description: `Edited snippet: "${updatedSnippet.title}"`,
        details: {
            snippetId: updatedSnippet._id,
            title: updatedSnippet.title,
            language: updatedSnippet.language,
            visibility: updatedSnippet.visibility
        }
    });

    const auditLogService = require("./auditLogService");
    await auditLogService.recordAuditLog({
        userId,
        userName: user?.name || user?.username || "User",
        userEmail: user?.email || "",
        type: "Snippet",
        action: "SNIPPET_UPDATE",
        resourceType: "Snippet",
        resourceId: updatedSnippet._id,
        resourceName: updatedSnippet.title,
        status: "Success",
        details: {
            snippetId: updatedSnippet._id,
            title: updatedSnippet.title,
            language: updatedSnippet.language,
            visibility: updatedSnippet.visibility
        }
    });

    return updatedSnippet;
};

const getSnippets = async (query, decodedUser) => {
    let isProUser = false;
    if (decodedUser) {
        const role = String(decodedUser.role || "").toLowerCase();
        const tokenPlan = String(decodedUser.plan || "").toUpperCase();
        if (tokenPlan === "PRO" || role === "admin" || role === "pro") {
            isProUser = true;
        } else {
            const uid = decodedUser.id || decodedUser._id || decodedUser.userId;
            if (uid) {
                const dbUser = await User.findById(uid).select("subscription role").lean();
                if (dbUser) {
                    const plan = (dbUser.subscription?.plan || "").toUpperCase();
                    const userRole = (dbUser.role || "").toLowerCase();
                    if (plan === "PRO" || userRole === "admin" || userRole === "pro") {
                        isProUser = true;
                    }
                }
            }
        }
    }

    const { userId, excludeUserId, excludeSelf, visibility, search, language, category, tags, author } = query;
    const normVisibility = visibility ? String(visibility).toLowerCase().trim() : "";

    const filter = { $and: [] };

    // 1. Visibility & Permission Scoping
    if (normVisibility === "private") {
        if (isProUser) {
            filter.$and.push({ visibility: "private" });
        } else if (decodedUser && (decodedUser.id || decodedUser._id)) {
            const uid = decodedUser.id || decodedUser._id;
            filter.$and.push({ visibility: "private", createdBy: uid });
        } else {
            return {
                snippets: [],
                pagination: { total: 0, page: Math.max(1, Number(query.page) || 1), limit: Number(query.limit) || 10, pages: 0 }
            };
        }
    } else if (normVisibility === "public") {
        filter.$and.push({ visibility: "public" });
    } else {
        const allowedConditions = [{ visibility: "public" }];
        if (isProUser) {
            allowedConditions.push({ visibility: "private" });
        } else if (decodedUser && (decodedUser.id || decodedUser._id)) {
            const uid = decodedUser.id || decodedUser._id;
            allowedConditions.push({ visibility: "private", createdBy: uid });
        }
        filter.$and.push({ $or: allowedConditions });
    }

    if (userId) filter.$and.push({ createdBy: userId });
    if (excludeUserId && !isProUser && !category && !language && !search && !tags && !author && !normVisibility) {
        filter.$and.push({ createdBy: { $ne: excludeUserId } });
    }
    if (excludeSelf && decodedUser && decodedUser.id && !category && !language && !search && !tags && !author && !visibility) {
        filter.$and.push({ createdBy: { $ne: decodedUser.id } });
    }

    if (language && String(language).trim()) {
        const langRegex = new RegExp(`^${escapeRegExp(String(language).trim())}$`, "i");
        filter.$and.push({ language: langRegex });
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
                    { tags: wordRegex },
                    { language: wordRegex }
                ]
            });
        });
    }

    if (category) {
        let catId = null;
        let catName = String(category).trim();

        if (mongoose.Types.ObjectId.isValid(category)) {
            catId = category;
            const catDoc = await Category.findById(category).lean();
            if (catDoc) {
                catName = catDoc.name.trim();
            }
        } else {
            const catDoc = await Category.findOne({ name: new RegExp(`^${escapeRegExp(catName)}$`, "i") }).lean();
            if (catDoc) {
                catId = catDoc._id;
                catName = catDoc.name.trim();
            }
        }

        // Exact string match regex so "Java" does NOT match "JavaScript"
        const exactCatRegex = new RegExp(`^${escapeRegExp(catName)}$`, "i");
        const categoryOrConditions = [
            { language: exactCatRegex },
            { tags: exactCatRegex }
        ];

        if (catId) {
            categoryOrConditions.unshift({ category: catId });
        }

        filter.$and.push({ $or: categoryOrConditions });
    }

    if (tags) {
        const tagList = (Array.isArray(tags) ? tags : String(tags).split(","))
            .map(t => String(t).trim().replace(/^#/, ''))
            .filter(Boolean);
        if (tagList.length > 0) {
            const tagRegexes = tagList.map(t => new RegExp(`^#?${escapeRegExp(t)}$`, "i"));
            filter.$and.push({ tags: { $in: tagRegexes } });
        }
    }

    if (author && String(author).trim()) {
        const safeAuthor = escapeRegExp(String(author).trim());
        const authorUser = await User.findOne({
            $or: [
                { username: new RegExp(`^${safeAuthor}$`, "i") },
                { name: new RegExp(`^${safeAuthor}$`, "i") }
            ]
        });
        if (authorUser) {
            filter.$and.push({ createdBy: authorUser._id });
        } else {
            filter.$and.push({ createdBy: null });
        }
    }

    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const allowedSortFields = ["createdAt", "likes", "views", "bookmarksCount", "title", "aiScore", "aiRecommendationScore"];
    let sortBy = "aiRecommendationScore";
    if (query.sortBy && allowedSortFields.includes(query.sortBy)) {
        sortBy = (query.sortBy === "aiScore" || query.sortBy === "aiRecommendationScore") ? "aiRecommendationScore" : query.sortBy;
    }
    const sortOrder = query.sortOrder === "asc" ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    const queryFilter = filter.$and.length > 0 ? filter : {};
    const total = await Snippet.countDocuments(queryFilter);
    const snippets = await Snippet.find(queryFilter)
        .populate("createdBy", "name username avatar")
        .populate("category", "name description")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

    const snippetIds = snippets.map(s => s._id);
    let bookmarkedSet = new Set();
    let likedSet = new Set();
    if (decodedUser && decodedUser.id && snippetIds.length > 0) {
        const [userBookmarks, userLikes] = await Promise.all([
            Bookmark.find({ userId: decodedUser.id, snippetId: { $in: snippetIds } }).select("snippetId").lean(),
            Like.find({ userId: decodedUser.id, targetId: { $in: snippetIds }, targetType: "Snippet" }).select("targetId").lean()
        ]);
        bookmarkedSet = new Set(userBookmarks.map(b => String(b.snippetId)));
        likedSet = new Set(userLikes.map(l => String(l.targetId)));
    }

    snippets.forEach(s => {
        s.id = String(s._id);
        s.recommendationScore = s.ai?.recommendationScore ?? s.aiRecommendationScore ?? 0;
        s.isBookmarked = bookmarkedSet.has(String(s._id));
        s.isLiked = likedSet.has(String(s._id));
    });

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
        let isProUser = false;
        if (decodedUser && decodedUser.id) {
            const dbUser = await User.findById(decodedUser.id).select("subscription role").lean();
            if (dbUser && (dbUser.subscription?.plan === "PRO" || dbUser.role === "admin" || dbUser.role === "pro")) {
                isProUser = true;
            }
        }

        if (!isProUser && (!decodedUser || String(snippet.createdBy._id || snippet.createdBy) !== String(decodedUser.id))) {
            const error = new Error("Not authorized to access this private snippet");
            error.statusCode = 403;
            throw error;
        }
    }

    snippet.views = (snippet.views || 0) + 1;
    await snippet.save();

    const snippetObj = snippet.toObject();
    if (decodedUser && decodedUser.id) {
        const [isBookmarked, isLiked] = await Promise.all([
            Bookmark.exists({ userId: decodedUser.id, snippetId: snippet._id }),
            Like.exists({ userId: decodedUser.id, targetId: snippet._id, targetType: "Snippet" })
        ]);
        snippetObj.isBookmarked = !!isBookmarked;
        snippetObj.isLiked = !!isLiked;
    } else {
        snippetObj.isBookmarked = false;
        snippetObj.isLiked = false;
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

    const activityLogService = require("./activityLogService");
    await activityLogService.logActivity({
        userId: user.id,
        actionType: "snippet_delete",
        description: `Deleted snippet: "${snippet.title}"`,
        details: {
            snippetId: id,
            title: snippet.title,
            language: snippet.language,
            deletedByRole: user.role
        }
    });

    const auditLogService = require("./auditLogService");
    await auditLogService.recordAuditLog({
        userId: user.id,
        userName: user.name || user.username || "User",
        userEmail: user.email || "",
        type: "Snippet",
        action: "SNIPPET_DELETE",
        resourceType: "Snippet",
        resourceId: id,
        resourceName: snippet.title,
        status: "Success",
        details: {
            snippetId: id,
            title: snippet.title
        }
    });

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
    const allBookmarks = await Bookmark.find({ userId }).populate({ path: "snippetId", select: "language" }).lean();
    const allLanguages = new Set(allBookmarks.map(b => b.snippetId?.language).filter(Boolean));

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

    const rawSnippets = bookmarks
        .map(b => b.snippetId)
        .filter(Boolean);

    const snippetIds = rawSnippets.map(s => s._id);
    let likedSet = new Set();
    if (userId && snippetIds.length > 0) {
        const userLikes = await Like.find({ userId, targetId: { $in: snippetIds }, targetType: "Snippet" }).select("targetId").lean();
        likedSet = new Set(userLikes.map(l => String(l.targetId)));
    }

    const snippets = rawSnippets.map(s => ({
        ...s,
        isBookmarked: true,
        isLiked: likedSet.has(String(s._id))
    }));

    return {
        snippets,
        pagination: { total, page, limit, pages: Math.ceil(total / limit), uniqueLanguages: allLanguages.size }
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

    // Trigger notification for snippet creator if not self-commenting
    const snippetObj = await Snippet.findById(snippetId).populate("createdBy", "name username");
    if (snippetObj && String(snippetObj.createdBy._id || snippetObj.createdBy) !== String(userId)) {
        const commentUser = await User.findById(userId);
        const commenterName = commentUser?.name || "A developer";
        const notificationService = require("./notificationService");
        await notificationService.createNotification({
            recipient: snippetObj.createdBy._id || snippetObj.createdBy,
            sender: userId,
            type: "comment",
            title: "New Comment on Your Snippet",
            message: `${commenterName} commented on your snippet "${snippetObj.title}"`,
            link: "/snippet-feed",
            snippetId: snippetId
        });
    }

    // Trigger activity log for comment
    const activityLogService = require("./activityLogService");
    await activityLogService.logActivity({
        userId,
        actionType: "snippet_comment",
        description: `Added comment on snippet: "${snippetObj?.title || 'snippet'}"`,
        details: {
            snippetId,
            snippetTitle: snippetObj?.title || '',
            commentId: comment._id,
            excerpt: content.length > 60 ? content.substring(0, 60) + "..." : content
        }
    });

    const auditLogService = require("./auditLogService");
    const commentUser = await User.findById(userId);
    await auditLogService.recordAuditLog({
        userId,
        userName: commentUser?.name || commentUser?.username || "User",
        userEmail: commentUser?.email || "",
        type: "Comment",
        action: "COMMENT_CREATE",
        resourceType: "Comment",
        resourceId: comment._id,
        resourceName: snippetObj?.title || "Comment",
        status: "Success",
        details: {
            snippetId,
            commentId: comment._id
        }
    });

    // Trigger non-blocking asynchronous background AI analysis via Hugging Face pipeline
    setImmediate(() => {
        commentAnalysisService.analyzeCommentInBackground(comment._id, snippetId);
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

    const user = await User.findById(userId);
    const userRole = (user?.role || "").toLowerCase();
    const isAdmin = userRole === "admin";
    const isOwner = String(comment.userId) === String(userId);

    if (!isOwner && !isAdmin) {
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
    // 1. Check if user already liked
    const existing = await Like.findOne({ userId, targetId: snippetId, targetType: "Snippet" });
    let liked = false;

    if (existing) {
        // Atomic deletion & atomic decrement
        await Like.deleteOne({ _id: existing._id });
        const updatedSnippet = await Snippet.findByIdAndUpdate(
            snippetId,
            { $inc: { likes: -1 } },
            { new: true }
        );
        if (!updatedSnippet) {
            const error = new Error("Snippet not found");
            error.statusCode = 404;
            throw error;
        }
        // Ensure likes count never drops below 0
        if (updatedSnippet.likes < 0) {
            updatedSnippet.likes = 0;
            await updatedSnippet.save();
        }
        liked = false;

        // Recalculate AI recommendation score
        const likes = updatedSnippet.likes || 0;
        const bookmarks = updatedSnippet.bookmarksCount || 0;
        const views = updatedSnippet.views || 0;
        const sentiment = updatedSnippet.ai?.sentimentScore ?? 0.5;
        const helpfulness = updatedSnippet.ai?.helpfulnessScore ?? 0.5;
        const toxicity = updatedSnippet.ai?.toxicityScore ?? 0;
        const newScore = Math.max(0, Math.round(((likes * 3) + (bookmarks * 2) + (views * 0.1) + (sentiment * 5) + (helpfulness * 5) - (toxicity * 10)) * 10) / 10);
        
        updatedSnippet.aiRecommendationScore = newScore;
        if (updatedSnippet.ai) {
            updatedSnippet.ai.recommendationScore = newScore;
        }
        await updatedSnippet.save();

        return { liked, likes: updatedSnippet.likes, recommendationScore: newScore };
    } else {
        // Attempt atomic creation. If duplicate due to race condition, handle gracefully
        try {
            await Like.create({ userId, targetId: snippetId, targetType: "Snippet" });
        } catch (err) {
            if (err.code === 11000) {
                // Already liked (race condition catch)
                const currentSnippet = await Snippet.findById(snippetId);
                return { liked: true, likes: currentSnippet?.likes || 0, recommendationScore: currentSnippet?.aiRecommendationScore || 0 };
            }
            throw err;
        }

        const updatedSnippet = await Snippet.findByIdAndUpdate(
            snippetId,
            { $inc: { likes: 1 } },
            { new: true }
        ).populate("createdBy", "name username");

        if (!updatedSnippet) {
            const error = new Error("Snippet not found");
            error.statusCode = 404;
            throw error;
        }

        liked = true;

        // Trigger notification for snippet author (if not self-like)
        const authorId = updatedSnippet.createdBy._id || updatedSnippet.createdBy;
        if (String(authorId) !== String(userId)) {
            const likerUser = await User.findById(userId).select("name");
            const likerName = likerUser?.name || "A developer";
            const notificationService = require("./notificationService");
            await notificationService.createNotification({
                recipient: authorId,
                sender: userId,
                type: "like",
                title: "New Like on Your Snippet",
                message: `${likerName} liked your snippet "${updatedSnippet.title}"`,
                link: "/snippet-feed",
                snippetId: snippetId
            });
        }

        // Recalculate AI recommendation score
        const likes = updatedSnippet.likes || 0;
        const bookmarks = updatedSnippet.bookmarksCount || 0;
        const views = updatedSnippet.views || 0;
        const sentiment = updatedSnippet.ai?.sentimentScore ?? 0.5;
        const helpfulness = updatedSnippet.ai?.helpfulnessScore ?? 0.5;
        const toxicity = updatedSnippet.ai?.toxicityScore ?? 0;
        const newScore = Math.max(0, Math.round(((likes * 3) + (bookmarks * 2) + (views * 0.1) + (sentiment * 5) + (helpfulness * 5) - (toxicity * 10)) * 10) / 10);

        updatedSnippet.aiRecommendationScore = newScore;
        if (updatedSnippet.ai) {
            updatedSnippet.ai.recommendationScore = newScore;
        }
        await updatedSnippet.save();

        return { liked, likes: updatedSnippet.likes, recommendationScore: newScore };
    }
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

/**
 * Calculates logged-in user snippet metrics (total, public, private, bookmarks).
 */
const getMySnippetStats = async (userId) => {
    const total = await Snippet.countDocuments({ createdBy: userId });
    const publicCount = await Snippet.countDocuments({ createdBy: userId, visibility: "public" });
    const privateCount = await Snippet.countDocuments({ createdBy: userId, visibility: "private" });
    const bookmarks = await Bookmark.countDocuments({ userId });

    return {
        total,
        public: publicCount,
        private: privateCount,
        bookmarks
    };
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
    toggleCommentLike,
    getMySnippetStats
};
