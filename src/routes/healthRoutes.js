const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const DB_STATES = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };

router.get("/", (req, res) => {
    const readyState = mongoose.connection.readyState;
    const isHealthy = readyState === 1;

    res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        message: isHealthy ? "API is healthy" : "Database unavailable",
        data: {
            status: isHealthy ? "OK" : "ERROR",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: DB_STATES[readyState] ?? "unknown"
        },
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: DB_STATES[readyState] ?? "unknown",
    });
});

module.exports = router;