const User = require("../models/User");
const Snippet = require("../models/Snippet");

/**
 * GET /api/admin/users
 * Returns list of all registered users (Admin-only)
 */
const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find({}).select("-password");

        res.status(200).json({
            success: true,
            data: users,
            users
        });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/admin/snippets/:id
 * Force deletes any user's snippet (Admin-only)
 */
const deleteAnySnippet = async (req, res, next) => {
    try {
        const snippet = await Snippet.findById(req.params.id);
        if (!snippet) {
            return res.status(404).json({
                success: false,
                message: "Snippet not found"
            });
        }

        await snippet.deleteOne();

        res.status(200).json({
            success: true,
            message: "Snippet deleted by Administrator successfully"
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllUsers,
    deleteAnySnippet
};
