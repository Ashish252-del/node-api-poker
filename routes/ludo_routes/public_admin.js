const express = require("express");
const { validate } = require("express-validation");

const userController = require("../controllers/user/admin.user.controller");
const userValidator = require("../controllers/user/user.validator");
const adminUserController = require('../controllers/user/admin.user.controller')
const adminvalidator = require('../controllers/user/admin.validator');
const router = express.Router();

//= ===============================
// Public routes
//= ===============================
router.get("/test", (req, res) => {
    res.send("ok");
});

router.post("/login", validate(userValidator.loginAdmin), userController.login);
router.post(
    "/verify-otp",
    validate(userValidator.verifyOTP),
    userController.verifyOTP
);
router.get(
    "/user/exist/:mobile",
    validate(userValidator.checkUserExists),
    userController.checkUserExist
);
// router.post(
//     "/signup",
//     validate(userValidator.registerAdmin),
//     userController.register
// );
router.get(
    "/send-otp/email/:email",
    validate(userValidator.sendEmailOTP),
    adminUserController.sendEmailOTP
  );
  router.post(
    "/verify-otp/email",
    validate(userValidator.verifyEmailOTP),
    adminUserController.verifyEmailOTP
  );
  router.put(
    "/forgot-password",
    validate(adminvalidator.forgotPassword),
    adminUserController.forgotPassword
  );

router.get('/download-users-list',userController.userExport);
module.exports = router;
