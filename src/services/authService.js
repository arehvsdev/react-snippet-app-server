const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const generateAccessToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET || "default_secret_key_change_in_production_12345",
        { expiresIn: "15m" }
    );
};

const generateRefreshToken = (user) => {
    return jwt.sign(
        { id: user._id },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "default_secret_key_change_in_production_12345",
        { expiresIn: "7d" }
    );
};

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

    // Generate 6-digit verification code & dispatch confirmation email on new registration
    try {
        const crypto = require("crypto");
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const rawVerificationToken = crypto.randomBytes(32).toString("hex");
        const hashedVerificationToken = crypto.createHash("sha256").update(rawVerificationToken).digest("hex");

        user.emailVerificationCode = verificationCode;
        user.emailVerificationToken = hashedVerificationToken;
        user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        await user.save();

        const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
        const verificationUrl = `${clientUrl}/verify-email?email=${encodeURIComponent(user.email)}&code=${verificationCode}`;

        const emailService = require("./emailService");
        await emailService.sendVerificationEmail({
            email: user.email,
            name: user.name,
            verificationUrl,
            code: verificationCode
        });
    } catch (emailErr) {
        console.error("Failed to send registration verification email:", emailErr);
    }

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

    // Enforce email verification before allowing login
    if (!user.isEmailVerified) {
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
            details: { email: user.email, reason: "Email not verified" }
        });
        const error = new Error("Please verify your email address before logging in. A 6-digit verification code has been sent to your email.");
        error.statusCode = 403;
        error.isEmailNotVerified = true;
        error.email = user.email;
        throw error;
    }

    // Generate short-lived Access Token (15 min) and long-lived Refresh Token (7 days)
    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

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
    return { token, refreshToken, user: userWithoutPassword };
};

/**
 * Authenticates or registers a user via Google OAuth ID token.
 */
