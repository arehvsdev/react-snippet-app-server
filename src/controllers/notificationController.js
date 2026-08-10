/**
 * Notification Controller Module
 * Express route handlers for fetching notifications, marking read status, and managing alerts.
 */
const notificationService = require("../services/notificationService");

const getUserNotifications = async (req, res, next) => {
    try {
        const notifications = await notificationService.getUserNotifications(req.user.id);
        const unreadCount = await notificationService.getUnreadCount(req.user.id);
        res.status(200).json({
            success: true,
            notifications,
            unreadCount
        });
    } catch (error) {
        next(error);
    }
};

const getUnreadCount = async (req, res, next) => {
    try {
        const unreadCount = await notificationService.getUnreadCount(req.user.id);
        res.status(200).json({
            success: true,
            unreadCount
        });
    } catch (error) {
        next(error);
    }
};

const markAsRead = async (req, res, next) => {
    try {
        const updated = await notificationService.markAsRead(req.params.id, req.user.id);
        res.status(200).json({
            success: true,
            message: "Notification marked as read",
            notification: updated
        });
    } catch (error) {
        next(error);
    }
};

const markAllAsRead = async (req, res, next) => {
    try {
        await notificationService.markAllAsRead(req.user.id);
        res.status(200).json({
            success: true,
            message: "All notifications marked as read"
        });
    } catch (error) {
        next(error);
    }
};

const deleteNotification = async (req, res, next) => {
    try {
        await notificationService.deleteNotification(req.params.id, req.user.id);
        res.status(200).json({
            success: true,
            message: "Notification deleted"
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getUserNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
};
