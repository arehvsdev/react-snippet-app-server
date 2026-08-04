const Language = require("../models/Language");

const getLanguages = async (query) => {
    const filter = {};
    if (query.active !== undefined) {
        filter.isActive = query.active === "true";
    }
    return Language.find(filter).sort({ name: 1 });
};

const getLanguageById = async (id) => {
    const language = await Language.findById(id);
    if (!language) {
        const error = new Error("Language not found");
        error.statusCode = 404;
        throw error;
    }
    return language;
};

const createLanguage = async (data, userId) => {
    const { name, icon, isActive } = data;
    const existing = await Language.findOne({ name: new RegExp(`^${name.trim()}$`, "i") });
    if (existing) {
        const error = new Error("Language name already exists");
        error.statusCode = 400;
        throw error;
    }

    return Language.create({
        name: name.trim(),
        icon: icon.trim(),
        isActive: isActive !== undefined ? isActive : true,
        createdBy: userId
    });
};

const updateLanguage = async (id, data) => {
    const { name, icon, isActive } = data;

    if (name) {
        const existing = await Language.findOne({ name: new RegExp(`^${name.trim()}$`, "i"), _id: { $ne: id } });
        if (existing) {
            const error = new Error("Language name already exists");
            error.statusCode = 400;
            throw error;
        }
    }

    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (icon) updateFields.icon = icon.trim();
    if (isActive !== undefined) updateFields.isActive = isActive;

    const language = await Language.findByIdAndUpdate(id, updateFields, { new: true, runValidators: true });
    if (!language) {
        const error = new Error("Language not found");
        error.statusCode = 404;
        throw error;
    }
    return language;
};

const deleteLanguage = async (id) => {
    const language = await Language.findByIdAndDelete(id);
    if (!language) {
        const error = new Error("Language not found");
        error.statusCode = 404;
        throw error;
    }
    return true;
};

module.exports = {
    getLanguages,
    getLanguageById,
    createLanguage,
    updateLanguage,
    deleteLanguage
};
