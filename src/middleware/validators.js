const { body, param, query, validationResult } = require("express-validator");
const User = require("../models/User");
const Category = require("../models/Category");
const Language = require("../models/Language");
const Tag = require("../models/Tag");

const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const allowedRoles = ["developer", "student", "mentor", "recruiter"];
const allowedVisibility = ["public", "private"];

const handleValidationErrors = (req, res, next) => {
    const result = validationResult(req);

    if (result.isEmpty()) {
        return next();
    }

    const errors = result.array().map(error => ({
        field: error.path || "body",
        message: error.msg
    }));

    return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors
    });
};

const mongoIdParam = (field = "id") => [
    param(field)
        .isMongoId()
        .withMessage(`${field} must be a valid MongoDB id`),
    handleValidationErrors
];

const optionalCategory = body("category")
    .optional({ nullable: true, checkFalsy: true })
    .customSanitizer(value => value || undefined)
    .isMongoId()
    .withMessage("Category must be a valid MongoDB id")
    .bail()
    .custom(async (categoryId) => {
        if (categoryId) {
            const category = await Category.findById(categoryId);
            if (!category) {
                throw new Error("Category does not exist");
            }
        }
        return true;
    });

const tagsValidator = body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array")
    .bail()
    .custom(tags => tags.every(tag => typeof tag === "string" && tag.trim().length > 0))
    .withMessage("Each tag must be a non-empty string");

const validateRegister = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Name is required")
        .bail()
        .isLength({ min: 2, max: 60 })
        .withMessage("Name must be between 2 and 60 characters"),
    body("username")
        .trim()
        .notEmpty()
        .withMessage("Username is required")
        .bail()
        .isLength({ min: 3, max: 30 })
        .withMessage("Username must be between 3 and 30 characters")
        .bail()
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage("Username can only contain letters, numbers, and underscores")
        .bail()
        .custom(async (username) => {
            const user = await User.findOne({ username: username.toLowerCase() });
            if (user) {
                throw new Error("Username is already taken");
            }
            return true;
        }),
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .bail()
        .isEmail()
        .withMessage("Please provide a valid email")
        .normalizeEmail()
        .bail()
        .custom(async (email) => {
            const user = await User.findOne({ email });
            if (user) {
                throw new Error("Email is already registered");
            }
            return true;
        }),
    body("password")
        .notEmpty()
        .withMessage("Password is required")
        .bail()
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters long")
        .bail()
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#\.])/)
        .withMessage("Password must include at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#.)"),
    body("role")
        .optional()
        .isIn(allowedRoles)
        .withMessage(`Role must be one of: ${allowedRoles.join(", ")}`),
    body("phonenumber")
        .trim()
        .notEmpty()
        .withMessage("Phone number is required")
        .bail()
        .isLength({ min: 7, max: 20 })
        .withMessage("Phone number must be between 7 and 20 characters"),
    handleValidationErrors
];

const validateLogin = [
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .bail()
        .isEmail()
        .withMessage("Please provide a valid email")
        .normalizeEmail(),
    body("password")
        .notEmpty()
        .withMessage("Password is required"),
    handleValidationErrors
];

const validateCheckUsername = [
    query("username")
        .trim()
        .notEmpty()
        .withMessage("Username is required")
        .bail()
        .isLength({ min: 3, max: 30 })
        .withMessage("Username must be between 3 and 30 characters")
        .bail()
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage("Username can only contain letters, numbers, and underscores"),
    handleValidationErrors
];

const validateSnippetList = [
    query("userId")
        .optional()
        .isMongoId()
        .withMessage("userId must be a valid MongoDB id"),
    query("visibility")
        .optional()
        .isIn(allowedVisibility)
        .withMessage(`Visibility must be one of: ${allowedVisibility.join(", ")}`),
    handleValidationErrors
];

const validateCreateSnippet = [
    body("title")
        .trim()
        .notEmpty()
        .withMessage("Title is required")
        .bail()
        .isLength({ max: 120 })
        .withMessage("Title cannot exceed 120 characters"),
    body("description")
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 1000 })
        .withMessage("Description cannot exceed 1000 characters"),
    body("language")
        .trim()
        .notEmpty()
        .withMessage("Language is required")
        .bail()
        .isLength({ max: 50 })
        .withMessage("Language cannot exceed 50 characters"),
    body("code")
        .notEmpty()
        .withMessage("Code is required"),
    tagsValidator,
    body("visibility")
        .optional()
        .isIn(allowedVisibility)
        .withMessage(`Visibility must be one of: ${allowedVisibility.join(", ")}`),
    optionalCategory,
    handleValidationErrors
];

