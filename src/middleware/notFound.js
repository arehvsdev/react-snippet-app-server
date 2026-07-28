const notFound = (req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route Not Found - ${req.originalUrl}`
    });
};

module.exports = notFound;