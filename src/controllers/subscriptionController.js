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
const User = require("../models/User");
const Payment = require("../models/Payment");
const emailService = require("../services/emailService");

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

/**
 * POST /api/subscription/send-invoice
 * Generates and dispatches a detailed tax invoice receipt to the authenticated user's email.
 */
const sendInvoice = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated."
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const { paymentId } = req.body || {};

        let payment = null;
        if (paymentId) {
            payment = await Payment.findOne({
                $or: [{ _id: paymentId }, { paymentId: paymentId }],
                user: userId
            });
        }

        // Fallback to latest successful payment if paymentId not supplied or found
        if (!payment) {
            payment = await Payment.findOne({
                user: userId,
                status: { $in: ["SUCCESS", "PAID", "COMPLETED", "success"] }
            }).sort({ createdAt: -1 });
        }

        const plan = payment?.plan || user.subscription?.plan || "PRO";
        const rawAmount = payment?.amount;
        const amountStr = typeof rawAmount === "number" && rawAmount > 0
            ? `₹${Math.round(rawAmount / 100)}`
            : (plan === "PRO" ? "₹199" : "₹0");

        const resolvedPaymentId = payment?.paymentId || user.subscription?.paymentId || `PAY-${Date.now().toString().slice(-8)}`;
        const resolvedDate = payment?.createdAt
            ? new Date(payment.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
            : (user.subscription?.paymentDate ? new Date(user.subscription.paymentDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }));
        const invoiceNumber = `INV-${resolvedPaymentId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase() || Date.now().toString().slice(-6)}`;

        await emailService.sendSubscriptionInvoiceEmail({
            email: user.email,
            name: user.name,
            plan,
            paymentId: resolvedPaymentId,
            orderId: payment?.orderId || "N/A",
            amount: amountStr,
            date: resolvedDate,
            invoiceNumber
        });

        return res.status(200).json({
            success: true,
            message: `Invoice ${invoiceNumber} sent successfully to ${user.email}.`,
            data: {
                invoiceNumber,
                email: user.email,
                date: resolvedDate,
                amount: amountStr
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMySubscription,
    sendInvoice
};

