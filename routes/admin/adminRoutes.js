const routes = require("express").Router();
const adminController = require("../../controllers/adminController");
const authenticate = require("../../middleware/adminAuth")
const { upload } = require('../../utils/multer');
const {
    postLogin,
    postGame,
    changePassword,
    postCategory,
    postGameType,
    validate201,
    postEditCategory,
    postEditGameType,
    forgot,
    resetPassword,
    verifyOtp,
    postRoleModule,
    postUserRole,
    validateModule,
    postRoleModule_ids,
    updateRoleModule_ids,
    updateUserRoleValidator,
    addUserRoleValidator
} = require('./../admin/validator');
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const process = require('process');
const dotenv = require("dotenv");
const { Router } = require("express");
const clubController = require("../../controllers/clubController");
const s3 = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID, // store it in .env file to keep it safe
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    region: process.env.AWS_REGION // this is the region that you select in AWS account
})
const s3Storage = multerS3({
    s3: s3, // s3 instance
    bucket: process.env.AWS_BUCKET_NAME, // change it as per your project requirement
    metadata: (req, file, cb) => {
        cb(null, {fieldname: file.fieldname})
    },
    key: (req, file, cb) => {
        const fileName = Date.now() + "_" + file.fieldname + "_" + file.originalname;
        cb(null, fileName);
    }
});
const uploadImage = multer({
    storage: s3Storage,
})
module.exports = () => {
    routes.get("/running-tables-rummy",authenticate, adminController.running_tables_rummy);
    routes.post("/forgot-password", forgot(), validate201, adminController.forgotPassword);
    routes.post("/verify-otp-for-forgot-password", verifyOtp(), validate201, adminController.verifyOtpForForgotPassword);
    routes.post("/reset-password", resetPassword(), validate201, adminController.resetPassword);
    routes.post("/login", postLogin(), validate201 ,adminController.adminLogin);
    routes.get("/profile", authenticate, adminController.getProfile);
    routes.get("/dashboard", authenticate ,adminController.dashboard);
    routes.get("/admin-activity-log/:id", authenticate, adminController.adminActivity);
    routes.post("/change-password" ,authenticate,changePassword(),validate201,adminController.changePassword);
    routes.get("/user-list",  adminController.userList);
    routes.post("/update-user-profile" ,authenticate,adminController.updateUserProfile);
    routes.get("/active-user-list", authenticate, adminController.activeUserList);
    routes.get("/active-user-list-new", authenticate, adminController.activeUserListNew);
    routes.get("/today-user-list", authenticate, adminController.todayUserList);
    routes.get("/user-details/:id", authenticate, adminController.userDetail);
    routes.get("/user-login-log/:id", authenticate, adminController.userLoginActivity);
    routes.get("/user-activity-log/:id", authenticate, adminController.userActivity);
    routes.get("/user-kyc/:userid", authenticate, adminController.userKycDetail);
    routes.get("/user-bank-account/:userid", authenticate, adminController.userBankAccount);
    routes.post("/filter-user", authenticate, adminController.filterUser);


    //  club_member_Roles
    routes.post("/add-member-role",authenticate, adminController.addMemberRole);
    routes.post("/add-club-module",authenticate, adminController.addclubModule);
    routes.post("/add-club-member-role-module",authenticate, adminController. addclubMemberRoleModule);
   
    // addclubModule

    // adding the module to the db ->
    routes.post("/add-module",authenticate,validateModule(),validate201, adminController.addModule);
    routes.post("/update-module",authenticate,validateModule(),validate201, adminController.updateModule);
    routes.post("/del-module",authenticate, adminController.delModule);
    routes.get("/get-all-module",authenticate, adminController.getAllModules);

 
    // related to role module ->
    routes.post("/add-role-module",authenticate,postRoleModule_ids(),validate201, adminController.addRoleModule);
    routes.post("/del-role-module",authenticate,postRoleModule(),validate201, adminController.deleteRoleModule);
    routes.post("/update-role-module",updateRoleModule_ids(),validate201,authenticate,adminController.updateRoleModules);

     // related to user role ->
     routes.post("/add-user-role",addUserRoleValidator(),validate201,authenticate,adminController.addUserRole);
     routes.post("/del-user-role",authenticate,postUserRole(),validate201,adminController.deleteUserRole);
     routes.post("/update-user-role",authenticate, updateUserRoleValidator(),validate201,authenticate,adminController.updateUserRole);
    //  updateUserRole

    routes.post("/add-role",authenticate, adminController.addRole);
    routes.get("/role-list", authenticate,adminController.roleList);
    routes.get("/role-detail",authenticate, adminController.roleById);
    routes.post("/update-role" ,authenticate,adminController.updateRoleById);
    routes.get("/active-role-list",authenticate,adminController.activeRoleList);
    routes.post("/change-role-status",authenticate,adminController.changeRoleStatus);

    routes.post("/add-game-category",postCategory(), validate201, authenticate, adminController.addGameCategory);
    routes.get("/game-category-list", authenticate, adminController.gameCategoryList);
    routes.get("/game-category-detail/:id", authenticate, adminController.gameCategoryById);
    routes.post("/update-game-category", authenticate,postEditCategory(), validate201, adminController.updategameCategoryById);
    routes.post("/change-game-category-status", authenticate,adminController.changeGameCategoryStatus);
    routes.get("/active-game-category-list", authenticate,adminController.getActiveGameCategoryList);

    routes.post("/add-game-type", postGameType(), validate201, authenticate, adminController.addGameType);
    routes.get("/game-type-list", authenticate, adminController.gameTypeList);
    routes.get("/game-type-detail/:id", authenticate, adminController.gameTypeById);
    routes.post("/update-game-type", authenticate,postEditGameType(), validate201,adminController.updategameTypeById);
    routes.post("/change-game-type-status", authenticate,adminController.changeGameTypeStatus);

    routes.get('/get-game-fields', authenticate, adminController.getGameFields)
    routes.post("/create-game", authenticate, postGame(), validate201 ,adminController.createGame);
    routes.get("/game-list", authenticate, adminController.gameList);
    routes.get("/game-detail/:id", authenticate, adminController.gameDetail);
    routes.post("/update-game", authenticate, postGame(), validate201 ,adminController.updateGame);
    routes.post("/change-game-status", authenticate,adminController.changeGameStatus);
    routes.get("/game-tables",authenticate,adminController.getGameTables)
    routes.get("/get-user-game",authenticate,adminController.getUserGames)

    routes.post("/add-price-structure", authenticate, adminController.addPriceStructure);
    routes.get("/price-structure-list", authenticate, adminController.priceStructureList);
    routes.get("/price-structure-detail/:id", authenticate, adminController.priceStructureById);
    routes.post("/update-price-structure", authenticate,adminController.updatePriceStructureById);
    routes.get("/delete-price-structure", authenticate,adminController.deletePriceStructure);

    routes.post("/add-blind-structure",  authenticate, adminController.addBlindStructure);
    routes.get("/blind-structure-list", authenticate, adminController.blindStructureList);
    routes.get("/blind-structure-detail/:id", authenticate, adminController.blindStructureById);
    routes.post("/update-blind-structure", authenticate,adminController.updateBlindStructureById);
    routes.get("/delete-blind-structure", authenticate,adminController.deleteBlindStructure);
    routes.get("/get-club-list",authenticate,adminController.getClubList)
    routes.get("/get-club-detail",authenticate,adminController.getClubDetail)
    routes.post("/change-club-status",authenticate,adminController.changeClubStatus)
    routes.post("/create-vip-priviledge",authenticate,adminController.createVipPriviledge)
    routes.post("/update-vip-priviledge",authenticate,adminController.updateVipPriviledge)
    routes.get("/get-vip-priviledge",authenticate,adminController.getAllVipPriviledge)
    routes.get("/get-vip-priviledge-id",authenticate,adminController.getVipPriviledgeById)
    routes.post("/change-vip-priviledge-status", authenticate,adminController.changeVipPriviledgeStatus);
    routes.post("/add-club-level",authenticate,adminController.addClubLevel)
    routes.post("/update-club-level",authenticate,adminController.updateClubLevel)
    routes.get("/get-club-level-detail",authenticate,adminController.getClubLevelById)
    routes.get("/get-club-level-list",authenticate,adminController.getAllClubLevel)

    routes.post("/add-shop",authenticate,adminController.addShop)
    routes.post("/update-shop",authenticate,adminController.updateShop)
    routes.get("/get-shop-detail",authenticate,adminController.getShopById)
    routes.get("/get-shop-list",authenticate,adminController.getAllShop)
    routes.post("/change-shop-status", authenticate,adminController.changeShopStatus);

    routes.post("/add-mission",authenticate,adminController.addMission)
    routes.post("/update-mission",authenticate,adminController.updateMission)
    routes.get("/get-mission-detail",authenticate,adminController.getMissionById)
    routes.get("/get-mission-list",authenticate,adminController.getAllMission)

    routes.post("/upload-file", uploadImage.single("image"), adminController.uploadImage);
    routes.get("/get-member-detail", authenticate,adminController.memberDetails);

    routes.post("/avatar/add",authenticate,uploadImage.single("image"),adminController.add_avatar);
    routes.get("/avatar/all",authenticate,adminController.get_all_avatars)
    routes.put("/avatar/delete",adminController.delete_avatar)

    routes.post("/send-notification",authenticate,adminController.sendNotification)
    routes.get('/get-winning-amount',authenticate, adminController.getWinningAmount)
    routes.get('/get-game-wise-users', authenticate, adminController.getGameWiseUsers);
    routes.get('/get-game-history', authenticate, adminController.getGameHistory);
    routes.get("/get-leaderboard-data",adminController.getLeaderBoardData);
    routes.get('/get-running-table', authenticate, adminController.getRunningTable);
    routes.get('/get-total-table', authenticate, adminController.getTotalTable);

    routes.post("/add-banner", authenticate, uploadImage.single("image"), adminController.addBanner);
    routes.get("/banner-list", authenticate, adminController.bannerList);
    routes.get("/banner-detail/:id", authenticate, adminController.bannerById);
    routes.post("/update-banner", authenticate,uploadImage.single("image"),adminController.updateBannerById);
    routes.post("/change-banner-status", authenticate,adminController.changeBannerStatus);
    routes.post("/create-tournament", authenticate,adminController.createTournament);
    routes.get("/tournament-list", authenticate, adminController.tournamentList);
    routes.get("/tournament-detail/:id", authenticate, adminController.tournamentDetail);
    routes.post("/update-tournament", authenticate, adminController.updateTournament);
    routes.post('/update-status-tournament',authenticate,adminController.updateTournamentStatus);
    routes.get('/cancel-tournament',authenticate,adminController.cancelTournament);
    routes.get('/get-type-list-by-name',authenticate,adminController.getTypeListByName);

    routes.get('/pending-withdrawal', authenticate, adminController.pendingWithdrawal)
    routes.get('/today-withdrawal', authenticate, adminController.todayWithdrawal)
    routes.get('/today-deposit', authenticate, adminController.todayDeposit)
    routes.get('/total-winnings', authenticate, adminController.totalWinning)
    routes.get("/ledger-detail",  adminController.ledgerDetails);
    routes.get('/tds-summary', authenticate, adminController.tdsSummary)
    routes.get('/gst-summary', authenticate, adminController.gstSummary)
    routes.post('/add-deposit', authenticate, adminController.addDeposit);
    routes.get('/rake-commission-summary', authenticate, adminController.commissionSummary)

    routes.post('/change-withdrawl-status', authenticate, adminController.changeWithDrawlStatus)
    routes.get('/cash-transaction', authenticate, adminController.cashTransaction)

    routes.post('/bonus-update',authenticate,adminController.bonusUpdate);
    routes.get('/get-bonus-setting-data',authenticate,adminController.getBonusData);
    routes.get('/ludo-users', authenticate, adminController.getLudoUsers)
    // routes.get("/pool-user",authenticate,adminController.getPoolUsers)
    routes.post('/update-user-game-status', authenticate, adminController.gameWiseUserStatus);
    routes.get("/get-pocker-suspicious-actions",authenticate,adminController.getAllpockerSuspiciousActions)
    routes.get("/game-wise-commission",authenticate,adminController.gameWiseCommission)

    routes.get("/live-users",authenticate,adminController.liveUserCount)
    routes.get("/get-game-history-data",authenticate,adminController.getGameHistoryData)
    return routes;
};
