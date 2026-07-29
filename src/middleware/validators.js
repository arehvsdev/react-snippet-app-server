const { body, param, query, validationResult } = require("express-validator");
const User = require("../models/User");
const Category = require("../models/Category");

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
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/)
        .withMessage("Password must include at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#)"),
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
            const category = await Category.findOne({ name: new RegExp(`^${name}$`, 'i') });
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
                name: new RegExp(`^${name}$`, 'i'),
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
    validateCreateCategory,
    validateUpdateCategory,
    validateBookmarkToggle,
    validateUpdateProfile
};
