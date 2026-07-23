const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
    sender: {
        type: String,
        enum: ["user", "bot"],
        required: true
    },
    text: {
        type: String,
        required: true
    },
    intentName: {
        type: String
    },
    confidence: {
        type: Number
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const chatSessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false // guest users can interact with chatbot too
    },
    sessionId: {
        type: String,
        required: true,
        unique: true
    },
    messages: [chatMessageSchema]
}, {
    timestamps: true
});

module.exports = mongoose.model("ChatSession", chatSessionSchema);
