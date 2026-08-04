const Tag = require("../models/Tag");

const getTags = async (query) => {
    const filter = {};
    if (query.active !== undefined) {
        filter.isActive = query.active === "true";
    }
    if (query.search) {
        filter.name = new RegExp(query.search.trim(), "i");
    }
    return Tag.find(filter).sort({ name: 1 });
};

const getTagById = async (id) => {
    const tag = await Tag.findById(id);
    if (!tag) {
        const error = new Error("Tag not found");
        error.statusCode = 404;
        throw error;
    }
    return tag;
};

const createTag = async (data, userId) => {
    const { name, color, isActive } = data;
    const existing = await Tag.findOne({ name: name.trim().toLowerCase() });
    if (existing) {
        const error = new Error("Tag name already exists");
        error.statusCode = 400;
        throw error;
    }

    return Tag.create({
        name: name.trim().toLowerCase(),
        color: color ? color.trim() : "#3B82F6",
        isActive: isActive !== undefined ? isActive : true,
        createdBy: userId
    });
};

const updateTag = async (id, data) => {
    const { name, color, isActive } = data;

    if (name) {
        const existing = await Tag.findOne({ name: name.trim().toLowerCase(), _id: { $ne: id } });
        if (existing) {
            const error = new Error("Tag name already exists");
            error.statusCode = 400;
            throw error;
        }
    }

    const updateFields = {};
    if (name) updateFields.name = name.trim().toLowerCase();
    if (color) updateFields.color = color.trim();
    if (isActive !== undefined) updateFields.isActive = isActive;

    const tag = await Tag.findByIdAndUpdate(id, updateFields, { new: true, runValidators: true });
    if (!tag) {
        const error = new Error("Tag not found");
        error.statusCode = 404;
        throw error;
    }
    return tag;
};

const deleteTag = async (id) => {
    const tag = await Tag.findByIdAndDelete(id);
    if (!tag) {
        const error = new Error("Tag not found");
        error.statusCode = 404;
        throw error;
    }
    return true;
};

module.exports = {
    getTags,
    getTagById,
    createTag,
    updateTag,
    deleteTag
};
