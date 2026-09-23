/**
 * User Database Model
 * Represents registered user profiles, authentication credentials, roles, status flags, and subscription plans.
 */
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
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
        required: function () {
            return !this.googleId;
        }
    },
    phonenumber: {
        type: String,
        required: function () {
            return this.role !== "admin" && !this.googleId;
        }
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
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
    active: {
        type: Boolean,
        default: true
    },
    deleted: {
        type: Boolean,
        default: false
    },
    subscription: {
        plan: {
            type: String,
            enum: ["FREE", "PRO"],
            default: "FREE"
        },
        status: {
            type: String,
            default: "ACTIVE"
        },
        paymentId: {
            type: String,
            default: null
        },
        paymentDate: {
            type: Date,
            default: null
        }
    },
    refreshToken: {
        type: String,
        default: null,
        select: false
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationCode: {
        type: String,
        default: null,
        select: false,
        index: true
    },
    emailVerificationToken: {
        type: String,
        default: null,
        select: false,
        index: true
    },
    emailVerificationExpires: {
        type: Date,
        default: null,
        select: false
    },
    resetPasswordToken: {
        type: String,
        default: null,
        select: false,
        index: true
    },
    resetPasswordExpires: {
        type: Date,
        default: null,
        select: false
    },
    passwordChangedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Indexes for role-based querying and subscription plan filtering
userSchema.index({ role: 1 });
userSchema.index({ "subscription.plan": 1 });

module.exports = mongoose.model("User", userSchema);