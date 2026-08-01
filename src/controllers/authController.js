const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const register = async (req, res, next) => {
    try {
        const {
            name, username, email, password, role, phonenumber
        } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const allowedRoles = ["developer", "student", "mentor", "recruiter"];
        const userRole = allowedRoles.includes(role) ? role : "developer";

        const user = await User.create({
            name,
            username,
            email,
            password: hashedPassword,
            phonenumber,
            role: userRole
        });

        const { password: _, ...userWithoutPassword } = user.toObject();

        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: userWithoutPassword,
            user: userWithoutPassword
        });
    } catch (error) {
        next(error);
    }
};

const checkUsername = async (req, res, next) => {
    try {
        const { username } = req.query;

        const exists = await User.findOne({ username: username.toLowerCase() });

        res.status(200).json({
            success: true,
            data: { available: !exists },
            available: !exists
        });
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const user = await User.findOne({
            email: req.body.email
        });

        if (!user || user.deleted) {
            return res.status(400).json({
                success: false,
                message: "Invalid Credentials",
                errors: null
            });
        }

        if (!user.active) {
            return res.status(403).json({
                success: false,
                message: "Your account has been disabled. Please contact the administrator.",
                errors: null
            });
        }

        const valid = await bcrypt.compare(
            req.body.password,
            user.password
        );

        if (!valid) {
            return res.status(400).json({
                success: false,
                message: "Invalid Credentials",
                errors: null
            });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        const { password: _, ...userWithoutPassword } = user.toObject();

        res.status(200).json({
            success: true,
            data: {
                token,
                user: userWithoutPassword
            },
            token,
            user: userWithoutPassword
        });
    } catch (error) {
        next(error);
    }
};

const verifyEmail = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Email is not registered"
            });
        }
        res.status(200).json({
            success: true,
            message: "Email verified successfully"
        });
    } catch (error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#\.])[A-Za-z\d@$!%*?&#\.]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters, and include at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#.)."
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        user.password = await bcrypt.hash(password, 10);
        await user.save();

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
