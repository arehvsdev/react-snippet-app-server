const mongoose = require("mongoose");

const languageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    icon: {
        type: String,
        required: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Language", languageSchema);
