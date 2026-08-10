/**
 * Notification Routes Module
 * Express router endpoints for managing user notifications.
 */
const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const protect = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", notificationController.getUserNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.patch("/read-all", notificationController.markAllAsRead);
router.patch("/:id/read", notificationController.markAsRead);
router.delete("/:id", notificationController.deleteNotification);

module.exports = router;
