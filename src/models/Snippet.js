const mongoose = require("mongoose");

const snippetSchema = new mongoose.Schema({
    title: String,
    description: String,
    language: String,
    code: String,
    tags: [String],
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
    },
    visibility: {
        type: String,
        enum: ["public", "private"],
        default: "private"
    },
    embeddings: {
        type: [Number],
        default: []
    },
    aiSummary: {
        type: String
    },
    likes: {
        type: Number,
        default: 0
    },
    views: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Snippet", snippetSchema);