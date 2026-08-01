const dashboardService = require("../services/dashboardService");

const getSummary = async (req, res, next) => {
    try {
        const tzOffset = req.query.tzOffset ? parseInt(req.query.tzOffset) : 0;
        const data = await dashboardService.getSummary(tzOffset);
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

const getUserGrowth = async (req, res, next) => {
    try {
        const months = req.query.months ? parseInt(req.query.months) : 6;
        const data = await dashboardService.getUserGrowth(months);
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

const getSnippetLanguages = async (req, res, next) => {
    try {
        const data = await dashboardService.getSnippetLanguages();
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

const getWeeklyActivity = async (req, res, next) => {
    try {
        const tzOffset = req.query.tzOffset ? parseInt(req.query.tzOffset) : 0;
        const data = await dashboardService.getWeeklyActivity(tzOffset);
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

const getRecentActivity = async (req, res, next) => {
    try {
        const data = await dashboardService.getRecentActivity();
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSummary,
    getUserGrowth,
    getSnippetLanguages,
    getWeeklyActivity,
    getRecentActivity
};