const validateUpdateSnippet = [
    param("id")
        .isMongoId()
        .withMessage("Snippet id must be a valid MongoDB id"),
    body("title")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Title cannot be empty")
        .bail()
        .isLength({ max: 120 })
        .withMessage("Title cannot exceed 120 characters"),
    body("description")
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 1000 })
        .withMessage("Description cannot exceed 1000 characters"),
    body("language")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Language cannot be empty")
        .bail()
        .isLength({ max: 50 })
        .withMessage("Language cannot exceed 50 characters"),
    body("code")
        .optional()
        .notEmpty()
        .withMessage("Code cannot be empty"),
    tagsValidator,
    body("visibility")
        .optional()
        .isIn(allowedVisibility)
        .withMessage(`Visibility must be one of: ${allowedVisibility.join(", ")}`),
    optionalCategory,
    body()
        .custom(value => {
            const allowedFields = [
                "title",
                "description",
                "language",
                "code",
                "tags",
                "visibility",
                "category"
            ];

            return allowedFields.some(field => Object.prototype.hasOwnProperty.call(value, field));
        })
        .withMessage("At least one snippet field is required"),
    handleValidationErrors
];

const validateComment = [
    param("id")
        .isMongoId()
        .withMessage("Snippet id must be a valid MongoDB id"),
    body("content")
        .trim()
        .notEmpty()
        .withMessage("Comment content is required")
        .bail()
        .isLength({ max: 1000 })
        .withMessage("Comment cannot exceed 1000 characters"),
    handleValidationErrors
];

const validateCommentBody = [
    body("content")
        .trim()
        .notEmpty()
        .withMessage("Comment content is required")
        .bail()
        .isLength({ max: 1000 })
        .withMessage("Comment cannot exceed 1000 characters"),
    handleValidationErrors
];

const validateCreateCategory = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Category name is required")
        .bail()
        .isLength({ min: 2, max: 60 })
        .withMessage("Category name must be between 2 and 60 characters")
        .bail()
        .custom(async (name) => {
            const category = await Category.findOne({ name: new RegExp(`^${escapeRegExp(name)}$`, 'i') });
            if (category) {
                throw new Error("Category name already exists");
            }
            return true;
        }),
    body("description")
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 300 })
        .withMessage("Category description cannot exceed 300 characters"),
    handleValidationErrors
];

const validateUpdateCategory = [
    param("id")
        .isMongoId()
        .withMessage("Category id must be a valid MongoDB id"),
    body("name")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Category name cannot be empty")
        .bail()
        .isLength({ min: 2, max: 60 })
        .withMessage("Category name must be between 2 and 60 characters")
        .bail()
        .custom(async (name, { req }) => {
            const category = await Category.findOne({
                name: new RegExp(`^${escapeRegExp(name)}$`, 'i'),
                _id: { $ne: req.params.id }
            });
            if (category) {
                throw new Error("Category name already exists");
            }
            return true;
        }),
    body("description")
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 300 })
        .withMessage("Category description cannot exceed 300 characters"),
    body()
        .custom(value => {
            const allowedFields = ["name", "description"];

            return allowedFields.some(field => Object.prototype.hasOwnProperty.call(value, field));
        })
        .withMessage("At least one category field is required"),
    handleValidationErrors
];

const validateCreateLanguage = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Language name is required")
        .bail()
        .isLength({ min: 1, max: 50 })
        .withMessage("Language name must be between 1 and 50 characters")
        .bail()
        .custom(async (name) => {
            const language = await Language.findOne({ name: new RegExp(`^${escapeRegExp(name)}$`, 'i') });
            if (language) {
                throw new Error("Language name already exists");
            }
            return true;
        }),
    body("icon")
        .trim()
        .notEmpty()
        .withMessage("Language icon/abbreviation is required")
        .bail()
        .isLength({ min: 1, max: 10 })
        .withMessage("Language icon must be between 1 and 10 characters"),
    handleValidationErrors
];

