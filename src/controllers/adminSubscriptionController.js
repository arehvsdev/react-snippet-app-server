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

module.exports = {
    getAllSubscriptions,
    getFreeSubscriptions,
    getProSubscriptions
};
