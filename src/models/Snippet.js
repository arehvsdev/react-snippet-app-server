/**
 * Snippet Database Model
 * Core model representing user-submitted snippets, metadata fields, search indexes, and counters.
 */
const mongoose = require("mongoose");

const snippetSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ""
    },
    language: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
    },
    visibility: {
        type: String,
        enum: ["public", "private"],
        default: "public"
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
    bookmarksCount: {
        type: Number,
        default: 0
    },
    views: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, {
    timestamps: true
});

// Compound performance & filtering indexes
snippetSchema.index({ visibility: 1, createdBy: 1 });
snippetSchema.index({ visibility: 1, createdAt: -1 });
snippetSchema.index({ createdBy: 1, createdAt: -1 });
snippetSchema.index({ category: 1 });
snippetSchema.index({ language: 1 });
snippetSchema.index({ tags: 1 });
snippetSchema.index({ createdAt: -1 });
snippetSchema.index({ title: "text", description: "text", code: "text" });

module.exports = mongoose.model("Snippet", snippetSchema);