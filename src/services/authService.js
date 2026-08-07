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

    const { password: _, ...userWithoutPassword } = user.toObject();
    return userWithoutPassword;
};

const checkUsername = async (username) => {
    const exists = await User.findOne({ username: username.toLowerCase() });
    return !exists;
};

const login = async ({ email, password }) => {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || user.deleted) {
        const error = new Error("Invalid Credentials");
        error.statusCode = 400;
        throw error;
    }

    if (!user.active) {
        const error = new Error("Your account has been disabled. Please contact the administrator.");
        error.statusCode = 403;
        throw error;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
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

const verifyEmail = async (email) => {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
        const error = new Error("Email is not registered");
        error.statusCode = 404;
        throw error;
    }
    return true;
};

const resetPassword = async ({ email, password }) => {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();
    return true;
};

module.exports = {
    register,
    checkUsername,
    login,
    getMe,
    verifyEmail,
    resetPassword
};
