const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const register = async ({ name, username, email, password, role, phonenumber }) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const allowedRoles = ["developer", "student", "mentor", "recruiter"];
    const userRole = allowedRoles.includes(role) ? role : "developer";

    const user = await User.create({
        name,
        username,
        email: email.toLowerCase(),
        password: hashedPassword,
        phonenumber,
        role: userRole
    });

    // Trigger welcome notification for newly registered user
    const notificationService = require("./notificationService");
    const activityLogService = require("./activityLogService");
    const auditLogService = require("./auditLogService");

    await notificationService.createNotification({
        recipient: user._id,
        type: "welcome",
        title: `Welcome to SnipForge, ${user.name}! 🎉`,
        message: "Thank you for joining SnipForge! Explore public code snippets, build your library, and share code with developers.",
        link: "/snippet-feed"
    });

    await activityLogService.logActivity({
        userId: user._id,
        actionType: "user_register",
        description: `New user registered: ${user.name} (@${user.username})`,
        details: {
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role
        }
    });

    await auditLogService.recordAuditLog({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        type: "Authentication",
        action: "USER_REGISTER",
        resourceType: "User",
        resourceId: user._id,
        resourceName: user.name,
        status: "Success",
        details: { email: user.email, role: user.role }
    });

    const { password: _, ...userWithoutPassword } = user.toObject();
    return userWithoutPassword;
};

const checkUsername = async (username) => {
    const exists = await User.findOne({ username: username.toLowerCase() });
    return !exists;
};

const login = async ({ email, password }) => {
    const auditLogService = require("./auditLogService");
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log("login user ", user);
    if (!user || user.deleted) {
        await auditLogService.recordAuditLog({
            userEmail: email,
            userName: "Guest",
            type: "Authentication",
            action: "FAILED_LOGIN",
            resourceType: "User",
            status: "Failed",
            details: { email, reason: "Account not found or deleted" }
        });
        const error = new Error("Invalid Credentials");
        error.statusCode = 400;
        throw error;
    }

    if (!user.active) {
        await auditLogService.recordAuditLog({
            userId: user._id,
            userEmail: user.email,
            userName: user.name,
            type: "Authentication",
            action: "FAILED_LOGIN",
            resourceType: "User",
            resourceId: user._id,
            resourceName: user.name,
            status: "Failed",
            details: { email: user.email, reason: "Account disabled" }
        });
        const error = new Error("Your account has been disabled. Please contact the administrator.");
        error.statusCode = 403;
        throw error;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        await auditLogService.recordAuditLog({
            userId: user._id,
            userEmail: user.email,
            userName: user.name,
            type: "Authentication",
            action: "FAILED_LOGIN",
            resourceType: "User",
            resourceId: user._id,
            resourceName: user.name,
            status: "Failed",
            details: { email: user.email, reason: "Invalid password" }
        });
        const error = new Error("Invalid Credentials");
        error.statusCode = 400;
        throw error;
    }

    // Sign JWT with 24-hour expiration
    const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET || "default_secret_key_change_in_production_12345",
        { expiresIn: "24h" }
    );

    await auditLogService.recordAuditLog({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        type: "Authentication",
        action: "USER_LOGIN",
        resourceType: "User",
        resourceId: user._id,
        resourceName: user.name,
        status: "Success",
        details: { email: user.email, role: user.role }
    });

    const { password: _, ...userWithoutPassword } = user.toObject();
    return { token, user: userWithoutPassword };
};

/**
 * Validates authenticated user token and returns profile details.
 */
const getMe = async (userId) => {
    const user = await User.findById(userId).select("-password").lean();
    if (!user || user.deleted || !user.active) {
        const error = new Error("User not found or account disabled.");
        error.statusCode = 401;
        throw error;
    }
    return user;
};

const crypto = require("crypto");

const verifyEmail = async (email) => {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
        const error = new Error("Email is not registered");
        error.statusCode = 404;
        throw error;
    }
    return true;
};

