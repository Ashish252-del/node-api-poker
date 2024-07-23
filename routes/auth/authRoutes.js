const routes = require("express").Router();
const authController = require("../../controllers/authController");
const userController = require("../../controllers/userController");
const {
    postLogin,
    postSignup,
    validate,
    forgot,
    resetPassword,
} = require('./../auth/validator');

module.exports = () => {
    routes.post("/login", postLogin(), validate ,authController.userLogin);
    routes.post("/register", postSignup(), validate, authController.userSignup);
    routes.post("/verify-otp", forgot(), validate, authController.verifyOtp);
    routes.post("/forgot-password", forgot(), validate, authController.forgotPassword);
    routes.post("/verify-otp-for-forgot-password", forgot(), validate, authController.verifyOtpForForgotPassword);
    routes.post("/resend-otp", forgot(), validate, authController.resendOtp);
    routes.post("/reset-password", resetPassword(), validate, authController.resetPassword);


    routes.get('/return', async (req, res) => {
        let paymentStatus = await userController.updateAmount(req.query.order_id);
        console.log(paymentStatus);
        res.render('success.ejs', {
            order_id: req.query.order_id,
            payment_status: paymentStatus
        });
    });
    routes.get('/email-verify', async (req, res) => {
        let status = await userController.emailVerify(req.query.token);
        console.log(status);
        res.render('email-verify.ejs', {
            status: status
        });
    });

    return routes;
};
