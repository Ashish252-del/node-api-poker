const express = require("express");
// const validate = require("express-validation");
const {validate} = require("express-validation");
const userController = require("../../controllers/ludo_controllers/user/user.controller");
const userValidator = require("../../controllers/ludo_controllers/user/user.validator");
//const userWallet = require("../controllers/wallet/wallet.controller");
const router = express.Router();
 // no work done because it will be central as well 
//= ===============================
// Public routes
//= ===============================
router.get("/test", (req, res) => {
    res.send("ok");
});

router.post("/login", validate(userValidator.login), userController.login);
router.post("/login/gmail",validate(userValidator.login_with_gmail),userController.login_with_gmail)
router.get(
    "/send-otp/:mobile",
    validate(userValidator.sendOTP),
    userController.sendOTP
);
router.get(
    "/send-otp/email/:email",
    validate(userValidator.sendEmailOTP),
    userController.sendEmailOTP
);
router.post(
    "/verify-signup",
    validate(userValidator.verifySignup),
    userController.verifySignup
);
router.post(
    "/verify-otp",
    validate(userValidator.verifyOTP),
    userController.verifyOTP
);
router.post(
    "/verify-otp/email",
    validate(userValidator.verifyEmailOTP),
    userController.verifyEmailOTP
);
router.put(
    "/forgot-password",
    validate(userValidator.forgotPassword),
    userController.forgotPassword
);
router.get(
    "/user/exist/:mobile",
    validate(userValidator.checkUserExists),

    userController.checkUserExist
);
router.post(
    "/signup",
    userController.register
);

router.post(
    "/verify-fb-token",
    userController.verifyFbToken
);

// router.post('/payment-status', async (req, res) => {
//     let paymentStatus = await userWallet.updatePaymentStatus(req.body.transactionId);
//     console.log(paymentStatus.code);
//     res.redirect('/api/success?transactionid=' + req.body.transactionId + '&status=' + paymentStatus.code);
// });

router.get('/success', (req, res) => {
    res.render('success.ejs', {
        transaction_id: req.query.transactionid,
        payment_status: req.query.status
    });
});

router.get('/resendOtp/:mobile', userController.resendOTP);
router.get('/checkpay', userController.checkPay);
router.get('/reset-login', userController.resetLogin);
router.get('/reset-amount', userController.resetAmount);
module.exports = router;
