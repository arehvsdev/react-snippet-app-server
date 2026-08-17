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

    // Only include finalized payments (SUCCESS or FAILED) and exclude CREATED or PENDING orders
    const filter = {
        user: userId,
        status: { $in: ["SUCCESS", "FAILED", "success", "failed", "COMPLETED", "PAID"] }
    };

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
    const status = query.status && String(query.status).toUpperCase();
    const search = query.search && String(query.search).trim();

    // Build MongoDB filter
    const filter = { deleted: { $ne: true } };
    if (plan && plan !== "ALL") {
        filter["subscription.plan"] = plan;
    }
    if (status && status !== "ALL") {
        filter["subscription.status"] = status;
    }
    if (search) {
        filter["$or"] = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { username: { $regex: search, $options: "i" } }
        ];
    }

    const [users, total] = await Promise.all([
        User.find(filter)
            .select(
                "name username email role avatar subscription createdAt"
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

/**
 * Retrieves summary statistics for subscription analytics in admin dashboard.
 */
const getSubscriptionStats = async () => {
    const [totalProUsers, totalFreeUsers, activeProUsers, paymentAggregate, totalTransactions] = await Promise.all([
        User.countDocuments({ "subscription.plan": "PRO", deleted: { $ne: true } }),
        User.countDocuments({ "subscription.plan": "FREE", deleted: { $ne: true } }),
        User.countDocuments({ "subscription.plan": "PRO", "subscription.status": "ACTIVE", deleted: { $ne: true } }),
        Payment.aggregate([
            { $match: { status: { $in: ["SUCCESS", "COMPLETED", "PAID", "success"] } } },
            { $group: { _id: null, totalRevenue: { $sum: "$amount" } } }
        ]),
        Payment.countDocuments()
    ]);

    // Razorpay amounts are in paisa, convert to Rupees for revenue reporting
    const rawRevenue = paymentAggregate.length > 0 ? paymentAggregate[0].totalRevenue : 0;
    const totalRevenue = rawRevenue > 0 ? (rawRevenue / 100) : 0;

    return {
        totalProUsers,
        totalFreeUsers,
        activeProUsers,
        totalRevenue,
        totalTransactions
    };
};

/**
 * Retrieves paginated payment transactions for admin table.
 */
const getAllPayments = async (query = {}) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Number(query.limit) || 20);
    const skip = (page - 1) * limit;
    const status = query.status && String(query.status).toUpperCase();
    const search = query.search && String(query.search).trim();

    const filter = {};
    if (status && status !== "ALL") {
        filter.status = status;
    }

    if (search) {
        // Search by orderId or paymentId
        filter["$or"] = [
            { orderId: { $regex: search, $options: "i" } },
            { paymentId: { $regex: search, $options: "i" } }
        ];
    }

    const [payments, total] = await Promise.all([
        Payment.find(filter)
            .populate("user", "name email username avatar role")
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
 * Admin action to update a user's subscription plan/status.
 */
const updateUserSubscription = async (userId, data = {}) => {
    const user = await User.findById(userId);
    if (!user) {
        const error = new Error("User not found.");
        error.statusCode = 404;
        throw error;
    }

    if (data.plan) {
        user.subscription.plan = data.plan.toUpperCase();
    }
    if (data.status) {
        user.subscription.status = data.status.toUpperCase();
    }
    if (data.plan === "PRO" && !user.subscription.paymentDate) {
        user.subscription.paymentDate = new Date();
    }

    await user.save();
    return user;
};

module.exports = {
    getMySubscription,
    getPaymentHistory,
    getAllSubscriptions,
    getSubscriptionStats,
    getAllPayments,
    updateUserSubscription
};

