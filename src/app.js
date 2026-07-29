const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const snippetRoutes = require("./routes/snippetRoutes");
const adminRoutes = require("./routes/adminRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const languageRoutes = require("./routes/languageRoutes");
const tagRoutes = require("./routes/tagRoutes");
const userRoutes = require("./routes/userRoutes");
const healthRoutes = require("./routes/healthRoutes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const app = express();

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger.json');
    
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/snippets", snippetRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/languages", languageRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/users", userRoutes);



app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Code Snippet API Running"
    });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
