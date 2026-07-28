const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    console.error(err);

    let statusCode = res.statusCode && res.statusCode !== 200
        ? res.statusCode
        : 500;
    let message = err.message || "Internal Server Error";

    if (err.name === "CastError") {
        statusCode = 400;
        message = "Invalid resource id";
    }

    if (err.name === "ValidationError") {
        statusCode = 400;
        message = err.message;
    }

    if (err.code === 11000) {
        statusCode = 409;
        message = "Duplicate field value entered";
    }

    res.status(statusCode).json({
        success: false,
        message,
        errors: null
    });
};

module.exports = errorHandler;