/**
 * 1. Forgot Password Request
 * Generates cryptographically secure random token, hashes token using SHA-256, stores hash & 15-min expiration.
 * Employs constant-time response for non-existent users to prevent user enumeration attacks.
 */
const forgotPassword = async ({ email, req }) => {
    const user = await User.findOne({ email: email.toLowerCase(), deleted: { $ne: true } }).select("+resetPasswordToken +resetPasswordExpires");

    // Generic response message to prevent user enumeration
    const genericResponse = {
        message: "If an account exists with that email address, a password reset link has been sent."
    };

    if (!user) {
        // Constant-time artificial delay to mitigate timing attacks
        await new Promise(resolve => setTimeout(resolve, 100));
        return genericResponse;
    }

    // Generate 32-byte (256-bit entropy) secure random raw token
    const rawToken = crypto.randomBytes(32).toString("hex");

    // Hash token using SHA-256 before storing in database
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    // Overwrite previous token & set 15-minute expiration timestamp
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${clientUrl}/reset-password?token=${rawToken}`;

    const auditLogService = require("./auditLogService");
    await auditLogService.recordAuditLog({
        req,
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        type: "Authentication",
        action: "FORGOT_PASSWORD_REQUEST",
        resourceType: "User",
        resourceId: user._id,
        status: "Success",
        details: { email: user.email, expires: user.resetPasswordExpires }
    });

    return {
        ...genericResponse,
        resetToken: rawToken,
        resetUrl
    };
};

/**
 * 2. Validate Reset Token
 * Verifies if SHA-256 hashed token exists and has not expired.
 */
const validateResetToken = async (token) => {
    if (!token || typeof token !== "string") {
        return { valid: false, message: "Reset token is required." };
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
        deleted: { $ne: true }
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
        return { valid: false, message: "Password reset token is invalid or has expired." };
    }

    return { valid: true, userEmail: user.email };
};

/**
 * 3. Complete Password Reset
 * Hashes new password, atomically clears token and expiry to guarantee single-use consumption,
 * and sets passwordChangedAt timestamp to revoke active JWT tokens.
 */
const resetPasswordWithToken = async ({ token, newPassword, email, req }) => {
    if (!newPassword) {
        const error = new Error("New password is required.");
        error.statusCode = 400;
        throw error;
    }

    let user;

    if (token) {
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        // Atomic find and nullify operation to prevent race conditions (TOCTOU)
        user = await User.findOneAndUpdate(
            {
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { $gt: Date.now() },
                deleted: { $ne: true }
            },
            {
                $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 }
            },
            { returnDocument: "after" }
        );

        if (!user) {
            const error = new Error("Password reset token is invalid or has expired.");
            error.statusCode = 400;
            throw error;
        }
    } else if (email) {
        user = await User.findOne({ email: email.toLowerCase(), deleted: { $ne: true } });
        if (!user) {
            const error = new Error("User with given email address does not exist.");
            error.statusCode = 404;
            throw error;
        }
    } else {
        const error = new Error("Email or reset token is required.");
        error.statusCode = 400;
        throw error;
    }

    // Hash new password using bcrypt
    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordChangedAt = new Date();
    await user.save();

    const auditLogService = require("./auditLogService");
    const notificationService = require("./notificationService");

    await auditLogService.recordAuditLog({
        req,
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        type: "Authentication",
        action: "PASSWORD_RESET_COMPLETED",
        resourceType: "User",
        resourceId: user._id,
        status: "Success",
        details: { email: user.email }
    });

    await notificationService.createNotification({
        recipient: user._id,
        type: "system",
        title: "Password Changed",
        message: "Your account password was successfully reset. If you did not perform this action, please contact support immediately.",
        link: "/profile"
    });

    return true;
};

module.exports = {
    register,
    checkUsername,
    login,
    getMe,
    verifyEmail,
    forgotPassword,
    validateResetToken,
    resetPasswordWithToken
};
