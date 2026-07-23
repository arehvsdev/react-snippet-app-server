const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const register = async(req, res) => {
    const {
        name, username, email, password, role, phonenumber
    } = req.body;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
        return res.status(409).json({
            success: false,
            message: "Email is already registered"
        });
    }

    const existingUsername = await User.findOne({ username: username?.toLowerCase() });
    if (existingUsername) {
        return res.status(409).json({
            success: false,
            message: "Username is already taken"
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const allowedRoles = ["developer", "student", "mentor", "recruiter"];
    const userRole = allowedRoles.includes(role) ? role : "developer";

    const user = await User.create({
        name,
        username,
        email,
        password: hashedPassword,
        phonenumber,
        role: userRole
    });

    res.status(201).json(user);
}

const checkUsername = async(req, res) => {
    const { username } = req.query;
    if (!username) {
        return res.status(400).json({ available: false, message: "Username is required" });
    }
    const exists = await User.findOne({ username: username.toLowerCase() });
    res.json({ available: !exists });
}

const login = async(req, res) => {
    const user = await User.findOne({
        email: req.body.email
    });

    if( !user ){
        return res.status(400).json({
            message: "Invalid Credentials"
        })
    };

    const valid = await bcrypt.compare(
        req.body.password,
        user.password
    );

    if( !valid){
        return res.status(400).json({
            message: "Invalid Credentials"
        })
    };

    const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    const { password: _, ...userWithoutPassword } = user.toObject();
    res.json({ token, user: userWithoutPassword });

}

module.exports = {
    register,
    login,
    checkUsername
}