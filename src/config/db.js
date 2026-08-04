/**
 * Database Connection Module
 * Establishes connection to MongoDB database using Mongoose.
 */
const mongoose = require("mongoose");

/**
 * Connects to MongoDB database using environment variable MONGO_URI.
 * Terminates process on connection failure.
 */
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};

module.exports = connectDB;