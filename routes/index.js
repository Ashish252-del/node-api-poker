'use strict';
/******************************************************************
 * EXPRESS ROUTING TO REDIRECT USER REQUEST TO THE GIVEN CONTROLLER
 ********************************************************************/
const authRoutes = require('./auth/authRoutes');
const userRoutes = require('./users/userRoutes');
const adminRoutes = require('./admin/adminRoutes');
const pokerRoutes = require('./game/pokerRoutes');
const clubRoutes = require('./game/clubRoutes');
const gameRoutes = require('./game/gameRoutes');
const unionRoutes = require('./game/unionRoutes');
const responseHelper = require('../helpers/customResponse');
const ludoRoutes =  require('./ludo_routes');
module.exports = (app) => {
   app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader(
         'Access-Control-Allow-Methods',
         'GET,POST,DELETE,PUT,PATCH,OPTIONS'
      );
      res.setHeader(
         'Access-Control-Allow-Headers',
         'Content-Type,Authorization,token'
      );
      next();
   });
   app.use("/api/v1/ludo",ludoRoutes);
   app.use("/api/v1/auth", authRoutes(app));
   app.use("/api/v1/user", userRoutes(app));
   app.use("/api/v1/admin", adminRoutes(app));
   app.use("/api/v1/poker", pokerRoutes(app));
   app.use("/api/v1/game", gameRoutes(app));
   app.use("/api/v1/poker/club", clubRoutes(app));
   app.use("/api/v1/poker/union", unionRoutes(app));

   // app.get('*', (req, res) => {// eslint-disable-line
   //    let responseData = {};
   //    responseData.msg = 'UnAuthorized Access';
   //    return responseHelper.unAuthorize(res, responseData);
   // });
};
