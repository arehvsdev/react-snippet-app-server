const subscriptionService = require("../services/subscriptionService");

/**
 * GET /api/subscription
 * Returns the authenticated user's current subscription details.
 */
const getMySubscription = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const user = await subscriptionService.getMySubscription(userId);
        return res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMySubscription
};
