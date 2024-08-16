const express = require("express");
const { validate } = require("express-validation");
const userController = require("../../controllers/ludo_controllers/user/admin.user.controller");
const userValidator = require("../../controllers/ludo_controllers/user/user.validator");
const adminValidator = require("../../controllers/ludo_controllers/user/admin.validator");
const gameValidator = require("../../controllers/ludo_controllers/game/game.validator");
const adminGameController = require("../../controllers/ludo_controllers/game/admin.game.controller");
const gameController = require('../../controllers/ludo_controllers/game/game.controller');
const  router = express.Router();
// ===========
const multer = require("multer");
const { memoryStorage } = require("multer");

const storage = memoryStorage();
const upload = multer({ storage });

const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");
const { Router } = require("express");

// create s3 instance using S3Client
// (this is how we create s3 instance in v3)
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
// ===========
//= ===============================
// Admin routes
//= ===============================
// router.get("/user/all", userController.allUsers);
// router.get("/user/verified", userController.UserWithKyc);
// router.get('/get-user-details/:user_id',userController.getUserDetail);
// router.get("/user/top", userController.mostWinsUsers);
// router.get("/dashboard", userController.dashboard);
router.post(
  "/game/type",
  validate(gameValidator.create_gametype),
  adminGameController.create_gameType
);
router.post(
  "/game/varient",
  validate(gameValidator.create_gameVarient),
  adminGameController.create_gameVarient
);
router.get("/game/type/all", adminGameController.allTypes);
router.get("/game/varient/all", adminGameController.allVarients);
router.put(
  "/game/type/status/:id",
  validate(gameValidator.update_status),
  adminGameController.Update_typeStatus
);
router.put(
  "/game/varient/status/:id",
  validate(gameValidator.update_status),
  adminGameController.Update_varientStatus
);
router.get("/game/types/active", adminGameController.active_types);
router.get("/game/varients/active", adminGameController.active_varients);
router.post(
  "/game/create",
  validate(gameValidator.create_game),
  adminGameController.create_game
);
router.post(
  "/shop/create",
  uploadImage.single("image"),
  validate(gameValidator.create_shop),
  adminGameController.create_shop
);
router.post(
  "/shop/update",
  uploadImage.single("image"),
  validate(gameValidator.update_shop),
  adminGameController.update_shop
);
router.post(
  "/shop/create/goods",
  uploadImage.single("image"),
  validate(gameValidator.goods),
  adminGameController.goods
);
router.post(
  "/shop/goods/update",
  uploadImage.single("image"),
  validate(gameValidator.update_goods),
  adminGameController.update_goods
);
router.post(
  "/avatar/add",
  uploadImage.single("image"),
  validate(gameValidator.add_avatar),
  adminGameController.add_avatar
);
router.get("/avatar/all",adminGameController.get_all_avatars)
router.put(
  "/avatar/delete",
  adminGameController.delete_avatar
)


// router.post("/add-withdrwal-fee",validate(gameValidator.add_withdrawls_fee),adminGameController.add_withdrawls_fee)
// router.get("/get-all-withdrawls-fee",adminGameController.getAllWithdrawlsFees)
// router.get("/get_withdrawls_fee_by_id/:id",adminGameController.getWithdrawlsFeeById)
// router.put("/update-withdrwal-fee",validate(gameValidator.updateWithdrawlsFee),adminGameController.updateWithdrawlsFee)



// router.post("/add-bank-details",validate(gameValidator.addBankDetails),adminGameController.addBankDetails)
// router.get("/get-All-banks-details",adminGameController.getBankDetails)
// router.get("/get-bank-details/:id",adminGameController.getBankDetailsById)
// router.put("/update-bank-details",validate(gameValidator.updateBankDetails),adminGameController.updateBankDetails)

// router.post("/reward/create",validate(gameValidator.create_reward),adminGameController.create_reward)
// router.put("/reward/update",validate(gameValidator.update_reward),adminGameController.update_reward)
// router.get("/reward/all",adminGameController.all_reward)
// router.delete('/reward/delete/:id', adminGameController.delete_reward);
// router.get("/reward/get/:id",adminGameController.get_reward_by_id)

router.post("/add-prize-structure", adminGameController.addPrizeStructure);
router.get("/prize-structure-list", adminGameController.prizeStructureList);
router.get("/prize-structure-detail/:id", adminGameController.prizeStructureById);
router.post("/update-prize-structure",adminGameController.updatePrizeStructureById);
router.put("/delete-prize-structure", adminGameController.deletePrizeStructure);

