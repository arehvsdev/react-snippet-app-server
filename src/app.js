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
const recommendationRoutes = require("./routes/recommendationRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
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

// Helper to parse comma-separated CLIENT_URL environment variables and sanitize trailing slashes
const getParsedClientUrls = () => {
    if (!process.env.CLIENT_URL) return [];
    return process.env.CLIENT_URL
        .split(",")
        .map((url) => url.trim().replace(/\/+$/, ""))
        .filter(Boolean);
};

// Default allowed origins list ensuring Vercel production frontend and local dev environments are supported
const defaultAllowedOrigins = [
    "https://react-snippet-app.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:5000",
    "http://127.0.0.1:5000"
];

// Combine default origins with any custom CLIENT_URL entries set in environment
const allowedOrigins = Array.from(
    new Set([...defaultAllowedOrigins, ...getParsedClientUrls()])
);

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow server-to-server, mobile, curl, or same-origin requests with no origin header
            if (!origin) {
                return callback(null, true);
            }

            // Normalize origin by stripping trailing slashes if present
            const normalizedOrigin = origin.replace(/\/+$/, "");

            // Check exact match in configured allowed origins
            if (allowedOrigins.includes(normalizedOrigin)) {
                return callback(null, true);
            }

            // Allow any Vercel deployment preview/production URL matching react-snippet-app*.vercel.app
            const isVercelDomain = /^https:\/\/react-snippet-app[a-zA-Z0-9-]*\.vercel\.app$/.test(normalizedOrigin);
            if (isVercelDomain) {
                return callback(null, true);
            }

            // In development / non-production environments, allow origin for convenience
            if (process.env.NODE_ENV !== "production") {
                return callback(null, true);
            }

            return callback(null, false);
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
    })
);

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

// Cookie Parsing Middleware
app.use((req, res, next) => {
    req.cookies = {};
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        cookieHeader.split(";").forEach((cookie) => {
            const parts = cookie.split("=");
            const name = parts.shift()?.trim();
            const value = parts.join("=")?.trim();
            if (name) {
                try {
                    req.cookies[name] = decodeURIComponent(value);
                } catch {
                    req.cookies[name] = value;
                }
            }
        });
    }
    next();
});
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/api/uploads", express.static(path.join(__dirname, "../uploads")));

// Swagger UI Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API Endpoint Routes
app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/snippets", snippetRoutes);
app.use("/api/recommendations", recommendationRoutes);
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
app.use("/api/notifications", notificationRoutes);

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
