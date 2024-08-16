const routes = require("express").Router();
const adminController = require("../../../controllers/pool_controller/adminController");
const authenticate = require("../../../middleware/adminAuth")
const { upload } = require('../../../utils/multer');
const {
    postLogin,
    postGame,
    changePassword,
    validate201,
    forgot,
    resetPassword,
    verifyOtp,
    postIcon
} = require('./../admin/validator');
const {postTournament} = require("./validator");


module.exports = () => {
    routes.post("/forgot-password", forgot(), validate201, adminController.forgotPassword);
    routes.post("/verify-otp-for-forgot-password", verifyOtp(), validate201, adminController.verifyOtpForForgotPassword);
    routes.post("/reset-password", resetPassword(), validate201, adminController.resetPassword);
    routes.post("/login", postLogin(), validate201 ,adminController.adminLogin);
    routes.get("/profile", authenticate, adminController.getProfile);
    routes.get("/admin-activity-log/:id", authenticate, adminController.adminActivity);
    routes.post("/change-password" ,authenticate,changePassword(),validate201,adminController.changePassword);

    routes.get("/user-list", authenticate, adminController.userList);
    routes.post("/update-user-profile" ,authenticate,adminController.updateUserProfile);
    routes.get("/active-user-list", authenticate, adminController.activeUserList);
    routes.get("/today-user-list", authenticate, adminController.todayUserList);
    routes.get("/user-details/:id", authenticate, adminController.userDetail);
    routes.get("/user-login-log/:id", authenticate, adminController.userLoginActivity);
    routes.get("/user-activity-log/:id", authenticate, adminController.userActivity);
    routes.get("/user-kyc/:userid", authenticate, adminController.userKycDetail);
    routes.get("/user-bank-account/:userid", authenticate, adminController.userBankAccount);
    routes.post('/block-user', authenticate, adminController.blockUser);
    routes.post('/send-notification', authenticate,upload.single("image"), adminController.sendNotification);

    routes.post("/create-game", authenticate, postGame(), validate201 ,adminController.createGame);
    routes.get("/game-list", authenticate, adminController.gameList);
    routes.get("/game-detail/:id", authenticate, adminController.gameDetail);
    routes.post("/update-game", authenticate, postGame(), validate201 ,adminController.updateGame);
    routes.post("/change-game-status", authenticate,adminController.changeGameStatus);

    routes.post("/add-emojis", authenticate, postIcon(), validate201 ,adminController.addEmojis);
    routes.get("/get-emojis", authenticate, adminController.getEmojis);
    routes.get("/delete-emojis/:id", authenticate, adminController.deleteEmojis);

    routes.get('/pending-withdrawal', authenticate, adminController.pendingWithdrawal)
    routes.get('/today-withdrawal', authenticate, adminController.todayWithdrawal)
    routes.post('/change-withdrawl-status', authenticate, adminController.changeWithDrawlStatus)
    routes.get('/today-deposit', authenticate, adminController.todayDeposit)
    routes.get('/cash-transaction', authenticate, adminController.cashTransaction)

    routes.post('/bonus-update',authenticate,adminController.bonusUpdate);
    routes.get('/get-bonus-setting-data',authenticate,adminController.getBonusData);

    routes.post("/create-tournament", authenticate, postTournament(), validate201 ,adminController.createTournament);
    routes.get("/tournament-list", authenticate, adminController.tournamentList);
    routes.get("/tournament-detail/:id", authenticate, adminController.tournamentDetail);
    routes.post("/update-tournament", authenticate, postTournament(), validate201 ,adminController.updateTournament);
    routes.post("/change-tournament-status", authenticate,adminController.changeTournamentStatus);
    return routes;
};
