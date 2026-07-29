const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const isAdmin = require("../middleware/isAdminMiddleware");
const {
    getTags,
    getTagById,
    createTag,
    updateTag,
    deleteTag
} = require("../controllers/tagController");
const {
    mongoIdParam,
    validateCreateTag,
    validateUpdateTag
} = require("../middleware/validators");

router.get("/", getTags);
router.get("/:id", mongoIdParam("id"), getTagById);

router.use(protect);
router.use(isAdmin);

router.post("/", validateCreateTag, createTag);
router.put("/:id", validateUpdateTag, updateTag);
router.delete("/:id", mongoIdParam("id"), deleteTag);

module.exports = router;
