'use strict';
/******************************************************************
 * EXPRESS ROUTING TO REDIRECT USER REQUEST TO THE GIVEN CONTROLLER
 ********************************************************************/
// const authRoutes = require('./auth/authRoutes');
const express = require("express");
const Router = express.Router();
const adminRoutes = require('./admin/adminRoutes');
const userRoutes = require('./users/userRoutes');
const gameRoutes = require('./game/gameRoutes');
const tournamentRoutes = require('./tournament/tournamentRoutes');
const responseHelper = require('../../helpers/customResponse');
// module.exports = (app) => {
//    app.use((req, res, next) => {
//       res.setHeader('Access-Control-Allow-Origin', '*');
//       res.setHeader(
//          'Access-Control-Allow-Methods',
//          'GET,POST,DELETE,PUT,PATCH,OPTIONS'
//       );
//       res.setHeader(
//          'Access-Control-Allow-Headers',
//          'Content-Type,Authorization,token'
//       );
//       next();
//    });

//    app.use("/api/v1/auth", authRoutes(app));
   Router.use("/admin", adminRoutes(Router));
   // app.use("/api/v1/user", userRoutes(app));
   Router.use("/game", gameRoutes(Router));
   Router.use("/tournament", tournamentRoutes(Router));
   module.exports = Router;
//    app.get('*', (req, res) => {// eslint-disable-line
//       let responseData = {};
//       responseData.msg = 'UnAuthorized Access';
//       return responseHelper.unAuthorize(res, responseData);
//    });
// };
