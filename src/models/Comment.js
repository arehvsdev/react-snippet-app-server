const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    snippetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Snippet', required: true },
    content: { type: String, required: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null }
}, {
    timestamps: true
});

module.exports = mongoose.model("Comment", commentSchema);
