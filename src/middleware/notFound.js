const notFound = (req, res, next) => {
    res.status(404);
    next(new Error(`Route Not Found - ${req.originalUrl}`));
};

module.exports = notFound;
