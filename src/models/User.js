/**
 * User Database Model
 * Represents registered user profiles, authentication credentials, roles, and status flags.
 */
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name : {
        type: String,
        required: true
    },
    username: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true
    },
    email: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    phonenumber: {
        type: String,
        required: function () {
            return this.role !== "admin";
        }
    },
    role: {
        type: String,
        enum: ["admin", "developer", "student", "mentor", "recruiter"],
        default: "developer"
    },
    bio: {
        type: String,
        default: ""
    },
    avatar: {
        type: String,
        default: ""
    },
    dialogflowSessionId: {
        type: String
    },
    active: {
        type: Boolean,
        default: true
    },
    deleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for role-based querying
userSchema.index({ role: 1 });

module.exports = mongoose.model("User", userSchema);