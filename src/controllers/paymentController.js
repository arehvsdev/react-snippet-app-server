const paymentService = require("../services/paymentService");
const subscriptionService = require("../services/subscriptionService");

/**
 * GET /api/payment/status
 * Returns payment module initialization status.
 */
const getStatus = async (req, res, next) => {
    try {
        const status = await paymentService.getPaymentStatus();
        return res.status(200).json({
            success: true,
            data: status,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/payment/history
 * Returns paginated payment transaction history for the authenticated user.
 */
const getPaymentHistory = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const result = await subscriptionService.getPaymentHistory(userId, req.query);
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
 * POST /api/payment/create-order
 * Creates a Razorpay order for authenticated user for PRO plan.
 */
const createOrder = async (req, res, next) => {
    try {
        const { plan = "PRO" } = req.body;
        const userId = req.user ? req.user.id : null;

        const orderData = await paymentService.createRazorpayOrder(userId, plan);

        return res.status(200).json({
            success: true,
            orderId: orderData.orderId,
            amount: orderData.amount,
            currency: orderData.currency,
            keyId: orderData.keyId,
            data: orderData,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/payment/verify
 * Verifies Razorpay payment signature and updates user subscription to PRO.
 */
const verifyPayment = async (req, res, next) => {
    try {
        const { orderId, paymentId, signature } = req.body;
        const userId = req.user ? req.user.id : null;

        const result = await paymentService.verifyPayment(userId, { orderId, paymentId, signature });

        return res.status(200).json({
            success: true,
            message: "Payment verified successfully and PRO plan activated",
            data: result.user,
            subscription: result.subscription,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getStatus,
    getPaymentHistory,
    createOrder,
    verifyPayment,
};
