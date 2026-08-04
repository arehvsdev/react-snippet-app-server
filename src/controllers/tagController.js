const tagService = require("../services/tagService");

const getTags = async (req, res, next) => {
    try {
        const tags = await tagService.getTags(req.query);
        res.status(200).json({
            success: true,
            data: tags,
            tags
        });
    } catch (error) {
        next(error);
    }
};

const getTagById = async (req, res, next) => {
    try {
        const tag = await tagService.getTagById(req.params.id);
        res.status(200).json({
            success: true,
            data: tag,
            tag
        });
    } catch (error) {
        next(error);
    }
};

const createTag = async (req, res, next) => {
    try {
        const tag = await tagService.createTag(req.body, req.user.id);
        res.status(201).json({
            success: true,
            message: "Tag created successfully",
            data: tag,
            tag
        });
    } catch (error) {
        next(error);
    }
};

const updateTag = async (req, res, next) => {
    try {
        const tag = await tagService.updateTag(req.params.id, req.body);
        res.status(200).json({
            success: true,
            message: "Tag updated successfully",
            data: tag,
            tag
        });
    } catch (error) {
        next(error);
    }
};

const deleteTag = async (req, res, next) => {
    try {
        await tagService.deleteTag(req.params.id);
        res.status(200).json({
            success: true,
            message: "Tag deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getTags,
    getTagById,
    createTag,
    updateTag,
    deleteTag
};
