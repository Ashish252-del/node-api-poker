const express = require("express");
//const publicRoutes = require("./public");
//const publicAdminRoutes = require("./public_admin");
const userRoutes = require("./user");
const gameRoutes = require("./game");
//const walletRoutes = require("./wallet");
//const botRoutes= require("./bot");
const adminRoutes = require("./admin");
const adminMiddleware = require("../../middleware/adminAuth");
const authenticate = require("../../middleware/auth")

const Router = express.Router();

//Router.use("/api/ludo", publicRoutes);
//Router.use("/api/ludo/admin", publicAdminRoutes);
Router.use("/admin",authenticate, adminRoutes);
Router.use("/user", authenticate, userRoutes);
Router.use("/game", gameRoutes);
//Router.use("/api/ludo/wallet", authenticate, walletRoutes);
//Router.use("/api/ludo/bot", botRoutes)
module.exports = Router;
