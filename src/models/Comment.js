/**
 * Comment Database Model
 * Stores parent comments and nested replies left on individual code snippets.
 */
const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    snippetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Snippet', required: true },
    content: { type: String, required: true, trim: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null }
}, {
    timestamps: true
});

// Performance query indexes for comment listing and threaded reply lookups
commentSchema.index({ snippetId: 1, createdAt: 1 });
commentSchema.index({ parentId: 1 });

module.exports = mongoose.model("Comment", commentSchema);
