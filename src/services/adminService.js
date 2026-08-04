const User = require("../models/User");
const Snippet = require("../models/Snippet");
const Language = require("../models/Language");
const Tag = require("../models/Tag");
const Category = require("../models/Category");

const getDashboardSummary = async (tzOffsetMinutes = 0) => {
    const totalUsers = await User.countDocuments({ role: { $ne: "admin" } });
    const totalSnippets = await Snippet.countDocuments();
    const activeLanguages = await Language.countDocuments({ isActive: true });
    const activeTags = await Tag.countDocuments({ isActive: true });
    const activeCategories = await Category.countDocuments();

    return {
        totalUsers,
        totalSnippets,
        activeLanguages,
        activeTags,
        activeCategories
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
    return user;
};

const toggleUserStatus = async (id, active) => {
    const user = await User.findByIdAndUpdate(id, { active }, { new: true }).select("-password");
    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }
    return user;
};

const deleteUser = async (id) => {
    const user = await User.findByIdAndDelete(id);
    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }
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

const deleteAnySnippet = async (id) => {
    const snippet = await Snippet.findByIdAndDelete(id);
    if (!snippet) {
        const error = new Error("Snippet not found");
        error.statusCode = 404;
        throw error;
    }
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
