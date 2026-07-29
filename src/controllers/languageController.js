const languageService = require("../services/languageService");

const getLanguages = async (req, res, next) => {
    try {
        const query = {};
        // Can optionally filter by active status if requested
        if (req.query.active !== undefined) {
            query.isActive = req.query.active === "true";
        }
        
        const languages = await languageService.getLanguages(query);

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

        if (!language) {
            return res.status(404).json({
                success: false,
                message: "Language not found",
                errors: null
            });
        }

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
        const updatedLanguage = await languageService.updateLanguage(req.params.id, req.body);

        if (!updatedLanguage) {
            return res.status(404).json({
                success: false,
                message: "Language not found",
                errors: null
            });
        }

        res.status(200).json({
            success: true,
            message: "Language updated successfully",
            data: updatedLanguage,
            language: updatedLanguage
        });
    } catch (error) {
        next(error);
    }
};

const deleteLanguage = async (req, res, next) => {
    try {
        const deletedLanguage = await languageService.deleteLanguage(req.params.id);

        if (!deletedLanguage) {
            return res.status(404).json({
                success: false,
                message: "Language not found",
                errors: null
            });
        }

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
