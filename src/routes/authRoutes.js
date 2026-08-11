const express = require("express");
const {
    register,
    login,
    checkUsername,
    getMe,
    verifyEmail,
    forgotPassword,
    validateResetToken,
    resetPassword
} = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");
const {
    validateRegister,
    validateLogin,
    validateCheckUsername,
    validateForgotPassword,
    validateResetPassword
} = require("../middleware/validators");

const router = express.Router();

router.get('/check-username', validateCheckUsername, checkUsername);
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/me', protect, getMe);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.get('/validate-reset-token', validateResetToken);
router.post('/reset-password', validateResetPassword, resetPassword);

module.exports = router;
