/**
 * Email Log Model
 * Tracks all outgoing transactional emails dispatched by the system (Verification, Password Reset, Subscriptions).
 */
const mongoose = require("mongoose");

const emailLogSchema = new mongoose.Schema({
    to: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    subject: {
        type: String,
        required: true
    },
    emailType: {
        type: String,
        enum: ["VERIFICATION", "PASSWORD_RESET", "SUBSCRIPTION_CONFIRMATION", "GENERAL"],
        required: true
    },
    status: {
        type: String,
        enum: ["SENT", "FAILED"],
        default: "SENT"
    },
    messageId: {
        type: String,
        default: null
    },
    previewUrl: {
        type: String,
        default: null
    },
    error: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

emailLogSchema.index({ to: 1, createdAt: -1 });
emailLogSchema.index({ emailType: 1 });

module.exports = mongoose.model("EmailLog", emailLogSchema);
