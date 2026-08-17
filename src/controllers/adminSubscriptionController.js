const subscriptionService = require("../services/subscriptionService");

/**
 * GET /api/admin/subscriptions
 * Returns all user subscriptions (all plans) with pagination.
 */
const getAllSubscriptions = async (req, res, next) => {
    try {
        const result = await subscriptionService.getAllSubscriptions(req.query);
        return res.status(200).json({
            success: true,
            data: result.subscriptions,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/admin/subscriptions/free
 * Returns all FREE plan users with pagination.
 */
const getFreeSubscriptions = async (req, res, next) => {
    try {
        const result = await subscriptionService.getAllSubscriptions({ ...req.query, plan: "FREE" });
        return res.status(200).json({
            success: true,
            data: result.subscriptions,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/admin/subscriptions/pro
 * Returns all PRO plan users with pagination.
 */
const getProSubscriptions = async (req, res, next) => {
    try {
        const result = await subscriptionService.getAllSubscriptions({ ...req.query, plan: "PRO" });
        return res.status(200).json({
            success: true,
            data: result.subscriptions,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/admin/subscriptions/stats
 * Returns overall subscription analytics and metrics.
 */
const getSubscriptionStats = async (req, res, next) => {
    try {
        const stats = await subscriptionService.getSubscriptionStats();
        return res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/admin/payments
 * Returns paginated list of all payment transactions for admin.
 */
const getAllPayments = async (req, res, next) => {
    try {
        const result = await subscriptionService.getAllPayments(req.query);
        return res.status(200).json({
            success: true,
            data: result.payments,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/admin/users/:id/subscription
 * Updates a user's subscription plan (PRO/FREE) or status (ACTIVE/INACTIVE).
 */
const updateUserSubscription = async (req, res, next) => {
    try {
        const user = await subscriptionService.updateUserSubscription(req.params.id, req.body);
        return res.status(200).json({
            success: true,
            message: "User subscription updated successfully",
            data: user
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllSubscriptions,
    getFreeSubscriptions,
    getProSubscriptions,
    getSubscriptionStats,
    getAllPayments,
    updateUserSubscription
};

