/**
 * Notification Service Module
 * Handles database operations for notification creation, unread sorting, and status updates.
 */
const Notification = require("../models/Notification");

/**
 * Creates a notification for a recipient.
 */
const createNotification = async ({ recipient, sender, type, title, message, link, snippetId }) => {
    try {
        return await Notification.create({
            recipient,
            sender: sender || null,
            type: type || "system",
            title,
            message,
            link: link || "",
            snippetId: snippetId || null,
            isRead: false
        });
    } catch (err) {
        console.error("Error creating notification:", err);
    }
};

/**
 * Gets user notifications sorted so unread notifications (isRead: false) are at the top,
 * followed by read notifications sorted by creation date descending.
 */
const getUserNotifications = async (userId) => {
    const notifications = await Notification.find({ recipient: userId })
        .populate("sender", "name username avatar")
        .populate("snippetId", "title")
        .sort({ isRead: 1, createdAt: -1 })
        .lean();

    return notifications.map(n => ({
        ...n,
        id: String(n._id)
    }));
};

/**
 * Gets count of unread notifications for user.
 */
const getUnreadCount = async (userId) => {
    return Notification.countDocuments({ recipient: userId, isRead: false });
};

/**
 * Marks a notification as read.
 */
const markAsRead = async (notificationId, userId) => {
    return Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { isRead: true },
        { new: true }
    );
};

/**
 * Marks all notifications for user as read.
 */
const markAllAsRead = async (userId) => {
    return Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true }
    );
};

/**
 * Deletes a single notification.
 */
const deleteNotification = async (notificationId, userId) => {
    return Notification.deleteOne({ _id: notificationId, recipient: userId });
};

module.exports = {
    createNotification,
    getUserNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
};
