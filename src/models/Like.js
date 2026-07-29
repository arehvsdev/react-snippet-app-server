/**
 * Like Database Model
 * Stores likes for either snippets or comments to prevent duplicate like submissions.
 */
const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema({
    // Reference to the user who liked the target item
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    // Reference to the liked item (Snippet or Comment)
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    // The type of document being liked
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

module.exports = mongoose.model("Like", likeSchema);
