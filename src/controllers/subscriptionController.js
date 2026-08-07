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
        // User ID is added by the authentication middleware
        const userId = req.user?.id;
        // Extra safety check
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated."
            });
        }

        // Call service function
        const user = await subscriptionService.getMySubscription(userId);
        
        return res.status(200).json({
            success: true,
            message: "Subscription retrieved successfully.",
            data: user
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMySubscription
};
