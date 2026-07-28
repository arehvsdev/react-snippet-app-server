const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    console.error(err);

    const statusCode = res.statusCode && res.statusCode !== 200
        ? res.statusCode
        : 500;

    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
};

module.exports = errorHandler;
