const express = require("express");
const {
    register,
    login,
    checkUsername,
    getMe,
    verifyEmail,
    forgotPassword,
    validateResetToken,
    resetPassword,
    refreshToken,
    logout,
    verifyEmailToken,
    verifyEmailCode,
    resendVerificationCode,
    googleLogin
} = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");
const {
    validateRegister,
    validateLogin,
    validateCheckUsername,
    validateForgotPassword,
    validateResetPassword,
    validateVerifyCode,
    validateResendCode
} = require("../middleware/validators");

const router = express.Router();

router.get('/check-username', validateCheckUsername, checkUsername);
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/google', googleLogin);
router.post('/refresh-token', refreshToken);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/verify-email', verifyEmail);
router.post('/verify-email-token', verifyEmailToken);
router.post('/verify-code', validateVerifyCode, verifyEmailCode);
router.post('/resend-verification-code', validateResendCode, resendVerificationCode);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.get('/validate-reset-token', validateResetToken);
router.post('/reset-password', validateResetPassword, resetPassword);

module.exports = router;
