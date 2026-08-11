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

    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, { returnDocument: 'after', runValidators: true }).select("-password");
    if (!updatedUser) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    // Record Audit & Activity Logs for profile update
    const auditLogService = require("./auditLogService");
    const activityLogService = require("./activityLogService");

    await auditLogService.recordAuditLog({
        userId: updatedUser._id,
        userEmail: updatedUser.email,
        userName: updatedUser.name,
        type: "User",
        action: "UPDATE_PROFILE",
        resourceType: "User Profile",
        resourceId: updatedUser._id,
        resourceName: updatedUser.name,
        status: "Success",
        details: { name: updatedUser.name, username: updatedUser.username, bio: updatedUser.bio }
    });

    await activityLogService.logActivity({
        userId: updatedUser._id,
        actionType: "user_update_profile",
        description: `Profile updated for ${updatedUser.name} (@${updatedUser.username})`,
        details: { name: updatedUser.name, username: updatedUser.username }
    });

    return updatedUser;
};

const updateUserAvatar = async (userId, avatarData) => {
    const avatarUrl = typeof avatarData === "string" && avatarData.startsWith("data:")
        ? avatarData
        : (avatarData.startsWith("/uploads/") ? avatarData : `/uploads/avatars/${avatarData}`);

    const user = await User.findByIdAndUpdate(userId, { avatar: avatarUrl }, { returnDocument: 'after' }).select("-password");
    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    // Record Audit & Activity Logs for avatar update
    const auditLogService = require("./auditLogService");
    const activityLogService = require("./activityLogService");

    await auditLogService.recordAuditLog({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        type: "User",
        action: "UPDATE_AVATAR",
        resourceType: "User Profile",
        resourceId: user._id,
        resourceName: user.name,
        status: "Success",
        details: { avatarUpdated: true }
    });

    await activityLogService.logActivity({
        userId: user._id,
        actionType: "user_update_avatar",
        description: `Avatar image updated for ${user.name} (@${user.username})`,
        details: { avatarUpdated: true }
    });

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
    user.passwordChangedAt = new Date();
    await user.save();

    // Record Audit & Activity Logs for password change
    const auditLogService = require("./auditLogService");
    const activityLogService = require("./activityLogService");

    await auditLogService.recordAuditLog({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        type: "User",
        action: "CHANGE_PASSWORD",
        resourceType: "User Profile",
        resourceId: user._id,
        resourceName: user.name,
        status: "Success",
        details: { passwordChanged: true }
    });

    await activityLogService.logActivity({
        userId: user._id,
        actionType: "user_change_password",
        description: `Password changed for ${user.name} (@${user.username})`,
        details: { passwordChanged: true }
    });

    return true;
};

module.exports = {
    getUserProfile,
    updateUserProfile,
    updateUserAvatar,
    changePassword
};
