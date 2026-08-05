/**
 * Payment Database Model
 * Represents transactions for subscriptions, orders, and payment gateway responses.
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
        required: true,
        default: "PRO"
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: "INR"
    },
    paymentId: {
        type: String,
        default: null
    },
    orderId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["CREATED", "SUCCESS", "FAILED"],
        default: "CREATED"
    },
    gateway: {
        type: String,
        default: "RAZORPAY"
    }
}, {
    timestamps: true
});

// Indexes for fast lookup by user, orderId, paymentId, status, and creation date
paymentSchema.index({ user: 1 });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ paymentId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);
