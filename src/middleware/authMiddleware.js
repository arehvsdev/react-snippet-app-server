/**
 * Authentication and Authorization Middleware Module
 * Provides JWT validation and role-based access control.
 */
const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Protect middleware: Verifies JWT session token in Authorization header.
 * Attaches decoded user object to request upon successful authentication.
 * Revokes access if user password was changed after JWT was issued.
 */
const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Not authorized, no session token provided",
            errors: null
        });
    }

    const token = authHeader.split(" ")[1];
    try {
        const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? undefined : "default_secret_key_change_in_production_12345");
        if (!secret) {
            throw new Error("JWT_SECRET is not configured");
        }
        const decoded = jwt.verify(token, secret);

        // Fetch user from DB to verify active status and passwordChangedAt timestamp
        const user = await User.findById(decoded.id).select("+passwordChangedAt");
        if (!user || user.deleted || !user.active) {
            return res.status(401).json({
                success: false,
                message: "Not authorized, account unavailable or disabled",
                errors: null
            });
        }

        // Invalidate JWT if password was changed after JWT was issued
        if (user.passwordChangedAt) {
            const passwordChangedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
            if (decoded.iat && decoded.iat < passwordChangedTimestamp) {
                return res.status(401).json({
                    success: false,
                    message: "Password was recently updated. Please log in again.",
                    errors: null
                });
            }
        }

        req.user = decoded; // { id, role, iat, exp }
        req.userDoc = user;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Session expired, please log in again",
                errors: null
            });
        }
        return res.status(401).json({
            success: false,
            message: "Not authorized, invalid session token",
            errors: null
        });
    }
};

/**
 * AdminOnly middleware: Restricts route access to users with the 'admin' role.
 */
const adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Administrator privileges required.",
            errors: null
        });
    }
    next();
};

module.exports = protect;
module.exports.protect = protect;
module.exports.adminOnly = adminOnly;
