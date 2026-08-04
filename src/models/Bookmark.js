const mongoose = require("mongoose");

const bookmarkSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    snippetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Snippet', required: true }
}, {
    timestamps: true
});

// Ensure a user can only bookmark a snippet once
bookmarkSchema.index({ userId: 1, snippetId: 1 }, { unique: true });
bookmarkSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Bookmark", bookmarkSchema);
