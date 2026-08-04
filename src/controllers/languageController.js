const languageService = require("../services/languageService");

const getLanguages = async (req, res, next) => {
    try {
        const languages = await languageService.getLanguages(req.query);
        res.status(200).json({
            success: true,
            data: languages,
            languages
        });
    } catch (error) {
        next(error);
    }
};

const getLanguageById = async (req, res, next) => {
    try {
        const language = await languageService.getLanguageById(req.params.id);
        res.status(200).json({
            success: true,
            data: language,
            language
        });
    } catch (error) {
        next(error);
    }
};

const createLanguage = async (req, res, next) => {
    try {
        const language = await languageService.createLanguage(req.body, req.user.id);
        res.status(201).json({
            success: true,
            message: "Language created successfully",
            data: language,
            language
        });
    } catch (error) {
        next(error);
    }
};

const updateLanguage = async (req, res, next) => {
    try {
        const language = await languageService.updateLanguage(req.params.id, req.body);
        res.status(200).json({
            success: true,
            message: "Language updated successfully",
            data: language,
            language
        });
    } catch (error) {
        next(error);
    }
};

const deleteLanguage = async (req, res, next) => {
    try {
        await languageService.deleteLanguage(req.params.id);
        res.status(200).json({
            success: true,
            message: "Language deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getLanguages,
    getLanguageById,
    createLanguage,
    updateLanguage,
    deleteLanguage
};
