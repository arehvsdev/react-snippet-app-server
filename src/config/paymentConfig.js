module.exports = {
    currency : "INR",
    plans: {
        FREE: {
            name: "FREE",
            amount: 0,
            duration: 365, // days
        },
        PRO: {
            name: "PRO",
            amount: "49900", // ₹499.00
            duration: 365, // days
        },
    },
    receiptPrefix: "SNIPPET",
    paymentStatus: {
        CREATED: "CREATED",
        PENDING: "PENDING",
        SUCCESS: "SUCCESS",
        FAILED: "FAILED",
        REFUNDED: "REFUNDED",
    },
}