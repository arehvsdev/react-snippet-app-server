const adminService = require("../services/adminService");

const getDashboardSummary = async (req, res, next) => {
    try {
        const tzOffsetMinutes = req.query.tzOffset ? parseInt(req.query.tzOffset, 10) : 0;
        const summary = await adminService.getDashboardSummary(tzOffsetMinutes);
        res.status(200).json({
            success: true,
            data: summary
        });
    } catch (error) {
        next(error);
    }
};

const getDashboardUserGrowth = async (req, res, next) => {
    try {
        const months = req.query.months ? parseInt(req.query.months, 10) : 6;
        const growth = await adminService.getDashboardUserGrowth(months);
        res.status(200).json({
            success: true,
            data: growth
        });
    } catch (error) {
        next(error);
    }
};

const getDashboardSnippetLanguages = async (req, res, next) => {
    try {
        const languages = await adminService.getDashboardSnippetLanguages();
        res.status(200).json({
            success: true,
            data: languages
        });
    } catch (error) {
        next(error);
    }
};

const getDashboardWeeklyActivity = async (req, res, next) => {
    try {
        const activity = await adminService.getDashboardWeeklyActivity();
        res.status(200).json({
            success: true,
            data: activity
        });
    } catch (error) {
        next(error);
    }
};

const getDashboardRecentActivity = async (req, res, next) => {
    try {
        const recent = await adminService.getDashboardRecentActivity();
        res.status(200).json({
            success: true,
            data: recent
        });
    } catch (error) {
        next(error);
    }
};

const getUsers = async (req, res, next) => {
    try {
        const result = await adminService.getUsers(req.query);
        res.status(200).json({
            success: true,
            data: result.users,
            users: result.users,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

const updateUserRole = async (req, res, next) => {
    try {
        const updatedUser = await adminService.updateUserRole(req.params.id, req.body.role);
        res.status(200).json({
            success: true,
            message: "User role updated successfully",
            data: updatedUser,
            user: updatedUser
        });
    } catch (error) {
        next(error);
    }
};

const toggleUserStatus = async (req, res, next) => {
    try {
        const updatedUser = await adminService.toggleUserStatus(req.params.id, req.body.active);
        res.status(200).json({
            success: true,
            message: `User status updated to ${req.body.active ? 'active' : 'inactive'}`,
            data: updatedUser,
            user: updatedUser
        });
    } catch (error) {
        next(error);
    }
};

const deleteUser = async (req, res, next) => {
    try {
        await adminService.deleteUser(req.params.id);
        res.status(200).json({
            success: true,
            message: "User deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

const getUserById = async (req, res, next) => {
    try {
        const user = await adminService.getUserById(req.params.id);
        res.status(200).json({
            success: true,
            data: user,
            user
        });
    } catch (error) {
        next(error);
    }
};

const deleteAnySnippet = async (req, res, next) => {
    try {
        await adminService.deleteAnySnippet(req.params.id);
        res.status(200).json({
            success: true,
            message: "Snippet deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDashboardSummary,
    getDashboardUserGrowth,
    getDashboardSnippetLanguages,
    getDashboardWeeklyActivity,
    getDashboardRecentActivity,
    getUsers,
    getUserById,
    updateUserRole,
    toggleUserStatus,
    deleteUser,
    deleteAnySnippet
};
