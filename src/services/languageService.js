const Language = require("../models/Language");
const Snippet = require("../models/Snippet");

const getLanguages = async (query = {}) => {
    const languages = await Language.find(query)
        .sort({ name: 1 })
        .populate("createdBy", "name username");

    const languageList = [];
    for (const lang of languages) {
        // Count snippets that match this language name (case-insensitive string match)
        const count = await Snippet.countDocuments({
            language: new RegExp(`^${lang.name}$`, 'i')
        });
        languageList.push({
            ...lang.toObject(),
            count
        });
    }
    return languageList;
};

const getLanguageById = async (id) => {
    return await Language.findById(id)
        .populate("createdBy", "name username");
};

const createLanguage = async (data, userId) => {
    return await Language.create({
        name: data.name,
        icon: data.icon,
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdBy: userId
    });
};

const updateLanguage = async (id, data) => {
    const language = await Language.findById(id);
    if (!language) {
        return null;
    }
    if (Object.prototype.hasOwnProperty.call(data, "name")) {
        language.name = data.name;
    }
    if (Object.prototype.hasOwnProperty.call(data, "icon")) {
        language.icon = data.icon;
    }
    if (Object.prototype.hasOwnProperty.call(data, "isActive")) {
        language.isActive = data.isActive;
    }
    return await language.save();
};

const deleteLanguage = async (id) => {
    const language = await Language.findById(id);
    if (!language) {
        return null;
    }
    await language.deleteOne();
    return language;
};

module.exports = {
    getLanguages,
    getLanguageById,
    createLanguage,
    updateLanguage,
    deleteLanguage
};
