require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Category = require("../models/Category");
const Language = require("../models/Language");
const Tag = require("../models/Tag");

const defaultCategories = [
    { name: "JavaScript", description: "All things JavaScript development" },
    { name: "TypeScript", description: "Strongly typed programming language that builds on JavaScript" },
    { name: "Python", description: "Python scripting, backend development and data science" },
    { name: "React", description: "Frontend library for building user interfaces" },
    { name: "Node.js", description: "JavaScript runtime environment for backend services" },
    { name: "CSS", description: "Styling and layout of web components" },
    { name: "Java", description: "General purpose object-oriented programming language" },
    { name: "Go", description: "Statically typed, compiled programming language designed at Google" }
];

const defaultLanguages = [
    { name: "JavaScript", icon: "JS", isActive: true },
    { name: "TypeScript", icon: "TS", isActive: true },
    { name: "Python", icon: "PY", isActive: true },
    { name: "Java", icon: "JAVA", isActive: true },
    { name: "Go", icon: "GO", isActive: true },
    { name: "Ruby", icon: "RB", isActive: true },
    { name: "C++", icon: "C++", isActive: true },
    { name: "Rust", icon: "RS", isActive: true }
];

const defaultTags = [
    { name: "react", color: "#3B82F6" },
    { name: "hooks", color: "#10B981" },
    { name: "api", color: "#F59E0B" },
    { name: "database", color: "#EF4444" },
    { name: "authentication", color: "#8B5CF6" },
    { name: "performance", color: "#EC4899" },
    { name: "utils", color: "#14B8A6" },
    { name: "testing", color: "#F97316" },
    { name: "javascript", color: "#F7DF1E" },
    { name: "typescript", color: "#3178C6" },
    { name: "python", color: "#3776AB" },
    { name: "mongodb", color: "#47A248" },
    { name: "css", color: "#1572B6" },
    { name: "html", color: "#E34F26" }
];

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function seedAdmin(){
    try{
        await mongoose.connect(process.env.MONGO_URI);
        
        let admin = await User.findOne({role: "admin"});
        let adminId;
        
        if(admin){
            console.log("Admin already exists");
            adminId = admin._id;
        } else {
            const hashPassword = await bcrypt.hash("N(438720737275un", 10);

            const newAdmin = await User.create({
                name: "Super Admin",
                username: "superadmin",
                email: "agreesh777@gmail.com",
                password: hashPassword,
                role: "admin"
            });
            adminId = newAdmin._id;
            console.log("Admin created");
        }

        // Seed categories
        for (const cat of defaultCategories) {
            const existing = await Category.findOne({ name: new RegExp(`^${escapeRegExp(cat.name)}$`, 'i') });
            if (!existing) {
                await Category.create({
                    name: cat.name,
                    description: cat.description,
                    createdBy: adminId
                });
                console.log(`Seeded category: ${cat.name}`);
            } else {
                console.log(`Category already exists: ${cat.name}`);
            }
        }

        // Seed languages
        for (const lang of defaultLanguages) {
            const existing = await Language.findOne({ name: new RegExp(`^${escapeRegExp(lang.name)}$`, 'i') });
            if (!existing) {
                await Language.create({
                    name: lang.name,
                    icon: lang.icon,
                    isActive: lang.isActive,
                    createdBy: adminId
                });
                console.log(`Seeded language: ${lang.name}`);
            } else {
                console.log(`Language already exists: ${lang.name}`);
            }
        }

        // Seed tags
        for (const tag of defaultTags) {
            const existing = await Tag.findOne({ name: new RegExp(`^${escapeRegExp(tag.name)}$`, 'i') });
            if (!existing) {
                await Tag.create({
                    name: tag.name,
                    color: tag.color,
                    isActive: true,
                    createdBy: adminId
                });
                console.log(`Seeded tag: ${tag.name}`);
            } else {
                console.log(`Tag already exists: ${tag.name}`);
            }
        }

        console.log("Seeding complete successfully");
        process.exit(0)
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seedAdmin();