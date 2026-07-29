const categoryService = require("../services/categoryService");

const getCategories = async (req, res, next) => {
    try {
        const categories = await categoryService.getCategories();

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
        const category = await categoryService.getCategoryById(req.params.id);

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
        const category = await categoryService.createCategory(req.body, req.user.id);

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
        const updatedCategory = await categoryService.updateCategory(req.params.id, req.body);

        if (!updatedCategory) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
                errors: null
            });
        }

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
        const deletedCategory = await categoryService.deleteCategory(req.params.id);

        if (!deletedCategory) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
                errors: null
            });
        }

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
