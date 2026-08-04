const User = require("../models/User");
const bcrypt = require("bcryptjs");

const getUserProfile = async (userId) => {
    const user = await User.findById(userId).select("-password");
    if (!user) {
        const error = new Error("User profile not found");
        error.statusCode = 404;
        throw error;
    }
    return user;
};

const updateUserProfile = async (userId, data) => {
    const { name, username, phonenumber, bio } = data;

    if (username) {
        const existing = await User.findOne({ username: username.toLowerCase(), _id: { $ne: userId } });
        if (existing) {
            const error = new Error("Username is already in use");
            error.statusCode = 400;
            throw error;
        }
    }

    const updateFields = {};
    if (name) updateFields.name = name;
    if (username) updateFields.username = username.toLowerCase();
    if (phonenumber !== undefined) updateFields.phonenumber = phonenumber;
    if (bio !== undefined) updateFields.bio = bio;

    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, { new: true, runValidators: true }).select("-password");
    if (!updatedUser) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }
    return updatedUser;
};

const updateUserAvatar = async (userId, fileFilename) => {
    const avatarUrl = `/uploads/avatars/${fileFilename}`;
    const user = await User.findByIdAndUpdate(userId, { avatar: avatarUrl }, { new: true }).select("-password");
    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }
    return avatarUrl;
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
    const user = await User.findById(userId);
    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
        const error = new Error("Current password is incorrect");
        error.statusCode = 400;
        throw error;
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    return true;
};

module.exports = {
    getUserProfile,
    updateUserProfile,
    updateUserAvatar,
    changePassword
};
