const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret_key_change_in_production_12345");
        req.user = decoded; // { id, role, iat, exp }
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
