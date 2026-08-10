/**
 * Notification Database Model
 * Stores user notifications for welcome messages, comment alerts, and system events.
 */
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    type: {
        type: String,
        enum: ["welcome", "comment", "like", "system"],
        default: "system"
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    link: {
        type: String,
        default: ""
    },
    snippetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Snippet"
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    }
}, {
    timestamps: true
});

// Performance index for unread-first sorting
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