// router.post("/send-notification",adminGameController.sendNotification)
// router.post("/add-url",validate(gameValidator.add_web_url),adminGameController.add_web_url);
// router.get("/get-url",adminGameController.get_web_url);
// router.get("/get-url-by-id/:id",adminGameController.get_web_url_by_id);
// router.post("/update-url",validate(gameValidator.update_web_url),adminGameController.update_web_url);



router.get("/shop/id", adminGameController.get_shop_by_id);
router.get("/shop/goods/id",adminGameController.get_goods_by_id)
router.get("/shop/goods/all",adminGameController.get_all_goods)
router.post("/shop/status",adminGameController.change_shop_status)
router.put("/shop/delete/id", adminGameController.delete_shop_by_id);
router.put("/shop/goods/delete/id",adminGameController.delete_goods_by_id)


router.get("/game/all", adminGameController.all_games);
router.get("/game/id", adminGameController.gamesById);
router.get("/gamevarient/id", adminGameController.gameVarientById);
router.post("/game/gamevarient/update",adminGameController.update_gameVarient)
router.put("/game/gamevarient/delete",adminGameController.delete_gameVarient);

router.put(
  "/game/status/:id",
  validate(gameValidator.update_status),
  adminGameController.update_gamestatus
);

router.get('/game/history',adminGameController.admin_game_history); // changes need to be done 
// router.post('/create/tournament', adminGameController.create_tournament)
// router.get('/all/tournaments/:page',adminGameController.tournaments)
// router.get("/tournaments/id", adminGameController.tournamentsById);
router.get("/leaderboard/daily",gameController.leaderboard_daily);
router.get("/leaderboard/weekly",gameController.leaderboard_weekly);
router.get("/leaderboard/monthly",gameController.leaderboard_monthly);
// router.put('/tournament/cancel',adminGameController.cancel_tournament);
// router.put('/tournament/update/timestamp',adminGameController.updateDate_tournament);
router.put('/update/game/:id',validate(gameValidator.update_game),adminGameController.update_game);
// router.post('/bonus-update',adminGameController.bonusUpdate);
// router.get('/get-bonus-data',adminGameController.getBonusData);
// router.get('/get-withdraw-history',adminGameController.getWithdrawHistory);
// router.post('/approve-withdraw-request',adminGameController.acceptWithdrawRequest);
// router.get('/get-transactions',adminGameController.getTransactions);
// router.get('/get-kyc-details/:user_id',adminGameController.getKycdetails);
// router.get('/update-status-kyc-details',adminGameController.updateStatusKycDetails);
// router.get('/get-bank-details/:user_id',adminGameController.getBankdetails);
// router.get('/pending-withdrawal', adminGameController.pendingWithdrawal)
// router.get('/today-withdrawal', adminGameController.todayWithdrawal)
// router.get('/today-deposit',  adminGameController.todayDeposit)
// router.get("/tournament-history", adminGameController.getTournamentHistory);




router.post('/add-chat-template', userController.addChatTemplate)
router.get('/get-chat-template', userController.getChatTemplate)
router.get('/get-chat-template-by-id/:id', userController.getChatTemplateById)
router.put('/update-chat-template/:id', userController.updateChatTemplate)
router.get('/delete-chat-template/:id', userController.deleteChatTemplateById)

// router.post("/add-promocode", userController.addPromocode);
// router.get("/promocode-list", userController.promocodeList);
// router.get("/promocode-detail/:id", userController.promocodeById);
// router.post("/update-promocode",  userController.updatePromocodeById);
// router.post("/change-promocode-status", userController.changePromocodeStatus);

// router.post('/tds-setting-update',userController.tdsSettingUpdate);
// router.get('/get-tds-setting',userController.getTdsSetting);

// router.post('/add-bank-account',userController.addBankAccount);
// router.get('/get-bank-account',userController.getBankAccount);

// router.get('/get-home-data',userController.getHomeAccount);
// router.get('/get-all-user-bank',userController.getBankDetails);
// router.get('/get-all-kyc-list',userController.getKycList);
// router.get('/get-all-tds-list',userController.getTdsList);
// router.post('/add-bonus',userController.addBonus);



module.exports = router;
