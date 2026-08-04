/**
 * Like Database Model
 * Stores likes for either snippets or comments to prevent duplicate like submissions.
 */
const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    targetType: {
        type: String,
        enum: ["Snippet", "Comment"],
        required: true
    }
}, {
    timestamps: true
});

// Enforce unique likes: a user can only like a target item once
likeSchema.index({ userId: 1, targetId: 1 }, { unique: true });
likeSchema.index({ targetId: 1, targetType: 1 });

module.exports = mongoose.model("Like", likeSchema);
