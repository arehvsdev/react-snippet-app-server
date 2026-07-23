require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");


async function seedAdmin(){
    try{
        await mongoose.connect(process.env.MONGO_URI);
        const admin = await User.findOne({role: "admin"});
        if(admin){
            console.log("Admin already exist");
            process.exit(0);
        }

        const hashPassword = await bcrypt.hash("N(438720737275un", 10);

        await User.create({
            name: "Super Admin",
            username: "superadmin",
            email: "agreesh777@gmail.com",
            password: hashPassword,
            role: "admin"
        });

        console.log("Admin created");
        process.exit(0)
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seedAdmin();