const tagService = require("../services/tagService");

const getTags = async (req, res, next) => {
    try {
        const query = {};
        if (req.query.active !== undefined) {
            query.isActive = req.query.active === "true";
        }
        if (req.query.search) {
            const escapedSearch = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.name = new RegExp(escapedSearch, 'i');
        }
        
        const tags = await tagService.getTags(query);

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

        if (!tag) {
            return res.status(404).json({
                success: false,
                message: "Tag not found",
                errors: null
            });
        }

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
        const updatedTag = await tagService.updateTag(req.params.id, req.body);

        if (!updatedTag) {
            return res.status(404).json({
                success: false,
                message: "Tag not found",
                errors: null
            });
        }

        res.status(200).json({
            success: true,
            message: "Tag updated successfully",
            data: updatedTag,
            tag: updatedTag
        });
    } catch (error) {
        next(error);
    }
};

const deleteTag = async (req, res, next) => {
    try {
        const deletedTag = await tagService.deleteTag(req.params.id);

        if (!deletedTag) {
            return res.status(404).json({
                success: false,
                message: "Tag not found",
                errors: null
            });
        }

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
