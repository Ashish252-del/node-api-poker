// const routes = require("express").Router();
// // const userController = require("../../controllers/userController");
// const authenticate = require("../../middleware/auth")
// const { upload } = require('../../utils/multer');
// const {
//     changePassword,
//     validate,
//     postKyc,
//     postBank
// } = require('./../auth/validator');

// module.exports = () => {
//     routes.get("/profile" ,authenticate,userController.getProfile);
//     routes.post("/update-profile" ,authenticate,userController.updateProfile);
//     routes.post("/update-profile-image" ,authenticate,upload.single("profile_image"),userController.updateProfileImage);
//     routes.post("/change-password" ,authenticate,changePassword(),validate,userController.changePassword);
//     routes.post("/update-kyc" ,authenticate,upload.single("document"),postKyc(),validate,userController.updateKyc);
//     routes.post("/add-bank-account" ,authenticate,postBank(), validate, userController.addBankAccount);
//     routes.post("/add-amount" ,authenticate,userController.addAmount);
//     //routes.post("/redeem-amount" ,authenticate,userController.redeem);
//     routes.post("/redeem-amount" ,authenticate,userController.withdrawAmount);
//     routes.get("/pool-dashboard" ,authenticate,userController.poolDashboard);
//     routes.get("/get-redeem-list" ,authenticate,userController.getRedeemList);
//     routes.get('/my-transactions',authenticate,  userController.getTransactions);
//     return routes;
// };
