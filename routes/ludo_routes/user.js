const express = require("express");
const { validate } = require("express-validation");
const userController = require("../../controllers/ludo_controllers/user/user.controller");
const gameController = require("../../controllers/ludo_controllers/game/game.controller");
const userValidator = require("../../controllers/ludo_controllers/user/user.validator");

const router = express.Router();
const multer = require("multer");
const { memoryStorage } = require("multer");

const storage = memoryStorage();
const upload = multer({ storage });

const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");

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
//= ===============================
// API routes
//= ===============================
router.get("/testone", (req, res) => {
  res.send("ok");
});
router.get("/profile", userController.profile); // fixed 
// router.post(
//   "/changePassword",
//   validate(userValidator.changePassword),
//   userController.changePassword
// );
// router.put(
//   "/:id",
//   validate(userValidator.updateUser),
//   userController.updateUser
// );
// router.get(
//   "/send-otp/:email",
//   validate(userValidator.sendEmailOTP),
//   userController.sendEmailOTPUpdateEmail
// );
// router.post(
//   "/verify-otp",
//   validate(userValidator.verifyEmailOTP),
//   userController.verifyEmailOTPUpdateEmail
// );
router.post( // not fix
  "/profile-picture",
    uploadImage.single("image"),
  userController.profilePictureUpload
);
router.get( // not fix 
  "/profile-picture",

  userController.getProfilePicture
);

// router.post(
//     "/user-referral",
//     userController.userReferral
// );

// router.post(
//     "/user-kyc",
//     uploadImage.fields([{
//       name: 'pan_doc', maxCount: 1
//     }, {
//       name: 'adhar_front_doc', maxCount: 1
//     }, {
//       name: 'adhar_back_doc', maxCount: 1
//     }]),
//     userController.userKyc
// );
// router.get("/get-All-banks-details",userController.getBankDetails)

// visit_app
// router.post("/visit",userController.visit_app)
// router.get("/reward/status",userController.get_reward_status)

// router.post("/reward/selected",userController.createRewardUser)
// router.get("/reward/all",userController.all_reward)
// router.get("/reward/totol-coins",userController.total_coins)

// router.get("/get-url",userController.get_web_url)
// router.get("/get-payment-url",userController.get_payment_url)

router.get("/notification-list",userController.get_notification)
router.post("/notification/delete",userController.delete_notification)
router.get("/read-notification-list",userController.get_read_notification)
router.get("/unread-notification-list",userController.get_unread_notification)
router.put("/notification/status",userController.update_is_read)


router.get("/avatar/all",userController.get_all_avatars)
router.post("/avatar/is-selected",validate(userValidator.selected_avatar), userController.selected_avatar)
router.post(
  "/shop/buy",
  validate(userValidator.buy_shop),
  userController.buy_shop
  )
//router.get("/get-all-withdrawls-fee",userController.getAllWithdrawlsFees)

router.post("/shop/good/is-selected",userController.selectedShopItem)
router.get("/shop/all",userController.all_shops)
router.post("/shop/goods",userController.get_all_goods_by_category)
router.get('/game/info/:userId', userController.userInfo);

router.get("/get/selected/shop/item",userController.getSelectedShopItem)
//router.get('/get-referral-history/:userId', userController.getReferralHistory);

// router.post('/add-bank-account',userController.addBankAccount);
// router.get('/get-bank-account',userController.getBankAccount);
// router.get('/get-kyc-details',userController.getKycDetails);
// router.post('/withdraw-request',userController.sendWithdrawRequest);
// router.get('/get-withdraw-request',userController.getWithdrawRequest);
// router.get('/get-transaction',userController.getTransaction);
// router.get('/get-chat-template', userController.getChatTemplate)
// router.get('/get-tds-details', userController.getTdsDetails)
// router.get('/get-gst-details', userController.getGstDetails)


router.get("/leaderboard",gameController.leaderboard);

// router.get("/logout",userController.logout);
// router.get('/get-referral-amount', userController.getReferralAmount)
module.exports = router;
