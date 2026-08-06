/**
 * -------------------------------------------------------
 * subscriptionController.js
 * -------------------------------------------------------
 * Handles subscription-related HTTP requests.
 *
 * Responsibilities:
 * 1. Return the logged-in user's subscription details.
 *
 * Note:
 * Business logic is implemented in subscriptionService.js.
 * This controller only validates requests and
 * returns HTTP responses.
 * -------------------------------------------------------
 */
const subscriptionService = require("../services/subscriptionService");

/**
 * GET /api/subscription
 * Returns the authenticated user's current subscription details.
 */
const getMySubscription = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated.",
            });
        }

        const user = await subscriptionService.getMySubscription(userId);
        return res.status(200).json({
            success: true,
            message: "Subscription retrieved successfully.",
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMySubscription,
};
