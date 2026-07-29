const User = require("../models/User");

/**
 * GET /api/users/profile
 * Retrieve authenticated user profile details
 */
const getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
                errors: null
            });
        }

        res.status(200).json({
            success: true,
            data: user,
            user
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/users/profile
 * Update authenticated user profile details
 */
const updateUserProfile = async (req, res, next) => {
    try {
        const { name, phonenumber, bio } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
                errors: null
            });
        }

        if (name !== undefined) user.name = name;
        if (phonenumber !== undefined) user.phonenumber = phonenumber;
        if (bio !== undefined) user.bio = bio;

        const updatedUser = await user.save();
        const { password: _, ...userWithoutPassword } = updatedUser.toObject();

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: userWithoutPassword,
            user: userWithoutPassword
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PATCH /api/users/avatar
 * Update authenticated user avatar (file upload)
 */
const updateUserAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: [{ field: "avatar", message: "Please upload an avatar image file" }]
            });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
                errors: null
            });
        }

        const avatarUrl = `${req.protocol}://${req.get("host")}/uploads/avatars/${req.file.filename}`;
        
        user.avatar = avatarUrl;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Avatar updated successfully",
            data: { avatar: avatarUrl },
            avatar: avatarUrl
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getUserProfile,
    updateUserProfile,
    updateUserAvatar
};
