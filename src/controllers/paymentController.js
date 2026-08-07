/**
 * -------------------------------------------------------
 * paymentController.js
 * -------------------------------------------------------
 * Controller responsible for handling payment requests.
 *
 * Responsibilities
 * 1. Return Razorpay configuration status
 * 2. Create Razorpay Order
 * 3. Verify Razorpay Payment
 * 4. Return payment history
 *
 * This controller only handles HTTP requests.
 * All business logic is implemented in paymentService.js.
 * -------------------------------------------------------
 */
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
        // Default plan is PRO
        const { plan = "PRO" } = req.body;
        const userId = req.user ? req.user.id : null;

        // Basic validation
        if( !userId){
            return res.status(401).json({
                success: false,
                message: "User not authenticated"
            });
        }

        if( !["FREE", "PRO"].includes(plan.toUpperCase())){
            return res.status(400).json({
                success: false,
                message: "Invalid subscription plan."
            });
        }

        const order = await paymentService.createRazorpayOrder(userId, plan);

        return res.status(200).json({
            success: true,
            message: "Order created successfully",
            data: order
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
        const userId = req.user?.id;
        const { orderId, paymentId, signature } = req.body;

        // Validate request body
        if( !orderId || !paymentId || !signature){
            return res.status(400).json({
                success: false,
                message: "Missing payment details"
            });
        }
        const result = await paymentService.verifyPayment(
            userId, 
            { 
                orderId, 
                paymentId, 
                signature 
            }
        );

        return res.status(200).json({
            success: true,
            message: "Payment verified successfully and PRO plan activated",
            data: result.user,
            subscription: result.subscription,
            payment: {
                orderId,
                paymentId
            }
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
