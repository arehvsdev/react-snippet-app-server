const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const snippetRoutes = require("./routes/snippetRoutes");
const adminRoutes = require("./routes/adminRoutes");
const healthRoutes = require("./routes/healthRoutes");
const app = express();

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger.json');
    
app.use(cors());
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/snippets", snippetRoutes);
app.use("/api/admin", adminRoutes);



app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Code Snippet API Running"
    });
});

module.exports = app;