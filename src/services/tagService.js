const Tag = require("../models/Tag");
const Snippet = require("../models/Snippet");

const getTags = async (query = {}) => {
    const tags = await Tag.find(query)
        .sort({ name: 1 })
        .populate("createdBy", "name username");

    const tagList = [];
    for (const tag of tags) {
        // Count snippets that contain this tag name (case-insensitive search in tags array)
        const count = await Snippet.countDocuments({
            tags: { $in: [new RegExp(`^${tag.name}$`, 'i')] }
        });
        tagList.push({
            ...tag.toObject(),
            count
        });
    }
    return tagList;
};

const getTagById = async (id) => {
    return await Tag.findById(id)
        .populate("createdBy", "name username");
};

const createTag = async (data, userId) => {
    return await Tag.create({
        name: data.name.trim().toLowerCase(),
        color: data.color || "#3B82F6",
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdBy: userId
    });
};

const updateTag = async (id, data) => {
    const tag = await Tag.findById(id);
    if (!tag) {
        return null;
    }
    if (Object.prototype.hasOwnProperty.call(data, "name")) {
        tag.name = data.name.trim().toLowerCase();
    }
    if (Object.prototype.hasOwnProperty.call(data, "color")) {
        tag.color = data.color;
    }
    if (Object.prototype.hasOwnProperty.call(data, "isActive")) {
        tag.isActive = data.isActive;
    }
    return await tag.save();
};

const deleteTag = async (id) => {
    const tag = await Tag.findById(id);
    if (!tag) {
        return null;
    }
    await tag.deleteOne();
    return tag;
};

module.exports = {
    getTags,
    getTagById,
    createTag,
    updateTag,
    deleteTag
};
