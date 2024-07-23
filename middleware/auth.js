const jwt = require("jsonwebtoken");
const db = require("../helpers/db");
const config = require("../config/config.json");
const responseHelper = require('../helpers/customResponse');
module.exports = async (req, res, next) => {
    const { authorization } = req.headers;
    console.log(authorization);
    let responseData = {};
    if (!authorization) {
        responseData.msg = 'UnAuthorized Accesss';
        return responseHelper.unAuthorize(res,responseData);
    }
    const token = authorization.split(' ')[1];
    console.log(token);
    jwt.verify(token, config.jwtTokenInfo.secretKey, async (err, decoded) => {
        if (err) {
            responseData.msg = err;
            return responseHelper.unAuthorize(res,responseData);
        }
        console.log(decoded.id);
        const user = await db.users.findOne({
            where: { user_id: decoded.id },
        });
        req.user = user;
        next();
    });
};
