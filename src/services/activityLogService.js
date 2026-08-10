/**
 * -------------------------------------------------------
 * activityLogService.js
 * -------------------------------------------------------
 * Handles recording and fetching system activity audit logs.
 * -------------------------------------------------------
 */
const ActivityLog = require("../models/ActivityLog");
const User = require("../models/User");

/**
 * Creates an activity log entry. Safely handles errors so main workflow is not disrupted.
 */
const logActivity = async ({ userId, actionType, description, details = {}, ipAddress = "" }) => {
  try {
    const log = await ActivityLog.create({
      user: userId || null,
      actionType,
      description,
      details,
      ipAddress,
    });
    return log;
  } catch (err) {
    console.error("Failed to save activity log:", err);
    return null;
  }
};

/**
 * Retrieves paginated activity logs for admin inspection with search and actionType filters.
 */
const getActivityLogs = async (query = {}) => {
  const { page = 1, limit = 15, actionType, search } = query;
  const filter = {};

  if (actionType && actionType !== "all") {
    filter.actionType = actionType;
  }

  let userMatchIds = null;
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), "i");

    // Search matching users first
    const matchedUsers = await User.find({
      $or: [
        { name: searchRegex },
        { username: searchRegex },
        { email: searchRegex },
      ],
    }).select("_id");

    userMatchIds = matchedUsers.map((u) => u._id);

    filter.$or = [
      { description: searchRegex },
      { "details.title": searchRegex },
      { "details.email": searchRegex },
      { "details.username": searchRegex },
      { user: { $in: userMatchIds } },
    ];
  }

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 15;
  const skip = (pageNum - 1) * limitNum;

  const total = await ActivityLog.countDocuments(filter);

  const logs = await ActivityLog.find(filter)
    .populate("user", "name username email avatar role")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  return {
    logs,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    },
  };
};

module.exports = {
  logActivity,
  getActivityLogs,
};
