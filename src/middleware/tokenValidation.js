const jwt = require("jsonwebtoken");

module.exports = (req,res, next) => {
    const token = req.header("Authorization");

    if(!token){
        return res.status(401).json({
            success: false,
            message:"Unauthorized",
            errors: null
        })
    }
    try {
        const decode = jwt.verify(
            token.replace("Bearer ",""),
            process.env.JWT_SECRET
        )

        req.user = decode;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
            errors: null
        });
    }
}
