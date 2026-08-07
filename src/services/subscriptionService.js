/**
 * -------------------------------------------------------
 * subscriptionService.js
 * -------------------------------------------------------
 * Handles subscription-related operations.
 *
 * Responsibilities:
 * 1. Get logged-in user's subscription
 * 2. Get payment history
 * 3. Get all subscriptions (Admin)
 *
 * This service only communicates with MongoDB.
 * Business logic related to payment is handled
 * inside paymentService.js.
 * -------------------------------------------------------
 */
const User = require("../models/User");
const Payment = require("../models/Payment");

/**
 * Retrieves the current subscription details for the authenticated user.
 */
const getMySubscription = async (userId) => {
    const user = await User.findById(userId).select("name username email subscription");
    if (!user) {
        const error = new Error("User not found.");
        error.statusCode = 404;
        throw error;
    }
    return user;
};

/**
 * Retrieves paginated payment history for the authenticated user.
 */
const getPaymentHistory = async (userId, query = {}) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Number(query.limit) || 10);
    const skip = (page - 1) * limit;

    const filter = { user: userId };

    const [payments, total] = await Promise.all([
        Payment.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Payment.countDocuments(filter)
    ]);

    return {
        payments,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        }
    };
};

/**
 * Retrieves all user subscriptions with pagination for admin (all plans).
 */
const getAllSubscriptions = async (query = {}) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Number(query.limit) || 20);
    const skip = (page - 1) * limit;
    const plan = query.plan && String(query.plan).toUpperCase();

    // Build MongoDB filter
    const filter = {};
    if (plan) {
        filter["subscription.plan"] = plan;
    }

    const [users, total] = await Promise.all([
        User.find(filter)
            .select(
                "name username email role subscription createdAt"
            )
            .sort({ 
                "subscription.plan": -1, createdAt: -1 
            })
            .skip(skip)
            .limit(limit)
            .lean(),
        User.countDocuments(filter)
    ]);

    return {
        subscriptions: users,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        }
    };
};

module.exports = {
    getMySubscription,
    getPaymentHistory,
    getAllSubscriptions
};
