const Category = require("../models/Category");
const Snippet = require("../models/Snippet");

const getCategories = async () => {
    const categories = await Category.find().sort({ name: 1 }).lean();
    const categoriesWithCount = await Promise.all(
        categories.map(async (cat) => {
            const count = await Snippet.countDocuments({ category: cat._id, visibility: "public" });
            return { ...cat, count };
        })
    );
    return categoriesWithCount;
};

const getCategoryById = async (id) => {
    const category = await Category.findById(id).lean();
    if (!category) {
        const error = new Error("Category not found");
        error.statusCode = 404;
        throw error;
    }
    const count = await Snippet.countDocuments({ category: id, visibility: "public" });
    return { ...category, count };
};

const createCategory = async (data, userId) => {
    const { name, description } = data;
    const existing = await Category.findOne({ name: new RegExp(`^${name.trim()}$`, "i") });
    if (existing) {
        const error = new Error("Category name already exists");
        error.statusCode = 400;
        throw error;
    }

    return Category.create({
        name: name.trim(),
        description: description ? description.trim() : "",
        createdBy: userId
    });
};

const updateCategory = async (id, data) => {
    const { name, description } = data;

    if (name) {
        const existing = await Category.findOne({ name: new RegExp(`^${name.trim()}$`, "i"), _id: { $ne: id } });
        if (existing) {
            const error = new Error("Category name already exists");
            error.statusCode = 400;
            throw error;
        }
    }

    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (description !== undefined) updateFields.description = description.trim();

    const category = await Category.findByIdAndUpdate(id, updateFields, { new: true, runValidators: true });
    if (!category) {
        const error = new Error("Category not found");
        error.statusCode = 404;
        throw error;
    }
    return category;
};

const deleteCategory = async (id) => {
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
        const error = new Error("Category not found");
        error.statusCode = 404;
        throw error;
    }
    await Snippet.updateMany({ category: id }, { $unset: { category: "" } });
    return true;
};

module.exports = {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
};
