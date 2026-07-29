const mongoose = require("mongoose");

const tagSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    color: {
        type: String,
        default: "#3B82F6",
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

module.exports = mongoose.model("Tag", tagSchema);
