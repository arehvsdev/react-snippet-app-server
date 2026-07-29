/**
 * Comment Database Model
 * Stores parent comments and nested replies left on individual code snippets.
 */
const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
    // User who wrote the comment
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Snippet on which this comment is left
    snippetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Snippet', required: true },
    // Text body contents of the comment/reply
    content: { type: String, required: true },
    // Parent comment ID, used if this comment is a reply (self-referential)
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null }
}, {
    timestamps: true
});

module.exports = mongoose.model("Comment", commentSchema);
