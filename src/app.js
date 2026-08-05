/**
 * Express Application Configuration
 * Sets up middleware (CORS, Helmet, Rate Limiting, Body Parser), API route endpoints, Swagger docs, and error handling.
 */
const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Import Route Handlers
const authRoutes = require("./routes/authRoutes");
const snippetRoutes = require("./routes/snippetRoutes");
const adminRoutes = require("./routes/adminRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const languageRoutes = require("./routes/languageRoutes");
const tagRoutes = require("./routes/tagRoutes");
const userRoutes = require("./routes/userRoutes");
const healthRoutes = require("./routes/healthRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const adminDashboardRoutes = require("./routes/adminDashboardRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Swagger Documentation setup
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger.json');

// Security Headers Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS Configuration (Strict allowed origins in production, dev fallbacks in development)
const allowedOrigins = process.env.NODE_ENV === "production"
    ? (process.env.CLIENT_URL ? [process.env.CLIENT_URL] : [])
    : (process.env.CLIENT_URL ? [process.env.CLIENT_URL, "http://localhost:5173", "http://localhost:3000"] : ["http://localhost:5173", "http://localhost:3000"]);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        if (process.env.NODE_ENV !== "production") {
            return callback(null, true); // Dev convenience fallback
        }
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
}));

// Rate Limiting Middlewares to prevent abuse
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === "production" ? 30 : 300, // 30 in prod, 300 in dev for testing
    message: { success: false, message: "Too many authentication requests, please try again after 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // 300 requests per window
    message: { success: false, message: "Too many requests from this IP, please try again later." },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limiting
app.use("/api/auth", authLimiter);
app.use("/api/", apiLimiter);

// Body Parsing & Static File Serving
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Swagger UI Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API Endpoint Routes
app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/snippets", snippetRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/languages", languageRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/payment", paymentRoutes);
app.use("/api/subscription", subscriptionRoutes);

// Root healthcheck endpoint
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Code Snippet API Running"
    });
});

// 404 & Global Error Middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;
