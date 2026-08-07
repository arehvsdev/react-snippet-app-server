/**
 * Payment Model
 * Stores Razorpay payment information for educational purposes.
 */

const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    plan: {
        type: String,
        enum: ["FREE", "PRO"],
        default: "PRO",
        required: true
    },

    amount: {
        type: Number,
        required: true
    },

    currency: {
        type: String,
        default: "INR"
    },

    gateway: {
        type: String,
        default: "RAZORPAY"
    },

    orderId: {
        type: String,
        required: true,
        unique: true
    },

    paymentId: {
        type: String,
        default: null
    },

    signature: {
        type: String,
        default: null
    },

    status: {
        type: String,
        enum: [
            "CREATED",
            "SUCCESS",
            "FAILED"
        ],
        default: "CREATED"
    },

    verified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

paymentSchema.index({
    user: 1
});
paymentSchema.index({
    paymentId: 1
});
paymentSchema.index({
    status: 1
});
paymentSchema.index({
    createdAt: -1
});

module.exports = mongoose.model("Payment", paymentSchema);