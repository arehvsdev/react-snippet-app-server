const express = require("express");
const {
    register,
    login,
    checkUsername,
    verifyEmail,
    resetPassword
} = require("../controllers/authController");
const {
    validateRegister,
    validateLogin,
    validateCheckUsername
} = require("../middleware/validators");

const router = express.Router();

router.get('/check-username', validateCheckUsername, checkUsername);
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/verify-email', verifyEmail);
router.post('/reset-password', resetPassword);

module.exports = router;
