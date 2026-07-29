const Category = require("../models/Category");
const Snippet = require("../models/Snippet");

const getCategories = async () => {
    const categories = await Category.find({})
        .sort({ name: 1 })
        .populate("createdBy", "name username");

    const categoryList = [];
    for (const category of categories) {
        const count = await Snippet.countDocuments({ category: category._id });
        categoryList.push({
            ...category.toObject(),
            count
        });
    }
    return categoryList;
};

const getCategoryById = async (id) => {
    return await Category.findById(id)
        .populate("createdBy", "name username");
};

const createCategory = async (data, userId) => {
    return await Category.create({
        name: data.name,
        description: data.description,
        createdBy: userId
    });
};

const updateCategory = async (id, data) => {
    const category = await Category.findById(id);
    if (!category) {
        return null;
    }
    if (Object.prototype.hasOwnProperty.call(data, "name")) {
        category.name = data.name;
    }
    if (Object.prototype.hasOwnProperty.call(data, "description")) {
        category.description = data.description;
    }
    return await category.save();
};

const deleteCategory = async (id) => {
    const category = await Category.findById(id);
    if (!category) {
        return null;
    }
    await category.deleteOne();
    return category;
};

module.exports = {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
};
