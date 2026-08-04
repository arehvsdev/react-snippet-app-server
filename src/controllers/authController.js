/**
 * Auth Controller Module
 * Express request handlers for user registration, authentication, username checks, email verification, and password resets.
 */
const authService = require("../services/authService");

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
 */
const login = async (req, res, next) => {
    try {
        const result = await authService.login(req.body);
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
 * Resets user password given valid email and new password credentials.
 */
const resetPassword = async (req, res, next) => {
    try {
        await authService.resetPassword(req.body);
        res.status(200).json({
            success: true,
            message: "Password reset successful"
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    checkUsername,
    verifyEmail,
    resetPassword
};
