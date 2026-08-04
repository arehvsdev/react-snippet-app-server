/**
 * Global Error Handler Middleware
 * Catches unhandled errors, formats MongoDB/validation error responses, and returns structured JSON output.
 */
const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    console.error(err);

    let statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
    let message = err.message || "Internal Server Error";

    // Handle Mongoose Cast Error (Invalid ObjectId format)
    if (err.name === "CastError") {
        statusCode = 400;
        message = "Invalid resource id";
    }

    // Handle Mongoose Schema Validation Error
    if (err.name === "ValidationError") {
        statusCode = 400;
        message = err.message;
    }

    // Handle Mongo Duplicate Key Error (E11000)
    if (err.code === 11000) {
        statusCode = 409;
        message = "Duplicate field value entered";
    }

    res.status(statusCode).json({
        success: false,
        message,
        errors: err.errors || null
    });
};

module.exports = errorHandler;
