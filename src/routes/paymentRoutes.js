const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const protect = require("../middleware/authMiddleware");

/** GET /api/payment/status — check Razorpay module configuration status */
router.get("/status", paymentController.getStatus);

/** GET /api/payment/history — get authenticated user's paginated payment history */
router.get("/history", protect, paymentController.getPaymentHistory);

/** POST /api/payment/create-order — create Razorpay order for PRO plan */
router.post("/create-order", protect, paymentController.createOrder);

/** POST /api/payment/verify — verify Razorpay signature and activate PRO */
router.post("/verify", protect, paymentController.verifyPayment);

module.exports = router;
