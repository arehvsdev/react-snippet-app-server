const userService = require("../services/userService");

const getUserProfile = async (req, res, next) => {
    try {
        const user = await userService.getUserProfile(req.user.id);
        res.status(200).json({
            success: true,
            data: user,
            user
        });
    } catch (error) {
        next(error);
    }
};

const updateUserProfile = async (req, res, next) => {
    try {
        const updatedUser = await userService.updateUserProfile(req.user.id, req.body);
        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: updatedUser,
            user: updatedUser
        });
    } catch (error) {
        next(error);
    }
};

const updateUserAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: [{ field: "avatar", message: "Please upload an image file" }]
            });
        }

        // Convert image file buffer directly to Base64 Data URL string to store in DB
        const avatarData = req.file.buffer
            ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
            : `/uploads/avatars/${req.file.filename}`;

        const avatarUrl = await userService.updateUserAvatar(req.user.id, avatarData);
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

const changePassword = async (req, res, next) => {
    try {
        await userService.changePassword(req.user.id, req.body);
        res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getUserProfile,
    updateUserProfile,
    updateUserAvatar,
    changePassword
};