const googleLogin = async ({ credential }) => {
    if (!credential) {
        const error = new Error("Google credential token is required");
        error.statusCode = 400;
        throw error;
    }

    const { OAuth2Client } = require("google-auth-library");
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const client = new OAuth2Client(clientId);

    let ticket;
    try {
        ticket = await client.verifyIdToken({
            idToken: credential,
            audience: clientId || undefined,
        });
    } catch (verifyError) {
        console.error("Google token verification error:", verifyError.message);
        const error = new Error("Google authentication failed: Invalid or expired token");
        error.statusCode = 401;
        throw error;
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
        const error = new Error("Google profile information could not be retrieved");
        error.statusCode = 400;
        throw error;
    }

    const { sub: googleId, email, name, picture } = payload;
    const auditLogService = require("./auditLogService");
    const activityLogService = require("./activityLogService");
    const notificationService = require("./notificationService");

    let user = await User.findOne({
        $or: [{ googleId }, { email: email.toLowerCase() }]
    });

    let isNewUser = false;

    if (user) {
        if (user.deleted) {
            const error = new Error("This account has been deleted");
            error.statusCode = 400;
            throw error;
        }
        if (!user.active) {
            const error = new Error("Your account has been disabled. Please contact the administrator.");
            error.statusCode = 403;
            throw error;
        }

        // Link googleId if not linked yet
        if (!user.googleId) {
            user.googleId = googleId;
        }
        // Google accounts are inherently email-verified
        if (!user.isEmailVerified) {
            user.isEmailVerified = true;
        }
        // Update avatar if missing
        if (!user.avatar && picture) {
            user.avatar = picture;
        }
    } else {
        isNewUser = true;
        // Generate a clean, unique username
        let baseUsername = (email.split("@")[0] || "user").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
        if (!baseUsername) baseUsername = "user";
        let username = baseUsername;
        let counter = 1;
        while (await User.findOne({ username })) {
            username = `${baseUsername}${counter}`;
            counter++;
        }

        user = new User({
            name: name || baseUsername,
            username,
            email: email.toLowerCase(),
            googleId,
            avatar: picture || "",
            role: "developer",
            isEmailVerified: true,
            active: true
        });
    }

    // Issue JWTs
    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();

    if (isNewUser) {
        try {
            await notificationService.createNotification({
                recipient: user._id,
                type: "welcome",
                title: `Welcome to SnipForge, ${user.name}! 🎉`,
                message: "Thank you for joining SnipForge with Google! Explore public code snippets, build your library, and share code with developers.",
                link: "/snippet-feed"
            });

            await activityLogService.logActivity({
                userId: user._id,
                actionType: "user_register",
                description: `New user signed up via Google: ${user.name} (@${user.username})`,
                details: {
                    name: user.name,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    authProvider: "google"
                }
            });
        } catch (logErr) {
            console.error("Non-critical logging error during Google signup:", logErr.message);
        }
    }

    try {
        await auditLogService.recordAuditLog({
            userId: user._id,
            userEmail: user.email,
            userName: user.name,
            type: "Authentication",
            action: isNewUser ? "GOOGLE_SIGNUP" : "GOOGLE_LOGIN",
            resourceType: "User",
            resourceId: user._id,
            resourceName: user.name,
            status: "Success",
            details: { email: user.email, role: user.role }
        });
    } catch (auditErr) {
        console.error("Non-critical audit log error:", auditErr.message);
    }

    const { password: _, ...userWithoutPassword } = user.toObject();
    return { token, refreshToken, user: userWithoutPassword };
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
    const resetUrl = `${clientUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    const emailService = require("./emailService");
    try {
        await emailService.sendPasswordResetEmail({
            email: user.email,
            name: user.name,
            resetUrl
        });
    } catch (emailErr) {
        console.error("Failed to send password reset email:", emailErr);
    }

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

/**
 * Validates incoming refresh token, verifies user existence & DB matching token,
 * and issues a fresh Access Token and updated Refresh Token.
 */
const refreshToken = async (incomingRefreshToken) => {
    if (!incomingRefreshToken) {
        const error = new Error("Refresh token is required.");
        error.statusCode = 401;
        throw error;
    }

    let decoded;
    try {
        const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "default_secret_key_change_in_production_12345";
        decoded = jwt.verify(incomingRefreshToken, secret);
    } catch {
        const error = new Error("Invalid or expired refresh token. Please log in again.");
        error.statusCode = 403;
        throw error;
    }

    const user = await User.findById(decoded.id).select("+refreshToken");
    if (!user || user.deleted || !user.active || user.refreshToken !== incomingRefreshToken) {
        const error = new Error("Refresh token is invalid or has been revoked.");
        error.statusCode = 403;
        throw error;
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    return { token: newAccessToken, refreshToken: newRefreshToken };
};

/**
 * Revokes refresh token in database upon user logout.
 */
const logout = async (userId) => {
    if (!userId) return true;
    await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
    return true;
};

/**
 * Validates SHA-256 hashed verification token, marks isEmailVerified = true, and unsets token fields.
 */
const verifyEmailToken = async (rawToken) => {
    if (!rawToken || typeof rawToken !== "string") {
        const error = new Error("Verification token is required.");
        error.statusCode = 400;
        throw error;
    }

    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { $gt: Date.now() },
        deleted: { $ne: true }
    }).select("+emailVerificationToken +emailVerificationExpires");

    if (!user) {
        const error = new Error("Verification token is invalid or has expired.");
        error.statusCode = 400;
        throw error;
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return { success: true, message: "Your email address has been successfully verified!" };
};

/**
 * Validates 6-digit email verification code, marks isEmailVerified = true, and unsets code fields.
 */
const verifyEmailCode = async ({ email, code }) => {
    if (!email || !code) {
        const error = new Error("Email and 6-digit verification code are required.");
        error.statusCode = 400;
        throw error;
    }

    const cleanCode = String(code).trim();
    const user = await User.findOne({
        email: email.toLowerCase(),
        emailVerificationCode: cleanCode,
        emailVerificationExpires: { $gt: Date.now() },
        deleted: { $ne: true }
    }).select("+emailVerificationCode +emailVerificationExpires");

    if (!user) {
        const error = new Error("Invalid or expired 6-digit verification code.");
        error.statusCode = 400;
        throw error;
    }

    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationToken = undefined;
    await user.save();

    const auditLogService = require("./auditLogService");
    await auditLogService.recordAuditLog({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        type: "Authentication",
        action: "EMAIL_VERIFIED",
        resourceType: "User",
        resourceId: user._id,
        resourceName: user.name,
        status: "Success",
        details: { email: user.email }
    });

    return { success: true, message: "Your email address has been successfully verified! You can now log in." };
};

/**
 * Resends a fresh 6-digit verification code to user email.
 */
const resendVerificationCode = async ({ email }) => {
    if (!email) {
        const error = new Error("Email address is required.");
        error.statusCode = 400;
        throw error;
    }

    const user = await User.findOne({
        email: email.toLowerCase(),
        deleted: { $ne: true }
    });

    if (!user) {
        return { success: true, message: "If an account exists with that email, a new verification code has been sent." };
    }

    if (user.isEmailVerified) {
        return { success: true, message: "Your email is already verified. You can log in directly." };
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const verificationUrl = `${clientUrl}/verify-email?email=${encodeURIComponent(user.email)}&code=${verificationCode}`;

    const emailService = require("./emailService");
    await emailService.sendVerificationEmail({
        email: user.email,
        name: user.name,
        verificationUrl,
        code: verificationCode
    });

    return { success: true, message: "A new 6-digit verification code has been sent to your email." };
};

module.exports = {
    register,
    checkUsername,
    login,
    getMe,
    verifyEmail,
    forgotPassword,
    validateResetToken,
    resetPasswordWithToken,
    refreshToken,
    logout,
    verifyEmailToken,
    verifyEmailCode,
    resendVerificationCode,
    googleLogin
};
