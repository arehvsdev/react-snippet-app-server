const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdminMiddleware");
const {
    getLanguages,
    getLanguageById,
    createLanguage,
    updateLanguage,
    deleteLanguage
} = require("../controllers/languageController");
const {
    mongoIdParam,
    validateCreateLanguage,
    validateUpdateLanguage
} = require("../middleware/validators");

router.get("/", getLanguages);
router.get("/:id", mongoIdParam("id"), getLanguageById);

router.use(protect);
router.use(isAdmin);

router.post("/", validateCreateLanguage, createLanguage);
router.put("/:id", validateUpdateLanguage, updateLanguage);
router.delete("/:id", mongoIdParam("id"), deleteLanguage);

module.exports = router;
