const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const protect = require("../middleware/authMiddleware");
const {
    getUserProfile,
    updateUserProfile,
    updateUserAvatar,
    changePassword
} = require("../controllers/userController");
const { validateUpdateProfile, validateChangePassword } = require("../middleware/validators");

const router = express.Router();

const uploadDirectory = path.join(__dirname, "../../uploads/avatars");

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, `avatar-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error("Only JPEG, JPG, PNG, WEBP, and GIF images are allowed"));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

router.use(protect);

router.get("/profile", getUserProfile);
router.put("/profile", validateUpdateProfile, updateUserProfile);
router.put("/change-password", validateChangePassword, changePassword);

router.patch("/avatar", (req, res, next) => {
    upload.single("avatar")(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                message: "Avatar upload failed",
                errors: [{ field: "avatar", message: err.message }]
            });
        }
        next();
    });
}, updateUserAvatar);

module.exports = router;
