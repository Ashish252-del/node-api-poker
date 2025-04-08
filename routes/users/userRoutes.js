const routes = require("express").Router();
const userController = require("../../controllers/userController");
const clubController = require("../../controllers/clubController");
const authenticate = require("../../middleware/auth")
const { upload } = require('../../utils/multer');
const {
    changePassword,
    validate,
    postKyc,
    postBank,
    postClub,
    updateProfile
} = require('./../auth/validator');
const {forgot} = require("../auth/validator");
const authController = require("../../controllers/authController");
const {handleSuccessPayment} = require("../../controllers/userController");

module.exports = () => {
    routes.get("/profile" ,authenticate,userController.getProfile);
    routes.post("/update-profile" ,authenticate,updateProfile(), validate,userController.updateProfile);
    routes.post("/update-profile-image" ,authenticate,upload.single("profile_image"),userController.updateProfileImage);
    routes.post("/change-password" ,authenticate,changePassword(),validate,userController.changePassword);
    routes.post("/update-kyc" ,authenticate,upload.single("document"),postKyc(),validate,userController.updateKyc);
    routes.post("/add-bank-account" ,authenticate,postBank(), validate, userController.addBankAccount);
    routes.get("/bank-account-list" ,authenticate,userController.getBankAccounts);
    //routes.post("/add-amount" ,authenticate,userController.addAmount);
    routes.post("/redeem-amount" ,authenticate,userController.withdrawAmount);
    routes.get("/get-redeem-list" ,authenticate,userController.getRedeemList);
    routes.post("/tds" ,authenticate,upload.single("tds_file"),userController.tds);
    routes.get("/notification-list" ,authenticate,userController.getNotification);
    routes.get('/get-game-history',authenticate,  userController.getGameHistory);
    routes.get('/my-transactions',authenticate,  userController.getTransactions);
    routes.get('/get-wallet',authenticate,  userController.getWallet);
    routes.post('/add-address',authenticate,  userController.addAddress)
    routes.post('/update-address',authenticate,  userController.updateAddress)
    routes.get('/get-address-by-id/:id',authenticate,  userController.getAddressById)
    routes.post('/user-referral',authenticate,  userController.userReferral)
    routes.get('/email-verification/:email', authenticate, userController.emailVerificationLinkSent);
    routes.get('/withdrawl-status/:transaction_id',authenticate,userController.getWithdrawlStatus)
    routes.post("/withdraw-amount" ,authenticate,userController.withdrawAmount);
    routes.get("/claim-practice-amount" ,authenticate,userController.claimPracticeAmount);

    routes.post("/send-otp",forgot(), validate, userController.sendOtp);
    routes.post("/verify-otp",forgot(),validate, userController.verifyOtp);
    routes.post("/verify-pan-detail" ,authenticate,userController.verifyPanDetail);
    routes.post("/verify-adhaar-detail" ,authenticate,userController.verifyAdhaarDetail);
    routes.post("/verify-adhaar-otp" ,authenticate,userController.verifyAdhaarOtpDet);
    routes.get("/private-tables/game-type-list" ,authenticate, userController.gameTypeListForPrivateTable);
    routes.post("/create/private-table" ,authenticate, userController.createGameForPrivate);
    routes.put("/delete/private-table", authenticate , userController.changeGameStatusPrivateRoom)
    routes.get("/avatar/all",authenticate,userController.get_all_avatars)
    
    // routes.post("/save-pool-game-history",authenticate,userController.savePoolGameHistory)
    routes.get("/get-banner", authenticate, userController.getBanner);
    routes.get("/logout" ,authenticate,userController.logout);

    routes.post("/update-wallet" ,userController.updateWalletForFantasy);
    routes.post("/update-wallet-refund" ,userController.updateWalletRefund);
    routes.post("/update-win-wallet-fantasy" ,userController.updateWinWalletForFantasy);

    routes.post("/add-amount" ,authenticate,userController.depositAmount);
    routes.post("/deposit-callback" ,userController.handleSuccessPayment);
    return routes;
};
