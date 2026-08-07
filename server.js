/**
 * Server Entry Point
 * Initializes environment variables, connects to database, and starts the Express server.
 */
require("dotenv").config();

const { validateRazorpayConfig } = require("./src/config/razorpay");

// Verify critical environment variables before starting server
if (process.env.NODE_ENV === "production") {
    const missingVars = [];
    if (!process.env.JWT_SECRET) missingVars.push("JWT_SECRET");
    if (!process.env.MONGO_URI && !process.env.MONGODB_URI) missingVars.push("MONGO_URI");

    if (missingVars.length > 0) {
        console.error(`FATAL SECURITY ERROR: Missing required environment variables in production: ${missingVars.join(", ")}`);
        process.exit(1);
    }
} else {
    if (!process.env.JWT_SECRET) {
        console.warn("WARNING: JWT_SECRET environment variable is missing! Using default fallback key for development.");
        process.env.JWT_SECRET = "default_secret_key_change_in_production_12345";
    }
}

// Validate Razorpay configuration during server startup
validateRazorpayConfig();

const app = require("./src/app");
const connectDB = require("./src/config/db");

// Connect to MongoDB database
connectDB();

// Define server port
const PORT = process.env.PORT || 5000;

// Start listening for incoming connections
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

