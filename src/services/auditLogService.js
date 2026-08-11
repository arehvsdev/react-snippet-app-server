/**
 * -------------------------------------------------------
 * auditLogService.js
 * -------------------------------------------------------
 * Handles recording and fetching system audit logs.
 * Includes automatic sensitive key sanitization & indexing.
 * -------------------------------------------------------
 */
const AuditLog = require("../models/AuditLog");
const User = require("../models/User");

// Sensitive keys that must NEVER be stored in audit logs
const SENSITIVE_KEYS = [
  "password",
  "confirmPassword",
  "token",
  "jwt",
  "secret",
  "apiKey",
  "creditCard",
  "cvv",
  "authorization",
  "auth"
];

/**
 * Sanitizes object metadata by stripping sensitive secrets/credentials.
 */
const sanitizeDetails = (obj) => {
  if (!obj || typeof obj !== "object") return {};
  const cleanObj = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some(s => lowerKey.includes(s))) {
      cleanObj[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      cleanObj[key] = sanitizeDetails(value);
    } else {
      cleanObj[key] = value;
    }
  }
  return cleanObj;
};

/**
 * Creates an AuditLog entry. Safe async execution so failure does not break primary API response.
 */
const recordAuditLog = async ({
  req = null,
  userId = null,
  userEmail = "",
  userName = "",
  action,
  type,
  resourceType = "System",
  resourceId = "",
  resourceName = "",
  status = "Success",
  details = {}
}) => {
  try {
    let resolvedEmail = userEmail;
    let resolvedName = userName;
    let finalUserId = userId;

    // Extract user info from req if available
    if (req && req.user) {
      finalUserId = finalUserId || req.user._id || req.user.id;
      resolvedEmail = resolvedEmail || req.user.email || "";
      resolvedName = resolvedName || req.user.name || req.user.username || "";
    }

    // Extract network metadata from request
    let ipAddress = "127.0.0.1";
    let userAgent = "Unknown";
    if (req) {
      ipAddress = req.headers["x-forwarded-for"] || req.ip || req.connection?.remoteAddress || "127.0.0.1";
      if (ipAddress.includes(",")) {
        ipAddress = ipAddress.split(",")[0].trim();
      }
      userAgent = req.headers["user-agent"] || "Unknown";
    }

    const cleanDetails = sanitizeDetails(details);

    const auditLog = await AuditLog.create({
      user: finalUserId || null,
      userName: resolvedName || "System / Guest",
      userEmail: resolvedEmail || "",
      action,
      type,
      resourceType,
      resourceId: String(resourceId || ""),
      resourceName: String(resourceName || ""),
      status,
      ipAddress,
      userAgent,
      details: cleanDetails,
    });

    return auditLog;
  } catch (err) {
    console.error("Failed to save audit log:", err);
    return null;
  }
};

/**
 * Retrieves paginated audit logs for admin inspection with search, type, and status filters.
 */
const getAuditLogs = async (query = {}) => {
  const { page = 1, limit = 15, type, status, search } = query;
  const filter = {};

  if (type && type !== "all") {
    filter.type = type;
  }

  if (status && status !== "all") {
    filter.status = status;
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), "i");
    filter.$or = [
      { userName: searchRegex },
      { userEmail: searchRegex },
      { action: searchRegex },
      { resourceType: searchRegex },
      { resourceName: searchRegex },
      { resourceId: searchRegex }
    ];
  }

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 15;
  const skip = (pageNum - 1) * limitNum;

  const total = await AuditLog.countDocuments(filter);

  const logs = await AuditLog.find(filter)
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
      pages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Retrieves single audit log by ID.
 */
const getAuditLogById = async (id) => {
  const log = await AuditLog.findById(id)
    .populate("user", "name username email avatar role")
    .lean();
  return log;
};

module.exports = {
  recordAuditLog,
  getAuditLogs,
  getAuditLogById,
};
