const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Not authorised, no token"
        });
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, iat, exp }
        next();
    } catch {
        return res.status(401).json({
            success: false,
            message: "Not authorised, invalid token"
        });
    }
};

module.exports = protect;
