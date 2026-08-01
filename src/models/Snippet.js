/**
 * Snippet Database Model
 * Core model representing user-submitted snippets, metadata fields, search indexes, and counters.
 */
const mongoose = require("mongoose");

const snippetSchema = new mongoose.Schema({
    // Descriptive title of the snippet
    title: String,
    // Brief explanation or context for the snippet
    description: String,
    // Coding language of the snippet (e.g. JavaScript, Go, Python)
    language: String,
    // Text value representing coding contents
    code: String,
    // List of searchable tags
    tags: [String],
    // Optional category reference
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
    },
    // Visibility setting determines access permissions
    visibility: {
        type: String,
        enum: ["public", "private"],
        default: "public"
    },
    // Vector embeddings used for semantic search tasks
    embeddings: {
        type: [Number],
        default: []
    },
    // Automated AI-generated text summary
    aiSummary: {
        type: String
    },
    // Heart likes count cache
    likes: {
        type: Number,
        default: 0
    },
    // Bookmarks count cache
    bookmarksCount: {
        type: Number,
        default: 0
    },
    // Views statistic counter
    views: {
        type: Number,
        default: 0
    },
    // Author reference of the snippet
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, {
    timestamps: true
});

// Search and performance query indexes
snippetSchema.index({ visibility: 1, createdBy: 1 });
snippetSchema.index({ category: 1 });
snippetSchema.index({ language: 1 });
snippetSchema.index({ tags: 1 });
snippetSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Snippet", snippetSchema);