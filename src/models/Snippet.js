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
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Snippet", snippetSchema);