/**
 * -------------------------------------------------------
 * paymentService.js
 * -------------------------------------------------------
 * Handles Razorpay payment operations.
 *
 * Responsibilities:
 * 1. Create Razorpay order
 * 2. Verify Razorpay payment signature
 * 3. Update user's subscription
 * 4. Store payment details in MongoDB
 *
 * This implementation is intended for learning purposes.
 * -------------------------------------------------------
 */

const crypto = require("crypto");
const User = require("../models/User");
const Payment = require("../models/Payment");
const { getRazorpayInstance, getRazorpayMode } = require("../config/razorpay");

/**
 * Gets payment integration status details.
 */
const getPaymentStatus = async () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    return {
        configured: Boolean(keyId && (process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET)),
        keyId: keyId || null,
        mode: getRazorpayMode(),
    };
};

/**
 * Creates a Razorpay order for the specified plan.
 * Only supports FREE and PRO plans.
 */
const createRazorpayOrder = async (userId, plan = "PRO") => {
    const uppercasePlan = plan ? String(plan).toUpperCase() : "PRO";

    if (uppercasePlan === "FREE") {
        const error = new Error("FREE plan does not require order creation");
        error.statusCode = 400;
        throw error;
    }

    if (uppercasePlan !== "PRO") {
        const error = new Error("Invalid plan selected. Only FREE and PRO plans are supported.");
        error.statusCode = 400;
        throw error;
    }

    const instance = getRazorpayInstance();
    const amount = 19900; // ₹199 in paise for PRO plan
    const currency = "INR";

    const options = {
        amount,
        currency,
        receipt: `receipt_order_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        notes: {
            userId: String(userId),
            plan: "PRO",
        },
    };

    const order = await instance.orders.create(options);

    // Persist Payment transaction record in database
    if (userId) {
        await Payment.create({
            user: userId,
            plan: "PRO",
            amount,
            currency,
            orderId: order.id,
            status: "CREATED",
            gateway: "RAZORPAY",
        });
    }

    return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
    };
};

/**
 * Verifies Razorpay HMAC signature.
 */
const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
    const secret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET;
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(body.toString())
        .digest("hex");

    return expectedSignature === signature;
};

/**
 * Verifies Razorpay payment signature and activates user PRO plan.
 */
const verifyPayment = async (userId, { orderId, paymentId, signature }) => {
    if (!orderId || !paymentId || !signature) {
        const error = new Error("Missing required payment verification parameters (orderId, paymentId, signature).");
        error.statusCode = 400;
        throw error;
    }

    const isValid = verifyRazorpaySignature({ orderId, paymentId, signature });
    if (!isValid) {
        if (userId) {
            await Payment.findOneAndUpdate(
                { orderId },
                { status: "FAILED", paymentId },
                { upsert: false }
            );
        }
        const error = new Error("Payment verification failed: Invalid Razorpay signature.");
        error.statusCode = 400;
        throw error;
    }

    const paymentDate = new Date();

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
            "subscription.plan": "PRO",
            "subscription.status": "ACTIVE",
            "subscription.paymentId": paymentId,
            "subscription.paymentDate": paymentDate,
        },
        { returnDocument: "after" }
    ).select("-password");

    if (!updatedUser) {
        const error = new Error("User profile not found.");
        error.statusCode = 404;
        throw error;
    }

    await Payment.findOneAndUpdate(
        { orderId },
        {
            status: "SUCCESS",
            paymentId,
            verified: true,
            signature,
        },
        { upsert: true, new: true }
    );

    return {
        user: updatedUser,
        subscription: updatedUser.subscription,
        paymentId,
        orderId,
    };
};

module.exports = {
    getPaymentStatus,
    createRazorpayOrder,
    verifyPayment,
};