const validateUpdateLanguage = [
    param("id")
        .isMongoId()
        .withMessage("Language id must be a valid MongoDB id"),
    body("name")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Language name cannot be empty")
        .bail()
        .isLength({ min: 1, max: 50 })
        .withMessage("Language name must be between 1 and 50 characters")
        .bail()
        .custom(async (name, { req }) => {
            const language = await Language.findOne({
                name: new RegExp(`^${escapeRegExp(name)}$`, 'i'),
                _id: { $ne: req.params.id }
            });
            if (language) {
                throw new Error("Language name already exists");
            }
            return true;
        }),
    body("icon")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Language icon cannot be empty")
        .bail()
        .isLength({ min: 1, max: 10 })
        .withMessage("Language icon must be between 1 and 10 characters"),
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean value"),
    body()
        .custom(value => {
            const allowedFields = ["name", "icon", "isActive"];
            return allowedFields.some(field => Object.prototype.hasOwnProperty.call(value, field));
        })
        .withMessage("At least one language field (name, icon, or isActive) is required"),
    handleValidationErrors
];

const validateCreateTag = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Tag name is required")
        .bail()
        .isLength({ min: 1, max: 50 })
        .withMessage("Tag name must be between 1 and 50 characters")
        .bail()
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage("Tag name can only contain letters, numbers, hyphens, and underscores")
        .bail()
        .custom(async (name) => {
            const tag = await Tag.findOne({ name: new RegExp(`^${escapeRegExp(name)}$`, 'i') });
            if (tag) {
                throw new Error("Tag name already exists");
            }
            return true;
        }),
    body("color")
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .matches(/^#[0-9A-Fa-f]{6}$/)
        .withMessage("Tag color must be a valid 6-character hex color code (e.g. #3B82F6)"),
    handleValidationErrors
];

const validateUpdateTag = [
    param("id")
        .isMongoId()
        .withMessage("Tag id must be a valid MongoDB id"),
    body("name")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Tag name cannot be empty")
        .bail()
        .isLength({ min: 1, max: 50 })
        .withMessage("Tag name must be between 1 and 50 characters")
        .bail()
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage("Tag name can only contain letters, numbers, hyphens, and underscores")
        .bail()
        .custom(async (name, { req }) => {
            const tag = await Tag.findOne({
                name: new RegExp(`^${escapeRegExp(name)}$`, 'i'),
                _id: { $ne: req.params.id }
            });
            if (tag) {
                throw new Error("Tag name already exists");
            }
            return true;
        }),
    body("color")
        .optional({ nullable: true })
        .trim()
        .matches(/^#[0-9A-Fa-f]{6}$/)
        .withMessage("Tag color must be a valid 6-character hex color code (e.g. #3B82F6)"),
    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be a boolean value"),
    body()
        .custom(value => {
            const allowedFields = ["name", "color", "isActive"];
            return allowedFields.some(field => Object.prototype.hasOwnProperty.call(value, field));
        })
        .withMessage("At least one tag field (name, color, or isActive) is required"),
    handleValidationErrors
];

const validateBookmarkToggle = [
    param("id")
        .isMongoId()
        .withMessage("Snippet id must be a valid MongoDB id"),
    handleValidationErrors
];

const validateUpdateProfile = [
    body("name")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Name cannot be empty")
        .bail()
        .isLength({ min: 2, max: 60 })
        .withMessage("Name must be between 2 and 60 characters"),
    body("phonenumber")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Phone number cannot be empty")
        .bail()
        .isLength({ min: 7, max: 20 })
        .withMessage("Phone number must be between 7 and 20 characters"),
    body("bio")
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 1000 })
        .withMessage("Bio cannot exceed 1000 characters"),
    handleValidationErrors
];

module.exports = {
    handleValidationErrors,
    mongoIdParam,
    validateRegister,
    validateLogin,
    validateCheckUsername,
    validateSnippetList,
    validateCreateSnippet,
    validateUpdateSnippet,
    validateComment,
    validateCommentBody,
    validateCreateCategory,
    validateUpdateCategory,
    validateBookmarkToggle,
    validateUpdateProfile,
    validateCreateLanguage,
    validateUpdateLanguage,
    validateCreateTag,
    validateUpdateTag
};
