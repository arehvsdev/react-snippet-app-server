const Razorpay = require("razorpay");
const requiredEnv = [
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET"
]

const missing = requiredEnv.filter( (key) => !process.env[key]);

if(missing.length > 0){
    throw new Error(
        `Missing Razorpay environment variables`
    );
}

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * Returns the initialized Razorpay instance.
 */
const getRazorpayInstance = () => razorpay;

/**
 * Detects whether the application
 * is running in TEST or LIVE mode.
 */
const getRazorpayMode = () => {
    const key = process.env.RAZORPAY_KEY_ID || "";

    return key.startsWith("rzp_test_") ?
        "TEST" :
        "LIVE";
};
/**
 * Validate Razorpay environment variables.
 * Called during server startup.
 */
const validateRazorpayConfig = () => {
    if (missing.length > 0) {

        console.warn(
            `⚠ Razorpay is not configured. Missing: ${missing.join(", ")}`
        );

        return false;
    }

    console.log("✓ Razorpay configured successfully");
    console.log(`✓ Mode: ${getRazorpayMode()}`);

    return true;
};

module.exports = {
    getRazorpayInstance,
    getRazorpayMode,
    validateRazorpayConfig
};