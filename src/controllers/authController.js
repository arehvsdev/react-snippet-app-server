/**
 * Auth Controller Module
 * Express request handlers for user registration, authentication, username checks, email verification, and password resets.
 */
const authService = require("../services/authService");

const isProduction = process.env.NODE_ENV === "production";

/**
 * Cookie configuration helper supporting local development over HTTP (secure: false, sameSite: "lax")
 * and production deployments over HTTPS (secure: true, sameSite: "none").
 */
const getCookieOptions = (maxAgeMs) => ({
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    ...(maxAgeMs ? { maxAge: maxAgeMs } : {})
});

/**
 * Handles new user registration request.
 */
const register = async (req, res, next) => {
    try {
        const user = await authService.register(req.body);
        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: user,
            user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Checks whether a proposed username is available.
 */
const checkUsername = async (req, res, next) => {
    try {
        const available = await authService.checkUsername(req.query.username);
        res.status(200).json({
            success: true,
            data: { available },
            available
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Handles user authentication / login and returns JWT session token.
 * Sets both accessToken and refreshToken in secure HttpOnly cookies.
 */
const login = async (req, res, next) => {
    try {
        const result = await authService.login(req.body);

        if (result.token) {
            res.cookie("accessToken", result.token, getCookieOptions(15 * 60 * 1000));
        }
        if (result.refreshToken) {
            res.cookie("refreshToken", result.refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));
        }

        res.status(200).json({
            success: true,
            data: result,
            token: result.token,
            user: result.user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Handles Google OAuth authentication via ID token.
 * Sets both accessToken and refreshToken in secure HttpOnly cookies.
 */
const googleLogin = async (req, res, next) => {
    try {
        const result = await authService.googleLogin(req.body);

        if (result.token) {
            res.cookie("accessToken", result.token, getCookieOptions(15 * 60 * 1000));
        }
        if (result.refreshToken) {
            res.cookie("refreshToken", result.refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));
        }

        res.status(200).json({
            success: true,
            data: result,
            token: result.token,
            user: result.user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/auth/me
 * Validates current JWT token and returns authenticated user profile.
 */
const getMe = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Not authorized, no session token provided"
            });
        }
        const user = await authService.getMe(userId);
        res.status(200).json({
            success: true,
            message: "User profile retrieved successfully",
            data: user,
            user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Verifies if user email exists in database.
 */
const verifyEmail = async (req, res, next) => {
    try {
        await authService.verifyEmail(req.body.email);
        res.status(200).json({
            success: true,
            message: "Email verified successfully"
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Generates password reset token and link for a user.
 */
const forgotPassword = async (req, res, next) => {
    try {
        const result = await authService.forgotPassword({ email: req.body.email, req });
        res.status(200).json({
            success: true,
            message: result.message,
            resetToken: result.resetToken,
            resetUrl: result.resetUrl
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Validates reset token validity and expiration.
 */
const validateResetToken = async (req, res, next) => {
    try {
        const token = req.query.token || req.body.token;
        const result = await authService.validateResetToken(token);
        if (!result.valid) {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }
        res.status(200).json({
            success: true,
            message: "Token is valid.",
            userEmail: result.userEmail
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Resets user password given valid token and new password credentials.
 */
const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword, password, email } = req.body;
        // Accept either newPassword or password field for maximum compatibility
        const pwd = newPassword || password;
        await authService.resetPasswordWithToken({ token, newPassword: pwd, email, req });
        res.status(200).json({
            success: true,
            message: "Password has been successfully reset. You may now login."
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Handles issuing new access token using HttpOnly refresh cookie (or body payload).
 * Refreshes both accessToken and refreshToken cookies.
 */
const refreshToken = async (req, res, next) => {
    try {
        const incomingToken = req.cookies?.refreshToken || req.body?.refreshToken;
        const result = await authService.refreshToken(incomingToken);

        if (result.token) {
            res.cookie("accessToken", result.token, getCookieOptions(15 * 60 * 1000));
        }
        if (result.refreshToken) {
            res.cookie("refreshToken", result.refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));
        }

        res.status(200).json({
            success: true,
            token: result.token
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Handles logging out user by revoking refresh token and clearing session cookies.
 */
const logout = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (userId) {
            await authService.logout(userId);
        }

        res.clearCookie("accessToken", getCookieOptions());
        res.clearCookie("refreshToken", getCookieOptions());

        res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/verify-email-token
 * Validates email verification token and marks user email as verified.
 */
const verifyEmailToken = async (req, res, next) => {
    try {
        const token = req.body?.token || req.query?.token;
        const result = await authService.verifyEmailToken(token);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/verify-code
 * Validates 6-digit email verification code and marks user email as verified.
 */
const verifyEmailCode = async (req, res, next) => {
    try {
        const { email, code } = req.body;
        const result = await authService.verifyEmailCode({ email, code });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/resend-verification-code
 * Generates and resends a fresh 6-digit verification code.
 */
const resendVerificationCode = async (req, res, next) => {
    try {
        const { email } = req.body;
        const result = await authService.resendVerificationCode({ email });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    checkUsername,
    getMe,
    verifyEmail,
    forgotPassword,
    validateResetToken,
    resetPassword,
    refreshToken,
    logout,
    verifyEmailToken,
    verifyEmailCode,
    resendVerificationCode,
    googleLogin
};
