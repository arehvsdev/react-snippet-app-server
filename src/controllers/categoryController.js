const Category = require("../models/Category");

const getCategories = async (req, res, next) => {
    try {
        const categories = await Category.find({})
            .sort({ name: 1 })
            .populate("createdBy", "name username");

        res.status(200).json({
            success: true,
            data: categories,
            categories
        });
    } catch (error) {
        next(error);
    }
};

const getCategoryById = async (req, res, next) => {
    try {
        const category = await Category.findById(req.params.id)
            .populate("createdBy", "name username");

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
                errors: null
            });
        }

        res.status(200).json({
            success: true,
            data: category,
            category
        });
    } catch (error) {
        next(error);
    }
};

const createCategory = async (req, res, next) => {
    try {
        const category = await Category.create({
            name: req.body.name,
            description: req.body.description,
            createdBy: req.user.id
        });

        res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: category,
            category
        });
    } catch (error) {
        next(error);
    }
};

const updateCategory = async (req, res, next) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
                errors: null
            });
        }

        if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
            category.name = req.body.name;
        }

        if (Object.prototype.hasOwnProperty.call(req.body, "description")) {
            category.description = req.body.description;
        }

        const updatedCategory = await category.save();

        res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: updatedCategory,
            category: updatedCategory
        });
    } catch (error) {
        next(error);
    }
};

const deleteCategory = async (req, res, next) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
                errors: null
            });
        }

        await category.deleteOne();

        res.status(200).json({
            success: true,
            message: "Category deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
};
