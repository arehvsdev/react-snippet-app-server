/**
 * Server Entry Point
 * Initializes environment variables, connects to database, and starts the Express server.
 */
require("dotenv").config();

// Verify critical environment variables
if (!process.env.JWT_SECRET) {
    console.warn("WARNING: JWT_SECRET environment variable is missing! Using default fallback key for development.");
    process.env.JWT_SECRET = "default_secret_key_change_in_production_12345";
}

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

