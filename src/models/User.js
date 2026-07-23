const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name : {
        type: String,
        required: true
    },
    username: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    phonenumber: {
        type: String,
         required: function () {
             return this.role !== "admin";
         }
    },
    role: {
        type: String,
        enum: ["admin", "developer", "student", "mentor", "recruiter"],
        default: "developer"
    },
    dialogflowSessionId: {
        type: String
    }
}, {
    timestamps: true
})

module.exports = mongoose.model("User", userSchema);