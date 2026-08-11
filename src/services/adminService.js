const User = require("../models/User");
const Snippet = require("../models/Snippet");
const Language = require("../models/Language");
const Tag = require("../models/Tag");
const Category = require("../models/Category");
const Comment = require("../models/Comment");
const Bookmark = require("../models/Bookmark");

const getDashboardSummary = async (tzOffsetMinutes = 0) => {
    const totalUsers = await User.countDocuments({ role: { $ne: "admin" } });
    const totalSnippets = await Snippet.countDocuments();

    // 1. Calculate unique languages from Snippets AND Language collection
    const distinctSnippetLangs = await Snippet.distinct("language", {
        language: { $exists: true, $ne: null }
    });
    const managedLangs = await Language.find({ isActive: true }).distinct("name");
    const uniqueLangSet = new Set(
        [...distinctSnippetLangs, ...managedLangs]
            .map(l => (typeof l === "string" ? l.trim().toLowerCase() : ""))
            .filter(Boolean)
    );
    const totalLanguages = uniqueLangSet.size;

    // 2. Calculate unique tags from Snippet.tags arrays AND Tag collection
    const distinctSnippetTags = await Snippet.distinct("tags", {
        tags: { $exists: true, $ne: null }
    });
    const managedTags = await Tag.find({ isActive: true }).distinct("name");
    const uniqueTagSet = new Set(
        [...distinctSnippetTags, ...managedTags]
            .map(t => (typeof t === "string" ? t.trim().toLowerCase() : ""))
            .filter(Boolean)
    );
    const totalTags = uniqueTagSet.size;

    return {
        totalUsers,
        totalSnippets,
        totalLanguages,
        totalTags,
        activeLanguages: totalLanguages,
        activeTags: totalTags
    };
};

const getDashboardUserGrowth = async (months = 6) => {
    const dateLimit = new Date();
    dateLimit.setMonth(dateLimit.getMonth() - months);

    const userGrowth = await User.aggregate([
        { $match: { createdAt: { $gte: dateLimit }, role: { $ne: "admin" } } },
        {
            $group: {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" }
                },
                users: { $sum: 1 }
            }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedUserGrowth = userGrowth.map(item => ({
        month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
        users: item.users
    }));

    return formattedUserGrowth;
};

const getDashboardSnippetLanguages = async () => {
    const snippetLanguages = await Snippet.aggregate([
        { $group: { _id: "$language", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 }
    ]);

    const formattedLanguages = snippetLanguages.map(item => ({
        name: item._id || "Other",
        count: item.count
    }));

    return formattedLanguages;
};

const getDashboardWeeklyActivity = async () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyData = days.map(day => ({ day, snippets: 0, users: 0 }));

    return weeklyData;
};

const getDashboardRecentActivity = async () => {
    const recentSnippets = await Snippet.find()
        .populate("createdBy", "name username avatar")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

    return recentSnippets;
};

const getUsers = async (query) => {
    const { page = 1, limit = 10, search, role, status } = query;
    const filter = {};

    if (search) {
        filter.$or = [
            { name: new RegExp(search, "i") },
            { username: new RegExp(search, "i") },
            { email: new RegExp(search, "i") }
        ];
    }
    if (role) filter.role = role;
    if (status !== undefined) filter.active = status === "active";

    const skip = (page - 1) * limit;
    const total = await User.countDocuments(filter);
    const users = await User.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10));

    return {
        users,
        pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), pages: Math.ceil(total / limit) }
    };
};

const updateUserRole = async (id, role) => {
    const allowedRoles = ["developer", "student", "mentor", "recruiter", "admin"];
    if (!allowedRoles.includes(role)) {
        const error = new Error("Invalid role specified");
        error.statusCode = 400;
        throw error;
    }

    const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select("-password");
    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    const auditLogService = require("./auditLogService");
    await auditLogService.recordAuditLog({
        type: "Admin",
        action: "USER_ROLE_CHANGE",
        resourceType: "User",
        resourceId: user._id,
        resourceName: user.name,
        status: "Success",
        details: { newRole: role, email: user.email }
    });

    return user;
};

const toggleUserStatus = async (id, active) => {
    const user = await User.findByIdAndUpdate(id, { active }, { new: true }).select("-password");
    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    const auditLogService = require("./auditLogService");
    await auditLogService.recordAuditLog({
        type: "Admin",
        action: "USER_STATUS_CHANGE",
        resourceType: "User",
        resourceId: user._id,
        resourceName: user.name,
        status: "Success",
        details: { active, email: user.email }
    });

    return user;
};

const deleteUser = async (id) => {
    const user = await User.findById(id);
    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    // 1. Find all snippets owned by the user
    const userSnippets = await Snippet.find({ createdBy: id }).select("_id");
    const userSnippetIds = userSnippets.map(s => s._id);

    // 2. Delete all comments created by this user or left on their snippets
    await Comment.deleteMany({
        $or: [
            { userId: id },
            { snippetId: { $in: userSnippetIds } }
        ]
    });

    // 3. Delete all bookmarks created by this user or pointing to their snippets
    await Bookmark.deleteMany({
        $or: [
            { userId: id },
            { snippetId: { $in: userSnippetIds } }
        ]
    });

    // 4. Delete all snippets owned by the user
    await Snippet.deleteMany({ createdBy: id });

    // 5. Delete the user document
    await User.findByIdAndDelete(id);

    const auditLogService = require("./auditLogService");
    await auditLogService.recordAuditLog({
        type: "Admin",
        action: "USER_DELETE",
        resourceType: "User",
        resourceId: id,
        resourceName: user.name,
        status: "Success",
        details: { email: user.email }
    });

    return true;
};

const getUserById = async (id) => {
    const user = await User.findById(id).select("-password");
    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }
    return user;
};

const deleteAnySnippet = async (id, adminUser = null) => {
    const snippet = await Snippet.findByIdAndDelete(id);
    if (!snippet) {
        const error = new Error("Snippet not found");
        error.statusCode = 404;
        throw error;
    }

    const activityLogService = require("./activityLogService");
    const auditLogService = require("./auditLogService");

    await activityLogService.logActivity({
        userId: adminUser?.id || adminUser?._id,
        actionType: "snippet_delete",
        description: `Admin deleted snippet: "${snippet.title}"`,
        details: { snippetId: id, title: snippet.title }
    });

    await auditLogService.recordAuditLog({
        userId: adminUser?.id || adminUser?._id,
        userEmail: adminUser?.email,
        userName: adminUser?.name || "Admin",
        type: "Admin",
        action: "ADMIN_SNIPPET_DELETE",
        resourceType: "Snippet",
        resourceId: id,
        resourceName: snippet.title,
        status: "Success"
    });

    return true;
};

module.exports = {
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
    deleteAnySnippet
};
