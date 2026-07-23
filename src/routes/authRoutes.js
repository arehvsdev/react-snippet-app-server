const express = require("express");
const {
    register,
    login,
    checkUsername
} = require("../controllers/authController");

const router = express.Router();

router.get('/check-username', checkUsername);
router.post('/register', register);
router.post('/login', login);

module.exports = router;