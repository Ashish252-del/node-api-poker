const jwt = require("jsonwebtoken");
const db = require("../helpers/db");
const config = require("../config/config.json");
const responseHelper = require("../helpers/customResponse");
module.exports = async (req, res, next) => {
  const { authorization } = req.headers;
  console.log(authorization);
  let responseData = {};
  if (!authorization) {
    responseData.msg = "UnAuthorized Accesss";
    return responseHelper.unAuthorize(res, responseData);
  }
  const token = authorization.split(" ")[1];
  console.log(token);
  jwt.verify(token, config.jwtTokenInfo.secretKey, async (err, decoded) => {
    if (err) {
      responseData.msg = err;
      return responseHelper.unAuthorize(res, responseData);
    }
    console.log(decoded.id);
    const user = await db.admins.findOne({
      where: { admin_id: decoded.id },
    });
    req.user = user;
    // console.log("req.user",req.user);

    // checkRoutePermission(req, res, next);
    next();
  });
};
// const checkRoutePermission = async (req, res, next) => {
//   try {
//     const route = req.originalUrl;
//     const module = await db.modules.findOne({
//       where: { routes: route },
//       raw: true,
//     });
//     if (!module) {
//       return res.status(403).json({ error: "route not found" });
//     }
//     const moduleId = module.moduleId;

//     const roles = await db.role_modules.findAll({
//       where: { moduleId: moduleId },
//       raw: true,
//     });
//     const userRoles = await db.roles.findAll({
//       where: { role_id: req.user.admin_id },
//       raw: true,
//     });

//     // Check if any of the user's roles match the roles associated with the moduleId
//     const userHasPermission = userRoles.some((userRole) => {
//       return roles.some((role) => role.roleId === userRole.role_id);
//     });

//     console.log("userHasPermission-->", userHasPermission);
//     if (userHasPermission) {
//       next();
//     } else {
//       return res
//         .status(403)
//         .json({ error: "You are not permitted to access this route." });
//     }
//   } catch (error) {
//     console.error("Error in route permission middleware:", error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };
