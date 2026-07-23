const User = require("../models/User");
const Snippet = require("../models/Snippet");

/**
 * GET /api/admin/users
 * Returns list of all registered users (Admin-only)
 */
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select("-password");
        res.json({
            success: true,
            users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to retrieve users",
            error: error.message
        });
    }
};

/**
 * DELETE /api/admin/snippets/:id
 * Force deletes any user's snippet (Admin-only)
 */
const deleteAnySnippet = async (req, res) => {
    try {
        const snippet = await Snippet.findById(req.params.id);
        if (!snippet) {
            return res.status(404).json({
                success: false,
                message: "Snippet not found"
            });
        }

        await snippet.deleteOne();
        res.json({
            success: true,
            message: "Snippet deleted by Administrator successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to delete snippet",
            error: error.message
        });
    }
};

module.exports = {
    getAllUsers,
    deleteAnySnippet
};
