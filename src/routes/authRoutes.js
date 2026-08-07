const express = require("express");
const {
    register,
    login,
    checkUsername,
    getMe,
    verifyEmail,
    resetPassword
} = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");
const {
    validateRegister,
    validateLogin,
    validateCheckUsername
} = require("../middleware/validators");

const router = express.Router();

router.get('/check-username', validateCheckUsername, checkUsername);
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/me', protect, getMe);
router.post('/verify-email', verifyEmail);
router.post('/reset-password', resetPassword);

module.exports = router;
