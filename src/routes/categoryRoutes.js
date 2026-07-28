const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdminMiddleware");
const {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
} = require("../controllers/categoryController");
const {
    mongoIdParam,
    validateCreateCategory,
    validateUpdateCategory
} = require("../middleware/validators");

router.get("/", getCategories);
router.get("/:id", mongoIdParam("id"), getCategoryById);

router.use(protect);
router.use(isAdmin);

router.post("/", validateCreateCategory, createCategory);
router.put("/:id", validateUpdateCategory, updateCategory);
router.delete("/:id", mongoIdParam("id"), deleteCategory);

module.exports = router;
