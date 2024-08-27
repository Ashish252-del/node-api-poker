const {Sequelize, Op} = require("sequelize");
const NodeRSA = require('node-rsa');
const forge = require('node-forge');
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const axios = require("axios");
const querystring = require("querystring");
const {TRANSACTION_TYPE} = require("../helpers/constants");
// const {user, user_otp, transaction, user_referral, user_wallet, bonus_setting, game_history, user_kyc, bank_account, redemption, chat_template,tds_setting,shop,
//     shop_goods,
//     shop_users,
//     setting,
//     avatar,
//     reward_user,
//     reward,
//     user_last_visit,
//     admin_bank_Details,
//     withdrawls_fee,
// notifications} = require("../../models");
//const {OTP, addRazorPayContact, addBankToRazorpay, payoutStatus,addUpiToRazorpay} = require('../../utils/payment')
const {
    successResponse,
    errorResponse,
    uniqueId,
    validateMobile,
    validateEmail,
    validateStrongPassword,
    getMD5Hased,
    make
} = require("../helpers");
const db = require("../../../helpers/db");
const {DEFAULT_TEST_OTP} = require("../helpers/constants");
// const sendEmail = require("../../utils/sendEmail");
// const sendOtp = require("../../utils/sendOtp");
const {uploadToS3, getUserPresignedUrls} = require("../helpers/s3");
const PRIVATE_KEY=`-----BEGIN PRIVATE KEY-----
MIIEoQIBAAKCAQB0ZacT13Ok+3pX0lmuJ9dJF6atV7Vwv5gmgpvXiBVYKKM4sfGb
2qg395uVcampRgLrM63KxElPkWaa90j10ol6fnHneE3sGuNIrvUmSvtqgeSD8nS4
GXdkDecD+HSB7OCOcr+oxsGZzXJdzN/5QyUdDGpRTlm8T+yB6wa9sJPPgZJ/C650
JF57WF+G3qSngqJZEtGrKLlZYL24AqVEg85dgLsrawWpZUEGeYqhYsdSeoGqkAR6
E8Ybw+YWEYCFyMLZi2Fe5MVwMARWQ5kzpKTx0ur7DPsghrAem08DIAekAN97F1DS
48Vs88T29C2716ylE27ICyiMLDw9DLXekhADAgMBAAECggEAVOd1iU6mx5i89GS3
EAd1zZZX+ae57SWE2cp53S0hzK3P6eI7CGHmRPTz434GsTglluWahwbJJyY7vxxU
dyP9LoIfmiWySWCPnAwrPKSDYnyfcPQh2cyRv0U41zeb3M4qOx5O2dEplYQ8QVnZ
opws7VSKFQbfBDMUpOwIfcPY/gpVIp/RhmOfYGGZrlGU9yvYLjykNRET0xT8bGl0
WatAS4xrQFU9YR3bVPEkzC89dlyINRzu28YzE3pXatMH5lAoUoUtg/+haFp54Vb4
acK0qMjwzkMlPmBP7FDQee+dIARNa822b78OlOHGnA8jXkgBWVbuujO1El1sSxZD
eaJEcQKBgQDeROiZJk/sgY6TMbwJdfLM0T1MhB60QYPULPrewTLd0Xh/Bn3h/v/4
bnq3mmC5Fwnyayfrds1OIVL0Qsuo9J0KAR/pMyO3c0Cbw6g3AnUXcugOGrcfvHaO
aJQfJOldXUcDq2r5DYFnTgKii/hwsnKbwV5zHiLNw45axL2m9swE2wKBgQCGD6UI
yx3hfBah9UsznebTXIHKeyUGtEk81uAJXt3AexW4WftejFoyNeX6ZW8hQs2O7wKL
QSRtWwM66n7VF1eb5GQfPk2pOK66fY6R9gGLfuXtdx0O525aVRd3snkCTiE7HXtf
6Ibs0ta/Tos4amqRUDiRZCkfecVnMykzOWA1+QKBgA+hpv4GTL6kSeOeLsw3iFDR
Mk9sR0CEDwJf+3CpA6vH7IJ6cWXwag4NrwG0kLLTpPZwhMkxfLTO8SeOfwYt1dF7
TMQ4vX1MVLHfq7faq2NvyFQdmt1Xgrr3LduW2/ad9b2TU52aTox2VwcZcupyEk9T
5RGRf/8ajqthhLj2SFjbAoGAK4WQslYekUFTp6iWjV9JvHxftnhcAN0umY24ldIy
c3aCCqNLs9okvgA5dRzRAx9I1IpLbSHszYOqfMn7+vnk+zseNfZoB/Pa5bg1PLV8
suizhHATAu+nJ7RQNg++sTzkFOjxUKWQh/m6tcit8da6WgqNEsZNg2Zo66P0UCjk
TyECgYAuPX7yvGK9Q5bpvIK5yel+PHRQveKl2IREwUvhHQ34tOLUqtiQD6YC/Zog
6bjF0alj9elyBSR9TP3Pa12Kkbh8tsKaQuhScWgHTepI+mmTFWe+mvzQDqurOKyj
B3li1xoC0Xm3kXdd67IxX/YtOo1wCALvvCXkZBGzQBr/erbZyA==
-----END PRIVATE KEY-----`

module.exports.register = async (req, res) => {
    try {
        let {mobile, email} = req.body;
        const searchQuery = [{mobile}];
        if (email) {
            searchQuery.push({email});
        }

        const userData = await user.findOne({
            where: {[Op.or]: searchQuery},
        });

        if (userData) {
            const existKey =
                userData.email === email
                    ? "email"
                    : userData.mobile == mobile
                    ? "mobile"
                    : "";

            return errorResponse(req, res, `User already exists with ${existKey}`);
        }
        const otp =
            process.env.NODE_ENV == "production"
                ? OTP()
                : String(DEFAULT_TEST_OTP);
        sendOtp(mobile, otp);
        // await sendOtp(`+91${mobile}`, otp); (this will be implemented)
        console.log("otp-->",otp);
        const hashedOTP = crypto.createHash("md5").update(otp).digest("hex");
        const info = {
            otp: hashedOTP,
            expiresIn: Date.now() + 300000,
            mobile,
            isVerified: false
        };
    

        const userOtps = await user_otp.findAll({
            where: {mobile},
        });

        if (userOtps.length > 0) {
            await user_otp.destroy({
                where: {},
                include: [
                    {
                        model: user,
                        as: user.userId,
                        where: {mobile: mobile},
                    },
                ],
            });
        }
      

        await user_otp.create(info);
        return successResponse(req, res, {
            message: "OTP send successfully",
            otp: otp
        });
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};
module.exports.verifySignup = async (req, res) => {
    try {
        const {mobile, otp, email, password,  macAddress,device_token} = req.body;
        console.log("device_token-->",device_token);
         // Parse the private key using forge
         const privKey = forge.pki.privateKeyFromPem(PRIVATE_KEY);

         // Get the encrypted message from the request body
         const encryptedMessageBytes = Buffer.from(req.body.password, 'base64');
 
         // Decrypt the message using the private key
         const decryptedMessageBytes = privKey.decrypt(encryptedMessageBytes);
         const decryptedMessage = forge.util.decodeUtf8(decryptedMessageBytes);
         console.log("decryptedMessage--->", decryptedMessage);

        const userOtp = await user_otp.findOne({
            where: {mobile: mobile},
        });

        if (!userOtp) {
            return errorResponse(req, res, `No OTP found with this mobile`);
        }
        const {expiresIn} = userOtp;
        const hashedOtp = userOtp.otp;
        if (expiresIn < Date.now()) {
            await user_otp.destroy({
                where: {},
                include: [
                    {
                        model: user,
                        as: user.userId,
                        where: {mobile: mobile},
                    },
                ],
            });
            return errorResponse(req, res, "OTP has expired");
        }
        const reqOTP = crypto
            .createHash("md5")
            .update(otp || "")
            .digest("hex");

        if (reqOTP !== hashedOtp) {
            throw new Error("Invalid otp");
        }

        const reqPass = getMD5Hased(decryptedMessage);
        const awatarData=await avatar.findOne({where:{id:1}});

        const payload = {
            mobile,
            password: reqPass,
            isVerified: true,
            isMobileVerified: true,
            verifyToken: uniqueId(),
            referralCode: uniqueId(6).toUpperCase(),
            isLogin: 1,
            macAddress:macAddress,
            avatarId:1,
            profilePic:awatarData.url,
            device_token:device_token
        };
        if (email) {
            payload.email = email;
        } else {
            payload.email = null;
        }
        const parameters = `msisdn=${mobile}&name=${mobile}&password=${reqPass}${process.env.HELLO_PAY_SECRECT}`;

        const hashed = getMD5Hased(parameters);

        // const result = await axios.post(
        //   `${process.env.HELLO_PAY_BASE_URL}/api/register`,

        //   querystring.stringify({
        //     hash: hashed,
        //     msisdn: mobile,
        //     name: mobile,
        //     password: reqPass,
        //   }),
        //   {
        //     headers: {
        //       "Content-Type": "application/x-www-form-urlencoded",
        //     },
        //   }
        // );
        const getBonus = await bonus_setting.findOne();
        let welcomeBonus = (getBonus) ? getBonus.welcome_bonus : 0;
        const newUser = await user.create(payload);
        
        await user_wallet.create({userId:newUser.id, bonusBalance:welcomeBonus})
        const token = jwt.sign(
            {
                user: {
                    userDataId: newUser.id,
                    createdAt: new Date(),
                },
            },
            process.env.SECRET
        );
        await user_otp.destroy({
            where: {},
            include: [
                {
                    model: user,
                    as: user.userId,
                    where: {mobile: mobile},
                },
            ],
        });
        console.log("==============newUser======================");
        console.log(newUser);
        console.log("====================================");
        newUser.username = "user" + newUser.id;
        return successResponse(req, res, {user: newUser, token});
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};
module.exports.login = async (req, res) => {
    const {mobile, password, macAddress,device_token} = req.body;
    try {
          // Parse the private key using forge
          const privKey = forge.pki.privateKeyFromPem(PRIVATE_KEY);

          // Get the encrypted message from the request body
          const encryptedMessageBytes = Buffer.from(req.body.password, 'base64');
  
          // Decrypt the message using the private key
          const decryptedMessageBytes = privKey.decrypt(encryptedMessageBytes);
          const decryptedMessage = forge.util.decodeUtf8(decryptedMessageBytes);
          console.log("decryptedMessage--->", decryptedMessage);
        // let device_token = reqObj.device_id;
        const userData = await user.scope("withSecretColumns").findOne({
            where: {mobile: mobile,isAdmin:0},
            raw: true,
        });
        if (!userData) {
            throw new Error(`Please register or verify phone no`);
        }

        const checkUserAlreadyLogin = await user.scope("withSecretColumns").findOne({
            where: {mobile: mobile,isAdmin:0},
            raw: true,
        });

        // if (checkUserAlreadyLogin) {
        //     throw new Error(`User Already login in other device`);
        // }
        if(mobile!='2121212121' && mobile!='1212121212'){
            if(checkUserAlreadyLogin.macAddress && (checkUserAlreadyLogin.isLogin==1) && (checkUserAlreadyLogin.macAddress!=macAddress)){
                throw new Error(`User Already login in other device`);
            }
        }

        const reqPass = crypto
            .createHash("md5")
            .update(decryptedMessage || "")
            .digest("hex");

        if (reqPass.localeCompare(userData.password) !== 0) {
            throw new Error("Incorrect Mobile/Password");
        }
        const token = jwt.sign(
            {
                user: {
                    userDataId: userData.id,
                    createdAt: new Date(),
                },
            },
            process.env.SECRET
        );
        console.log("user token --->",token);

        delete userData.password;
        await user.update({isLogin: 1, macAddress:macAddress,device_token:device_token},{where:{id:userData.id}})
        return successResponse(req, res, {user: userData, token});
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};
module.exports.login_with_gmail = async (req, res) => {
    let responseData = {};
    try {
        const { name, email, id, image_url, macAddress, device_token } = req.body;

        // console.log("Received data:", { name, email, id, image_url, macAddress, device_token });

        let userData = await user.findOne({
            where: { email: email, gmailUserId: id },
        });
       
        const awatarData=await avatar.findOne({where:{id:1}});
        // console.log("User data found:", userData);

        if (!userData) {
            const payload = {
                email: email,
                name: name,
                isLogin: 1,
                isVerified: true,
                isEmailVerified: true,
                verifyToken: uniqueId(),
                profilePic :image_url ? image_url : awatarData.url,
                gmailUserId: id,
                macAddress: macAddress,
                device_token: device_token,

            };

            console.log("Creating new user with payload:", payload);

            userData = await user.create(payload);

            const getBonus = await bonus_setting.findOne();
            let welcomeBonus = (getBonus) ? getBonus.welcome_bonus : 0;
            await user_wallet.create({userId:userData.id, bonusBalance:welcomeBonus})
            await reward_user.create({userId: userData.id,claimed_reward_id: 1, unlock_reward_id:1});

            // console.log("id--->",userData.id)

            const token = jwt.sign(
                {
                    user: {
                        userDataId: userData.id,
                        createdAt: new Date(),
                    },
                },
                process.env.SECRET
            );

            responseData.msg = "User logged in successfully with Gmail";
            responseData.data = userData;
            responseData.token = token;

            return successResponse(req, res, responseData);
        } else {
            console.log("Updating existing user data");
            await user.update(
                {
                    name: name,
                    profilePic: image_url,
                    isLogin: 1,
                    macAddress: macAddress,
                    device_token: device_token,
                },
                {
                    where: { email: email, gmailUserId: id },
                }
            );

            const token = jwt.sign(
                {
                    user: {
                        userDataId: userData.id,
                        createdAt: new Date(),
                    },
                },
                process.env.SECRET
            );

            responseData.msg = "User logged in successfully with Gmail";
            responseData.data = userData;
            responseData.token = token;

            return successResponse(req, res, responseData);
        }
    } catch (error) {
        console.error("Error during login_with_gmail:", error);
        responseData.msg = error.message;
        return res.status(500).json(responseData);
    }
};
module.exports.profile = async (req, res) => {
    try {
        const {userId} = req.user;

        const userData = await db.users.findOne({
            where: {user_id: userId}
        });
        const userWallet = await db.user_wallet.findOne({
            where: {user_id: userId}
        });
        userData.dataValues.wallet = (userWallet) ? (parseFloat(userWallet.real_amount) + parseFloat(userWallet.bonus_amount) + parseFloat(userWallet.win_amount)) : 0.00;
        userData.dataValues.mainBalance = (userWallet) ? userWallet.real_amount : 0.00;
        userData.dataValues.bonus = (userWallet) ? userWallet.bonus_amount : 0.00;
        userData.dataValues.winning = (userWallet) ? userWallet.win_amount : 0.00;

          // Fetch selected shop items where is_Selected is 1
          const selectedShopItems = await db.ludo_shop_users.findAll({
            where: { user_id: userId, is_Selected: 1 }
        });

        // Include selected shop items in user data
        userData.dataValues.selectedShopItems = selectedShopItems;
        return successResponse(req, res, {userData});
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.changePassword = async (req, res) => {
    try {
        const {userId} = req.user;
        const user = await user.findOne({
            where: {id: userId},
        });

        const reqPass = crypto
            .createHash("md5")
            .update(req.body.oldPassword)
            .digest("hex");
        if (reqPass !== user.password) {
            throw new Error("Old password is incorrect");
        }

        const newPass = crypto
            .createHash("md5")
            .update(req.body.newPassword)
            .digest("hex");

        await user.update({password: newPass}, {where: {id: user.id}});
        return successResponse(req, res, {});
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.resendOTP = async (req, res) => {
    const {mobile} = req.params;
    try {
        const userData = await user_otp.findOne({
            where: {mobile: mobile},
        });
        if (!userData) {
            return errorResponse(req, res, `No user found with this moblle`);
        }

        const otp =
            process.env.NODE_ENV == "production"
                ? OTP()
                : String(DEFAULT_TEST_OTP);
        sendOtp(mobile, otp);
        const hashedOTP = crypto.createHash("md5").update(otp).digest("hex");

        const info = {
            otp: hashedOTP,
            expiresIn: Date.now() + 300000,
            isVerified: false,
            userId: userData.id,
        };

        const userOtps = await user_otp.findAll({
            where: {userId: userData.id},
        });

        if (userOtps.length > 0) {
            await user_otp.destroy({
                where: {userId: userData.id},
            });
        }
        await user_otp.create(info);
        return successResponse(req, res, {message: "OTP send successfully"});
        // res.status(200).json({
        //   status: true,
        //   message: "OTP send successfully",
        // });
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.sendOTP = async (req, res) => {
    const {mobile} = req.params;
    try {
        const userData = await user.findOne({
            where: {mobile: mobile},
        });
        if (!userData) {
            return errorResponse(req, res, `No user found with this moblle`);
        }

        const otp =
            process.env.NODE_ENV == "production"
                ? OTP()
                : String(DEFAULT_TEST_OTP);
        sendOtp(mobile, otp);
        const hashedOTP = crypto.createHash("md5").update(otp).digest("hex");

        const info = {
            otp: hashedOTP,
            expiresIn: Date.now() + 300000,
            isVerified: false,
            userId: userData.id,
        };

        const userOtps = await user_otp.findAll({
            where: {userId: userData.id},
        });

        if (userOtps.length > 0) {
            await user_otp.destroy({
                where: {userId: userData.id},
            });
        }
        await user_otp.create(info);
        return successResponse(req, res, {message: "OTP send successfully"});
        // res.status(200).json({
        //   status: true,
        //   message: "OTP send successfully",
        // });
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};
module.exports.verifyOTP = async (req, res) => {
    try {
        const {mobile, otp} = req.body;

        const userOtp = await user_otp.findOne({
            include: [
                {
                    model: user,
                    as: user.userId,
                    where: {mobile: mobile},
                },
            ],
        });
        if (!userOtp) {
            return errorResponse(req, res, `No OTP found with this mobile`);
        }
        const {expiresIn} = userOtp;
        const hashedOtp = userOtp.otp;
        if (expiresIn < Date.now()) {
            await user_otp.destroy({
                where: {},
                include: [
                    {
                        model: user,
                        as: user.userId,
                        where: {mobile: mobile},
                    },
                ],
            });

            return errorResponse(req, res, "OTP has expired");
        }
        const reqOTP = crypto
            .createHash("md5")
            .update(otp || "")
            .digest("hex");

        if (reqOTP !== hashedOtp) {
            throw new Error("Invalid otp");
        }

        await user_otp.update(
            {isVerified: true},
            {
                where: {},
                include: [
                    {
                        model: user,
                        as: user.userId,
                        where: {mobile: mobile},
                    },
                ],
            }
        );
        return successResponse(req, res, {message: "OTP verified successfully"});
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.sendEmailOTP = async (req, res) => {
    const {email} = req.params;
    try {
        const userData = await user.findOne({
            where: {email: email},
        });
        if (!userData) {
            return errorResponse(req, res, `No user found with this email`);
        }

        const otp =
            process.env.NODE_ENV == "production"
                ? String(Math.random() * 1000000).slice(0, 6)
                : String(DEFAULT_TEST_OTP);
        const hashedOTP = crypto.createHash("md5").update(otp).digest("hex");

        const info = {
            otp: hashedOTP,
            expiresIn: Date.now() + 300000,
            isVerified: false,
            userId: userData.id,
        };

        const userOtps = await user_otp.findAll({
            where: {userId: userData.id},
        });

        if (userOtps.length > 0) {
            await user_otp.destroy({
                where: {userId: userData.id},
            });
        }
        await user_otp.create(info);
        const body = `OTP : ${otp}`;

        await sendEmail(userData.email, "forgot-password", body);
        return successResponse(req, res, {message: "OTP send successfully"});
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.verifyEmailOTP = async (req, res) => {
    try {
        const {email, otp} = req.body;

        const userOtp = await user_otp.findOne({
            include: [
                {
                    model: user,
                    as: user.userId,
                    where: {email: email},
                },
            ],
        });

        if (!userOtp) {
            return errorResponse(req, res, `No OTP found with this email`);
        }
        const {expiresIn} = userOtp;
        const hashedOtp = userOtp.otp;
        if (expiresIn < Date.now()) {
            await user_otp.destroy({
                where: {},
                include: [
                    {
                        model: user,
                        as: user.userId,
                        where: {email: email},
                    },
                ],
            });

            return errorResponse(req, res, "OTP has expired");
        }
        const reqOTP = crypto
            .createHash("md5")
            .update(otp || "")
            .digest("hex");

        if (reqOTP !== hashedOtp) {
            throw new Error("Invalid otp");
        }

        await user_otp.update(
            {isVerified: true},
            {
                where: {},
                include: [
                    {
                        model: user,
                        as: user.userId,
                        where: {email: email},
                    },
                ],
            }
        );
        await user.update(
            {isEmailVerified: true},
            {
                where: {email: email},
            }
        );
        return successResponse(req, res, {message: "OTP verified successfully"});
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.forgotPassword = async (req, res) => {
    try {
        const {mobile, newPassword} = req.body;
        const userOtp = await user_otp.findOne({
            include: [
                {
                    model: user,
                    as: user.userId,
                    where: {mobile: mobile},
                },
            ],
        });
        // if (!userOtp || !userOtp.isVerified) {
        //   return errorResponse(req, res, `Please verify OTP`);
        // }
        const userData = await user.findOne({
            where: {mobile: mobile},
        });
        if (!userData) {
            return errorResponse(req, res, "User not found");
        }

        const newPass = crypto.createHash("md5").update(newPassword).digest("hex");

        await user.update({password: newPass}, {where: {id: userData.id}});
        await user_otp.destroy({
            where: {},
            include: [
                {
                    model: user,
                    as: user.userId,
                    where: {mobile: mobile},
                },
            ],
        });
        return successResponse(req, res, {
            message: "Password changed successfully",
        });
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.checkUserExist = async (req, res) => {
    try {
        const {mobile} = req.params;
        const userData = await user.findOne({
            where: {mobile: mobile},
        });

        if (userData) {
            return errorResponse(req, res, "User exist");
        }

        return successResponse(req, res, {message: "User available"});
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.sendEmailOTPUpdateEmail = async (req, res) => {
    const {email} = req.params;
    try {
        const otp = String(Math.random() * 1000000).slice(0, 6);
        const hashedOTP = crypto.createHash("md5").update(otp).digest("hex");

        const info = {
            otp: hashedOTP,
            expiresIn: Date.now() + 300000,
            isVerified: false,
            userId: req.user.id,
        };

        const userOtps = await user_otp.findAll({
            where: {userId: req.user.id},
        });

        if (userOtps.length > 0) {
            await user_otp.destroy({
                where: {userId: req.user.id},
            });
        }
        await user_otp.create(info);
        const body = `OTP : ${otp}`;

        await sendEmail(email, "update-email", body);
        return successResponse(req, res, {message: "OTP send successfully"});
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.verifyEmailOTPUpdateEmail = async (req, res) => {
    try {
        const {email, otp} = req.body;

        const userOtp = await user_otp.findOne({
            include: [
                {
                    model: user,
                    as: user.userId,
                    where: {id: req.user.id},
                },
            ],
        });

        if (!userOtp) {
            return errorResponse(req, res, `No OTP found with this email`);
        }
        const {expiresIn} = userOtp;
        const hashedOtp = userOtp.otp;
        if (expiresIn < Date.now()) {
            await user_otp.destroy({
                where: {},
                include: [
                    {
                        model: user,
                        as: user.userId,
                        where: {email: email},
                    },
                ],
            });

            return errorResponse(req, res, "OTP has expired");
        }
        const reqOTP = crypto
            .createHash("md5")
            .update(otp || "")
            .digest("hex");

        if (reqOTP !== hashedOtp) {
            throw new Error("Invalid otp");
        }

        await user_otp.update(
            {isVerified: true},
            {
                where: {},
                include: [
                    {
                        model: user,
                        as: user.userId,
                        where: {email: email},
                    },
                ],
            }
        );
        await user.update(
            {isEmailVerified: 1, email: email},
            {
                where: {id: req.user.id},
            }
        );
        return successResponse(req, res, {message: "OTP verified successfully"});
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.updateUser = async (req, res) => {
    try {
        const {id} = req.params;
        if (req.body.mobile) {
            return errorResponse(req, res, "You can not update mobile");
        }
        if (req.body.email) {
            const userOtp = await user_otp.findOne({
                include: [
                    {
                        model: user,
                        as: user.userId,
                        where: {id: req.user.id},
                    },
                ],
            });

            if (!userOtp || !userOtp.isVerified) {
                return errorResponse(req, res, `Please verify OTP`);
            }
        }
        await user.update(req.body, {where: {id: id}});
        if (req.body.email) {
            await user.update({isEmailVerified: true}, {where: {id: id}});
        }
        await user_otp.destroy({
            where: {},
            include: [
                {
                    model: user,
                    as: user.userId,
                    where: {email: req.body.email},
                },
            ],
        });
        return successResponse(req, res, {message: "User updated successfully"});
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.profilePictureUpload = async (req, res) => {
    try {
        const {file} = req;
        if (!req.file) {
            return errorResponse(req, res, "file is required");
        }
        console.log(req.file.location);
        // const results = await uploadToS3(file, req.user.userId);

        return successResponse(req, res, {key: req.file.location});
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};
module.exports.getProfilePicture = async (req, res) => {
    try {
        const {key} = req.query;

        if (!key) {
            return errorResponse(req, res, "key is required");
        }

        const presignedUrls = await getUserPresignedUrls(key);

        return successResponse(req, res, {url: presignedUrls});
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.userReferral = async (req, res) => {
    try {
        const {user_id, referral_code} = req.body;

        if (!referral_code) {
            return errorResponse(req, res, "Referral Code is required");
        }
        const getBonus = await bonus_setting.findOne();
        let userBonus = 0, referUserBonus = 0;
        if (getBonus) {
            userBonus = getBonus.welcome_bonus;
            referUserBonus = getBonus.referral_bonus;
        }
        const userDetail = await user.findOne({
            where: {referralCode: referral_code},
        });
        if (!userDetail) {
            return errorResponse(req, res, "User not found");
        }
        const checkReferral = await user_referral.findOne({
            where: {userId: user_id, referralUserId: userDetail.id},
        });
        console.log(checkReferral, "sasas");
        if (checkReferral != null) {
            return errorResponse(req, res, "Already used");
        }
        /***User Bonus ***/
        const info = {
            userId: user_id,
            referralUserId: userDetail.id,
            userBonus: userBonus,
            referralUserBonus: referUserBonus,
        };
        await user_referral.create(info);

        const getUserWallet = await user_wallet.findOne({
            where: {userId: user_id},
        })

        if (!getUserWallet) {
            const walletInfo = {
                userId: user_id,
                bonusBalance: userBonus
            }
            await user_wallet.create(walletInfo);
        } else {
            const bonus = +(getUserWallet.bonusBalance) + userBonus;
            await user_wallet.update({bonusBalance: bonus}, {where: {userId: user_id}});
        }
        const transactionInfo = {
            transactionId: Math.floor(Math.random() * 1000000000),
            currency: 'INR',
            cash: 0,
            bonus: userBonus,
            reference: 'Referral',
            payment_status: 'SUCCESS',
            userId: user_id,
            type: TRANSACTION_TYPE.DEPOSIT,
        };

        await transaction.create(transactionInfo);


        /***Referral User Bonus ***/
        const getReferralUserWallet = await user_wallet.findOne({
            where: {userId: userDetail.id},
        })

        if (!getReferralUserWallet) {
            const walletInfos = {
                userId: userDetail.id,
                bonusBalance: referUserBonus
            }
            await user_wallet.create(walletInfos);
        } else {
            const bonus = +(getReferralUserWallet.bonusBalance) + referUserBonus;
            await user_wallet.update({bonusBalance: bonus}, {where: {userId: userDetail.id}});
        }
        const transactionInfos = {
            transactionId: Math.floor(Math.random() * 1000000000),
            currency: 'INR',
            cash: 0,
            bonus: referUserBonus,
            reference: 'Referral',
            userId: userDetail.id,
            payment_status: 'SUCCESS',
            type: TRANSACTION_TYPE.DEPOSIT,
        };

        await transaction.create(transactionInfos);
        return successResponse(req, res, {message: "Referral Done"});
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}

module.exports.getReferralAmount = async (req, res) => {
    try {
        const getBonus = await bonus_setting.findOne();
        if (getBonus) {
            let referUserBonus = getBonus.referral_bonus;
            return successResponse(req, res, {referral_amount: referUserBonus});
        }
    }catch (error) {
        return errorResponse(req, res, error.message);
    }
}

module.exports.verifyFbToken = async (req, res) => {
    const {facebook_id, access_token, mobile} = req.body;
    // console.log(`https://graph.facebook.com/${facebook_id}?fields=id,name,email,picture&access_token=${access_token}`);
    try {
        const checkuser = await user.findOne({where: {facebookUserId: facebook_id}});
        if (checkuser) {
            return errorResponse(req, res, "User already registered. Please login.");
            //res.status(422).json({ message: "User already registered. Please login." });
        }


        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `https://graph.facebook.com/${facebook_id}?fields=id,name,email,picture&access_token=${access_token}`,
            headers: {}
        };

        axios.request(config)
            .then((response) => {
                const newUser = {
                    facebookUserId: response.data.id,
                    name: response.data.name,
                    email: response.data.email,
                    mobile: mobile,
                    profilePic: response.data.picture.data.url
                };

                user.create(newUser);
                console.log(newUser);
                return successResponse(req, res, {message: "User registered successfully with facebook."});
            })
            .catch((error) => {
                console.log(error);
                return errorResponse(req, res, error.message);
            });
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};
module.exports.userInfo = async (req, res) => {
    try {
        const info = await db.ludo_game_history.findAll({
            where: {userId: req.params.userId},
            attributes: [
                [Sequelize.fn('COUNT', Sequelize.col('tableId')), 'gamePlayed'],
                [Sequelize.fn('SUM', Sequelize.col('winAmount')), 'WinningAmount'],
            ],
            group: ['userId']
        })
        const wins = await db.ludo_game_history.count({
            where: {
                userId: req.params.userId,
                isWin: 1
            }
        })
        const lost = await db.ludo_game_history.count({
            where: {
                userId: req.params.userId,
                isWin: 0
            }
        })
        let result = {
            info, wins, lost
        }
        return successResponse(req, res, result);
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.userKyc = async (req, res) => {
    try {
        const adhar_number = req.body.adhar_number;
        const pan_number = req.body.pan_number;
        if (!req.files.pan_doc) {
            return errorResponse(req, res, "Pan Card is required");
        }
        if (!req.files.adhar_front_doc) {
            return errorResponse(req, res, "Adhaar front is required");
        }

        if (!req.files.adhar_back_doc) {
            return errorResponse(req, res, "Adhaar back is required");
        }

        if (!adhar_number) {
            return errorResponse(req, res, "Adhaar number is required");
        }

        if (!pan_number) {
            return errorResponse(req, res, "Pan number is required");
        }
        let checkUser = await user.findOne({where: {id: req.user.userId}})
        if (!checkUser) {
            return errorResponse(req, res, 'User not found')
        }

        let checkPanCard = await user_kyc.findOne({where: {userId: {[Op.ne]: req.user.userId},panNumber: pan_number}})
        if (checkPanCard) {
            return errorResponse(req, res, 'Pan number already exists')
        }

        let checkAdhar = await user_kyc.findOne({where: {userId: {[Op.ne]: req.user.userId},adharNumber: adhar_number}})
        if (checkAdhar) {
            return errorResponse(req, res, 'Adhaar number already exits!!!')
        }

        await user.update({kyc: 'Yes'}, {where: {id: req.user.userId}})

        let check = await user_kyc.findOne({where: {userId: req.user.userId}, raw: true})
        // if (check) {
        //     return errorResponse(req, res, 'Already updated')
        // }

        const panDocUrl = (req.files.pan_doc) ? req.files.pan_doc[0].location : check.panDoc;
        const adharFrontUrl = (req.files.adhar_front_doc) ? req.files.adhar_front_doc[0].location : check.adharFrontDoc;
        const adharBackUrl = (req.files.adhar_back_doc) ? req.files.adhar_back_doc[0].location : check.adharBackDoc;
        let kycJson = {
            panDoc: panDocUrl,
            adharFrontDoc: adharFrontUrl,
            adharBackDoc: adharBackUrl,
            adharNumber: adhar_number,
            panNumber: pan_number,
            userId: req.user.userId
        }

        await user_kyc.create(kycJson);
       // await user.update({kyc: 'Yes'}, {where: {id: req.user.userId}})
        return successResponse(req, res, 'Kyc Update');
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.getReferralHistory = async (req, res) => {
    try {
        let check = await user_referral.findAll({where: {referralUserId: req.params.userId}, raw: true})
        console.log(check);
        if (check.length == 0) {
            return errorResponse(req, res, 'No data found')
        }
        check = check.map(async (element) => {
            let userD = await user.findOne({where: {id: element.userId}, raw: true});
            console.log(element.userId);
            element.name = (userD) ? userD.username : '';
            return element;
        })
        check = await Promise.all(check);
        return successResponse(req, res, check);
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.addBankAccount = async (req, res) => {
    try {
        let {accountHolderName, bankName, bankAddress, bankAccountNo, ifscCode} = req.body;
        let bankJson = req.body;
        let userId = req.user.userId;
        if (!accountHolderName) {
            return errorResponse(req, res, "Account Holder name is required");
        }
        if (!bankName) {
            return errorResponse(req, res, "Bank Name is required");
        }
        // if (!ifscCode) {
        //     return errorResponse(req, res, "Ifsc code is required");
        // }
        // if (!bankAddress) {
        //     return errorResponse(req, res, "Bank Address is required");
        // }
        if (!bankAccountNo) {
            return errorResponse(req, res, "Account number is required");
        }
        let userDet = await user.findOne({where: {id: userId}});
        if (!userDet) {
            return errorResponse(req, res, {message: 'User not found'})
        }


        // let contactDet = {
        //     name: userDet.username,
        //     email: userDet.email,
        //     mobile: userDet.mobile,
        //     user_id: userId
        // }
        // let contactRes = await addRazorPayContact(contactDet);
        // console.log(contactRes);
        // let bankDet = {
        //     name: accountHolderName,
        //     ifsc_code: ifscCode,
        //     customer_id: contactRes.customer_id,
        //     account_number: bankAccountNo
        // }
        // let bankRes = await addBankToRazorpay(bankDet)
        // console.log(bankRes);
        // if(bankRes.status==500){
        //     return errorResponse(req, res, {message: bankRes.message})
        // }
        bankJson.userId = userId;
        // bankJson.customerId = contactRes.customer_id;
        // bankJson.fundId = bankRes.fund_id;
        console.log(bankJson);
        let checkBank = await bank_account.findOne({where: {userId: userId}});
        if (checkBank) {
            await bank_account.update(bankJson, {where: {userId: userId}});
            return successResponse(req, res, 'Bank Account updated');
        }

        await bank_account.create(bankJson);
        return successResponse(req, res, 'Bank Account Added');
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.getKycDetails = async (req, res) => {
    try {
        let userId = req.user.userId;
        let checkBank = await user_kyc.findOne({where: {userId: userId}});
        if (checkBank) {
            return successResponse(req, res, checkBank);
        }
        return errorResponse(req, res, 'User Kyc not found');
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.getBankAccount = async (req, res) => {
    try {
        let userId = req.user.userId;
        let checkBank = await bank_account.findOne({where: {userId: userId}});
        if (checkBank) {
            return successResponse(req, res, checkBank);
        }
        return errorResponse(req, res, 'Bank Account not found');
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.sendWithdrawRequest = async (req, res) => {
    try {
        let {amount} = req.body;
        let userId = req.user.userId;
        console.log("userId",userId);
        let redemJson = req.body;

        if (!amount) {
            return errorResponse(req, res, "Amount is required");
        }
        const withdrawalFee=await withdrawls_fee.findOne({});
       
        if (amount < withdrawalFee.min_withdrawl) {
            return errorResponse(req, res, "withdrawal amount is should be greater than minimum withdrawl amount ");
        }
        
        if (amount > withdrawalFee.max_withdrawl) {
            return errorResponse(req, res, "withdrawal amount is should be less than maximum withdrawl amount ");
        }

        const userBankData = await bank_account.findOne({where:{userId:userId}})
        if(!userBankData){
            return errorResponse(req, res, "Please add bank account");
        }
       

        let result = await redemption.findOne({where: {userId: userId, status:'Pending'}});
        if (result) {
            return errorResponse(req, res, "Your previous request is in process...Please wait for sometimes once it is done then you will send a new request!!!");
        }


        const userWallet = await user_wallet.findOne({where: {userId: userId}});
        let winningBalance = parseFloat(userWallet.winningBalance);
                let mainBalance = parseFloat(userWallet.mainBalance);
                let totalBalance = winningBalance + mainBalance;
        if (totalBalance < parseFloat(amount)) {
            return errorResponse(req, res, "Your wallet amount is low");
        }
        let winningBalanceDeduct = 0;
        let mainBalanceDeduct = 0;

        if (winningBalance >= amount) {
            winningBalanceDeduct = amount;
            winningBalance -= amount;
        } else {
            winningBalanceDeduct = winningBalance;
            mainBalanceDeduct = amount - winningBalance;
            winningBalance = 0;
            mainBalance -= mainBalanceDeduct;
        }
        await user_wallet.update(
            { winningBalance: winningBalance, mainBalance: mainBalance },
            { where: { userId: userId } }
        );


        let userDet = await user.findOne({where: {id: userId}});
        if (!userDet) {
            return errorResponse(req, res, {message: 'User not found'})
        }

        // let contactDet = {
        //     name: userDet.username,
        //     email: userDet.email,
        //     mobile: userDet.mobile,
        //     user_id: userId
        // }
        // let contactRes = await addRazorPayContact(contactDet);
        
        // if(redemJson.transferType==1){

        //     let bankDet = {
        //         name: userDet.username,
        //         ifsc_code: redemJson.ifscCode,
        //         customer_id: contactRes.customer_id,
        //         account_number: redemJson.bankAccountNo
        //     }
        //     var bankRes = await addBankToRazorpay(bankDet)
        //     bankD = {
        //         ifscCode:redemJson.ifscCode,
        //         bankAccountNo:redemJson.bankAccountNo,
        //         userId:userId,
        //         customerId: contactRes.customer_id,
        //         fundId: bankRes.fund_id
        //     };


        // }

        // if(redemJson.transferType==2){
        //     let bankDet = {
        //         name: userDet.username,
        //         upi_id: redemJson.upiId,
        //         customer_id: contactRes.customer_id
        //     }
        //     var bankRes = await addUpiToRazorpay(bankDet)
        //     bankD = {
        //         upiId:redemJson.upiId,
        //         userId:userId,
        //         customerId: contactRes.customer_id,
        //         upifundId: bankRes.fund_id
        //     }
        // }
        // if(checkBank){
        //     await bank_account.update(bankD,{where: {userId: userId}});
        // }else{
        //     await bank_account.create(bankD);
        // }

        let tds = await withdrawls_fee.findOne({});
        console.log(tds);
        let tdsAmount = 0;
        if(tds){
            console.log('sss');
            tdsAmount = (amount * tds.withdrawl_rate/100);
            console.log(tdsAmount);
        }

        redemJson.userId = userId;
        redemJson.status = 'Pending';
        redemJson.tdsAmount = tdsAmount;
        redemJson.winningBalanceDeduct = winningBalanceDeduct;
        redemJson.mainBalanceDeduct = mainBalanceDeduct;
        redemJson.accountId=userBankData.bankAccountNo;
        await redemption.create(redemJson);
        return successResponse(req, res, 'Redeem Request send successfully');
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.getWithdrawRequest = async (req, res) => {
    try {
        let userId = req.user.userId;
        let result = await redemption.findAll({where: {userId: userId}});
        if (result) {
            return successResponse(req, res, result);
        }
        return errorResponse(req, res, 'Not found Redeem Request');
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.getTransaction = async (req, res) => {
    try {
        let userId = req.user.userId;
        let result = await transaction.findAll({where: {userId: userId}, raw:true, order: [['id', 'DESC']]});
        if (result) {
            return successResponse(req, res, result);
        }
        return errorResponse(req, res, 'Transaction not found');
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.getChatTemplate = async (req, res) => {
    try {
        let data = await chat_template.findAll({where: {status: 1}});
        return successResponse(req, res, data);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.getTdsDetails = async (req, res) => {
    try {
        const {userId} = req.user;
        let data = await redemption.findAll(
            {where: {userId: userId,status:'Withdraw'},
                attributes: [
                    [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalAmount'],
                    [Sequelize.fn('SUM', Sequelize.col('tdsAmount')), 'tdsAmount']
                ],raw:true});
        //console.log(data);
        let result = {
            totalAmount: (data[0].totalAmount) ? data[0].totalAmount : 0,
            tdsAmount: (data[0].tdsAmount) ? data[0].tdsAmount : 0
        }
        return successResponse(req, res, result);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.getGstDetails = async (req, res) => {
    try {
        let {amount} = req.query;
        let depositAmt = (amount * 100)/(100 + 28)
        let gstAmount = parseFloat(amount) - parseFloat(depositAmt.toFixed(2))
        console.log(depositAmt);
        console.log(gstAmount);
        let data = {
            currentBalance: parseInt(amount),
            depositAmount: depositAmt.toFixed(2),
            govtTax: gstAmount.toFixed(2),
            discountPoints: gstAmount.toFixed(2)
        }
        return successResponse(req, res, data);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.checkPay = async (req, res) => {
    try {
        let data = await payoutStatus(req.query.id);
        return successResponse(req, res, data);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.logout = async (req, res) => {
    try {
        const {userId} = req.user;
        await user.update({isLogin:0},{where:{id: userId}})
        return successResponse(req, res, "logout done");
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.resetLogin = async (req, res) => {
    try {
        const mobile = req.query.mobile;
        await user.update({isLogin:0},{where:{mobile: mobile}})
        return successResponse(req, res, "reset done");
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.resetAmount = async (req, res) => {
    try {
        const mobile = req.query.mobile;
        const userData = await user.findOne({
            where: {mobile: mobile},
        });
        if (!userData) {
            return errorResponse(req, res, `No user found with this moblle`);
        }

        await user_wallet.update({mainBalance:0,winningBalance:0,bonusBalance:0},{where:{userId: userData.id}})
        return successResponse(req, res, "reset amount done");
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.all_shops = async (req, res) => {
    try {
        
        const allShops = await db.ludo_shop.findAll();
        return res.status(200).json({ shops: allShops });
    } catch (error) {
        // Return error response if something goes wrong
        return res.status(500).json({ error: error.message });
    }
};
// module.exports.get_all_goods_by_category = async (req, res) => {
//     try {
//         const { category } = req.query;
//         const goodsByCategory = await shop_goods.findAll({ where: { category } });
//         return res.status(200).json({ goods: goodsByCategory });
//     } catch (error) {
//         return res.status(500).json({ error: error.message });
//     }
// };
module.exports.get_all_goods_by_category = async (req, res) => {
    try {
        const { category, user_id } = req.body;
        const goodsByCategory = await db.ludo_shop_goods.findAll({ where: { category } });

        // Find user's purchases
        const userPurchases = await db.ludo_shop_users.findAll({
            where: {
                user_id: user_id,
                goods_id: { [Op.in]: goodsByCategory.map(good => good.id) }
            }
        });
        // Mark goods as purchased or not based on user's purchases
        const goodsWithPurchaseStatus = goodsByCategory.map(good => {
            const isPurchase = userPurchases.some(purchase => purchase.goods_id === good.id);
            return { ...good.toJSON(), isPurchase };
        });

        return res.status(200).json({ goods: goodsWithPurchaseStatus });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// module.exports.buy_shop = async (req, res) => {
//     try {
//         const { user_id, goods_id,category,price } = req.body;

//         let userwallet = await user_wallet.findOne({
//             where: { userId: user_id },
//             raw: true,
//         });

//         console.log(userwallet);

//                 let depositAmt = userWallet.mainBalance;
//                 let bonusAmt = userWallet.bonusBalance;
//                 let deductbonusAmount = 0;
//                 let deductwageredAmount = 0;
//                 let depositTransAmt = entryFee;
//                 let bonusTransAmt = 0;
//                 let withdrawTransAmt = 0;

//                 let deductAmount = (+userWallet.mainBalance) - (+entryFee);
//                 if (deductAmount < 0) {
//                     depositAmt = 0;
//                     deductAmount = deductAmount * -1
//                     deductbonusAmount = parseFloat(userWallet.bonusBalance) - parseFloat(deductAmount);
//                     if (deductbonusAmount < 0) {
//                         bonusAmt = 0;
//                         deductbonusAmount = deductbonusAmount * -1;
//                     }
//                 }

//                 if (parseFloat(userWallet.mainBalance) < parseFloat(entryFee)) {
//                     depositTransAmt = userWallet.mainBalance;
//                 }
//                 if (parseFloat(depositTransAmt) < parseFloat(entryFee)) {
//                     if (parseFloat(userWallet.bonusBalance) <= parseFloat(entryFee)) {
//                         bonusTransAmt = userWallet.bonusBalance;
//                     }else{
//                         bonusTransAmt = deductbonusAmount;
//                     }
//                 }else{
//                     bonusTransAmt = deductbonusAmount;
//                 }

//                 withdrawTransAmt = parseFloat(entryFee) - (parseFloat(depositTransAmt) + parseFloat(bonusTransAmt));
//                 await user_wallet.update({mainBalance: (parseFloat(userWallet.mainBalance) - parseFloat(depositTransAmt)), bonusBalance: (parseFloat(userWallet.bonusBalance) - parseFloat(bonusTransAmt)), winningBalance: (parseFloat(userWallet.winningBalance) - parseFloat(withdrawTransAmt))}, {
//                     where: {
//                         userId: players[i].playerId
//                     }
//                 })
//                 let transactionDatas = {
//                     transactionId: Math.floor(Math.random() * 1000000000),
//                     currency: 'INR',
//                     cash: entryFee,
//                     bonus: 0,
//                     reference: 'Debit',
//                     userId: players[i].playerId,
//                     type: 'DEBIT',
//                 }
//                 await transaction.create(transactionDatas);


//         const existingUserGoods = await shop_users.findOne({ where: { user_id, goods_id,category } });
//         if (existingUserGoods) {
//             return res.status(400).json({ error: "User already purchased that item" });
//         }
//         const data = await shop_users.create({ user_id, goods_id,category });
//         return res.status(201).json({ message: "User purchased the item successfully", data });
//     } catch (error) {
//         return res.status(500).json({ error: error.message });
//     }
// };
module.exports.buy_shop = async (req, res) => {
    try {
        const { user_id, goods_id, category } = req.body;
        console.log("req.body",req.body);

        const existingUserGoods = await db.ludo_shop_users.findOne({ where: { user_id, goods_id, category } });
        if (existingUserGoods) {
            return res.status(400).json({ error: "User already purchased that item" });
        }
    
        let userWallet = await db.user_wallet.findOne({
            where: { user_id: user_id },
            raw: true,
        });
        console.log("userWallet-->",userWallet);

        let shopdata =await db.ludo_shop_goods.findOne({where:{id:goods_id,category:category}})
       
        let price=shopdata.price;
        console.log("price-->",price);

        // console.log(userWallet);

        let mainBalance = parseFloat(userWallet.real_amount);
        let bonusBalance = parseFloat(userWallet.bonus_amount);
        let winningBalance = parseFloat(userWallet.win_amount);
        let totalBalance = mainBalance + bonusBalance + winningBalance;
        console.log("totalBalance", totalBalance);

        if (totalBalance < price) {
            return res.status(400).json({ error: "Insufficient balance" });
        }

        let remainingAmount = price;
        let depositTransAmt = 0;
        let bonusTransAmt = 0;
        let withdrawTransAmt = 0;

        // Deduct from main balance first
        if (mainBalance >= remainingAmount) {
            depositTransAmt = remainingAmount;
            remainingAmount = 0;
        } else {
            depositTransAmt = mainBalance;
            remainingAmount -= mainBalance;
        }

        // Deduct from bonus balance next
        if (remainingAmount > 0) {
            if (bonusBalance >= remainingAmount) {
                bonusTransAmt = remainingAmount;
                remainingAmount = 0;
            } else {
                bonusTransAmt = bonusBalance;
                remainingAmount -= bonusBalance;
            }
        }

        // Deduct from winning balance last
        if (remainingAmount > 0) {
            if (winningBalance >= remainingAmount) {
                withdrawTransAmt = remainingAmount;
                remainingAmount = 0;
            } else {
                withdrawTransAmt = winningBalance;
                remainingAmount -= winningBalance;
            }
        }

        // Update balances
        mainBalance -= depositTransAmt;
        bonusBalance -= bonusTransAmt;
        winningBalance -= withdrawTransAmt;

        await db.user_wallet.update({
            real_amount: mainBalance,
            bonus_amount: bonusBalance,
            win_amount: winningBalance,
        }, {
            where: {
                user_id: user_id
            }
        });

        let transactionData = {
           // transaction_id: Math.floor(Math.random() * 1000000000),
            //currency: 'INR',
            amount: price,
           // bonus: 0,
           reference: 'Debit',
           user_id: user_id,
            type: 'DR',
            category:"Ludo",
            other_type:"Item-Purchase"
        };
        await db.transactions.create(transactionData);

        const data = await db.ludo_shop_users.create({ user_id, goods_id, category });
        return res.status(201).json({ message: "User purchased the item successfully", data });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports.selectedShopItem = async (req, res) => {
    try {
        const { user_id, goods_id, category } = req.body;
        const data = await db.ludo_shop_users.findAll({ where: { user_id: user_id, category: category },raw:true});
        console.log("data",data);
        if (!data || data.length === 0) {
            return res.status(400).json({ error: "Data not found" });
        }

        for (let i = 0; i < data.length; i++) {
            const shopUser = data[i];
            console.log("shopUser",shopUser);
            
            // If the goods_id matches, set is_Selected to 1, else set it to 0
            const isSelected = (shopUser.goods_id === goods_id) ? 1 : 0;
            
            try {
                await db.ludo_shop_users.update({ is_Selected: isSelected }, { where: { id: shopUser.id } });
            } catch (error) {
                console.error("Error occurred during update:", error);
            }
        }

        return res.status(200).json({ message: "Shop item selection updated successfully" });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports.get_notification = async (req, res) => {
    let responseData = {};
    try {
        let user = req.user;
        // console.log("req.user",req.user);
        let id = user.id;
        // console.log(id);
        // let query = {receiver_user_id: id}
        let getNotification = await db.notifications.findAll({where :{receiver_user_id: id}});
        if (getNotification.length == 0) {
            responseData.msg = 'No Notification Found';
            return res.status(500).json({ responseData });
        }
        var objData = [];
        for(let i=0;i<getNotification.length; i++){
            var obj = {
                title:  getNotification[i].title,
                message: getNotification[i].message,
                createdAt: getNotification[i].createdAt
            }
            objData.push(obj);
        }
        responseData.msg = 'Notification Fetch successfully!!!';
        responseData.data = objData;
        return res.status(200).json({ responseData });
    } catch (error) {
        responseData.msg = error.message;
        return res.status(500).json({ responseData });
    }
}
module.exports.get_read_notification=async(req,res)=>{
    let responseData = {};
    try {
        let user= req.user;
        let id=user.id;
        // console.log("req.user",id);
        let getNotification = await db.notifications.findAll({where :{receiver_user_id: id,is_read:1}});
        if (getNotification.length == 0) {
            responseData.msg = 'No Notification Found';
            return res.status(500).json({ responseData });
        }
        var objData = [];
        for(let i=0;i<getNotification.length; i++){
            var obj = {
                title:  getNotification[i].title,
                message: getNotification[i].message,
                createdAt: getNotification[i].createdAt
            }
            objData.push(obj);
        }
        responseData.msg = 'read Notification Fetch successfully!!!';
        responseData.data = objData;
        return res.status(200).json({ responseData });
    } catch (error) {
        responseData.msg = error.message;
        return res.status(500).json({ responseData });
    }
}
module.exports.get_unread_notification=async(req,res)=>{
    let responseData = {};
    try {
        let user= req.user;
        let id=user.id;
        // console.log("req.user",id);
        let getNotification = await db.notifications.findAll({where :{receiver_user_id: id,is_read:0}});
        if (getNotification.length == 0) {
            responseData.msg = 'No Notification Found';
            return res.status(500).json({ responseData });
        }
        var objData = [];
        for(let i=0;i<getNotification.length; i++){
            var obj = {
                title:  getNotification[i].title,
                message: getNotification[i].message,
                createdAt: getNotification[i].createdAt
            }
            objData.push(obj);
        }
        responseData.msg = 'unread Notification Fetch successfully!!!';
        responseData.data = objData;
        return res.status(200).json({ responseData });
    } catch (error) {
        responseData.msg = error.message;
        return res.status(500).json({ responseData });
    }
}
module.exports.update_is_read=async(req,res)=>{
    responseData={};
    try {
        let {id}=req.query;
        // console.log("id-->",id);
       let data=await db.notifications.findOne({where:{notification_id:id}})
// console.log("data-->",data);
       if(!data){
        return res.status(400).json({ error: "Data not found" });   
       }
       data.is_read=1;
       await data.save();

        return res.status(200).json({ message: "read status updated successfully" });
        
    } catch (error) {
        responseData.msg = error.message;
        return res.status(500).json({ responseData });
    }
}

module.exports.delete_notification=async(req,res)=>{
    responseData={};
    try {
        // let {id}=req.query;
        let user= req.user;
        let Id=user.id;
        console.log("id-->",Id);
       let infos=await db.notifications.findAll({where:{receiver_user_id:Id}})
       if(!infos || infos.length==0){
           responseData.msg="Data not found";
        return res.status(400).json( responseData );   
       }
       
         // Delete each notification
         await db.notifications.destroy({ where: { receiver_user_id: Id } });
         responseData.msg="notifications deleted successfully";

       return res.status(200).json(responseData);
        
    } catch (error) {
        responseData.msg = error.message;
        return res.status(500).json( responseData );
    }
}

module.exports.selected_avatar = async (req, res) => {
    let responseData = {};
    try {
        const { user_id, avatarId } = req.body;

        if (!user_id || !avatarId) {
            responseData.msg = 'Invalid request data';
            return res.status(400).json(responseData);
        }

        const userData = await db.users.findOne({ where: { user_id: user_id } });

        // Check if the user exists
        if (!userData) {
            responseData.msg = 'User not found';
            return res.status(404).json(responseData);
        }
        const awatarData=await db.avatar.findOne({where:{id:avatarId}});
        // console.log(awatarData);

        // Update the user's avatarId
        userData.avatarId = avatarId;
        userData.profilePic=awatarData.url;
        await userData.save();

        responseData.msg = 'Avatar updated successfully';
        responseData.data = { user_id, avatarId };
        return res.status(200).json(responseData);
    } catch (error) {
        console.error(`Error updating avatar: ${error.message}`);
        responseData.msg = error.message;
        return res.status(500).json(responseData);
    }
};
module.exports.get_web_url=async(req,res)=>{
    try {
        const web_url=await setting.findAll({where:{is_payment_url:0}});
        if(!web_url){
            return res.status(404).json({ error: "Url not found" });
        }
       
        return res.status(200).json({ data: web_url });
        
    } catch (error) {
        return res.status(500).json({error:error.message})
    }
}
module.exports.get_payment_url=async(req,res)=>{
    try {
        const payment_url=await setting.findAll({where:{is_payment_url:1}});
        if(!payment_url){
            return res.status(404).json({ error: "Url not found" });
        }
       
        return res.status(200).json({ data: payment_url });
        
    } catch (error) {
        return res.status(500).json({error:error.message})
    }
}

module.exports.get_all_avatars = async (req, res) => {
    try {
        const avatars = await db.avatar.findAll();
        return res.status(200).json({ avatars: avatars });
        
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};


module.exports.all_reward = async (req, res) => {
  let responseData = {};
  try {
    const userId = req.user.id; // Assuming req.user contains the authenticated user's info

    // Fetch all rewards
    let rewards = await reward.findAll();

    if (rewards.length === 0) {
      responseData.msg = "No rewards found";
      return res.status(404).json(responseData);
    }

    // Check if each reward is accessed by the user
    let rewardsWithAccess = await Promise.all(rewards.map(async (reward) => {
      const userReward = await reward_user.findOne({
        where: {
          userId: userId,
          claimed_reward_id: reward.id,
        }
      });
      return {
        ...reward.toJSON(),
        access: userReward ? true : false,
      };
    }));

    const last_visit_data=await user_last_visit.findOne({ where: { userId } }); 

    responseData.msg = "All rewards fetched successfully";
    responseData.data = rewardsWithAccess;
    responseData.unlocked_reward=last_visit_data.unlock_reward_id;
    return res.status(200).json(responseData);
  } catch (error) {
    responseData.msg = error.message;
    responseData.success = false;
    return res.status(500).json(responseData);
  }
};
module.exports.createRewardUser = async (req, res) => {
    let responseData = {};
    try {
        let userId = req.user.id;
        const { reward_id, coins } = req.body;

        // Validate the input
        if (!userId || !reward_id || !coins) {
            responseData.msg = "User ID, Reward ID, and valid number of coins are required.";
            return res.status(400).json(responseData);
        }

        // Find the user's wallet
        let wallet = await user_wallet.findOne({
            where: { userId: userId }
        });

        if (!wallet) {
            responseData.msg = "User wallet not found.";
            return res.status(404).json(responseData);
        }

        // Add the coins to the rewardCoins
        let newRewardCoins = wallet.bonusBalance + parseInt(coins, 10);

        // Update the wallet with the new rewardCoins value
        await user_wallet.update(
            { bonusBalance: newRewardCoins },
            { where: { userId: userId } }
        );

        // Create a new reward_user entry
        const newRewardUser = await reward_user.create({
            userId: userId,
            claimed_reward_id: reward_id,
        });
        // const last_visit_data=await user_last_visit.findOne({ where: { userId } }); 
        // console.log(last_visit_data);
        // await user_last_visit.update(
        //     {unlock_reward_id:unlock_reward_id}
        // )


        responseData.msg = "Reward user entry created successfully and wallet updated.";
        responseData.data = {
            userId: userId,
            claimed_reward_id: reward_id,
            newRewardCoins: newRewardCoins
        };
        return res.status(201).json(responseData);
    } catch (error) {
        responseData.msg = error.message;
        return res.status(500).json(responseData);
    }
};

module.exports.visit_app = async (req, res) => {
    let responseData = {};
    let userId = req.user.id;  // Assuming `req.user.id` contains the authenticated user's ID
    let currentTime = new Date(req.body.currentTime);  // Assuming the frontend sends `currentTime` in the request body
  
    try {
      // Fetch the last visit record for the user
      let userVisit = await user_last_visit.findOne({ where: { userId } });
      console.log(userVisit);
  
      if (userVisit) {
        let lastVisit = new Date(userVisit.lastVisit);
        let timeDifference = (currentTime - lastVisit) / (1000 * 60 * 60);  // Difference in hours
  
        if (timeDifference > 24) {
          // Update the last visit and unlock reward ID
          userVisit.lastVisit = currentTime;
          userVisit.unlock_reward_id = userVisit.unlock_reward_id+1;
          await userVisit.save();
  
          responseData.msg = 'Last visit updated and reward unlocked.';
        } else {
          responseData.msg = 'Less than 24 hours since last visit. No update made.';
        }
      } else {
        // If no record found, create a new one
        await user_last_visit.create({
          userId,
          lastVisit: currentTime,
          unlock_reward_id: 1,
        });
        responseData.msg = 'Record created for the first visit.';
      }
  
      return res.status(200).json(responseData);
    } catch (error) {
      responseData.msg = error.message;
      return res.status(500).json(responseData);
    }
  };

module.exports.get_reward_status = async (req, res) => {
    let responseData = {};
    let userId = req.user.id;
    console.log(userId);

    try {
        // Fetch the latest reward_user entry for the user
        let userReward = await reward_user.findOne({
            where: { userId: userId },
            order: [['createdAt', 'DESC']],
        });

        if (!userReward) {
               // Unlock reward id = 1 if user reward entry not found
          
            responseData.msg = ' Unlocking reward id 1.';
            responseData.unlock_reward_id = 1;
            return res.status(404).json(responseData);
        }

        // Fetch all claimed rewards for the user
        let userClaimedRewards = await reward_user.findAll({
            where: { userId: userId },
            attributes: ['claimed_reward_id']
        });

        // Fetch all available rewards
        let allRewards = await reward.findAll();

        const now = new Date();
        const lastVisit = new Date(userReward.lastVisit);
        const hoursSinceLastVisit = (now - lastVisit) / (1000 * 60 * 60);

        // Get an array of claimed reward IDs
        let claimedRewardIds = userClaimedRewards.map(reward => reward.claimed_reward_id);

        // Mark each reward as claimed or not claimed
        let rewardsWithClaimedStatus = allRewards.map(reward => {
            return {
                ...reward.dataValues,
                is_claimed: claimedRewardIds.includes(reward.id)
            };
        });

        // Determine the next reward to be unlocked
        let unlockRewardId = null;
        for (let reward of rewardsWithClaimedStatus) {
            if (!reward.is_claimed) {
                unlockRewardId = reward.id;
                break;
            }
        }
        responseData.user_id = userId;
        responseData.rewards = rewardsWithClaimedStatus;
        responseData.last_visit = userReward.lastVisit;
        responseData.hours_since_last_visit = hoursSinceLastVisit;
        responseData.unlock_reward_id = unlockRewardId;

        if (hoursSinceLastVisit >= 24) {
            // Update the reward_user to unlock the next reward
            await reward_user.update(
                { unlockreward: true, lastVisit: now },
                { where: { userId: userId } }
            );
            responseData.msg = 'You are eligible to unlock the next reward!';
            responseData.unlockreward = true;
        } else {
            responseData.msg = 'Come back after 24 hours to unlock the next reward!';
            responseData.unlockreward = false;
        }

        return res.status(200).json(responseData);
    } catch (error) {
        responseData.msg = error.message;
        return res.status(500).json(responseData);
    }
};

module.exports.total_coins= async(req,res)=>{
    let responseData={};
    try {
        let user=req.user;
        let Id=user.id;
        console.log(Id);
        let wallet = await user_wallet.findOne({
            where: { userId: Id },
            raw: true,
        });

        if (!wallet) {
            responseData.msg="User wallet not found";
            return res.status(404).json(responseData);
        }
        let totalcoins=wallet.rewardCoins;

        responseData.msg="total coins fetch successfully";
        responseData.data=totalcoins;
        return res.status(200).json(responseData)
        
    } catch (error) {
        return res.status(500).json({ error: error.message }); 
    }
}

module.exports.getBankDetails = async (req, res) => {
    let responseData = {};
    try {
      const bankDetails = await admin_bank_Details.findAll();
      const paymentUrl = await setting.findAll({ where: { is_payment_url: 1 } });
       
       let transactionId = await transaction.findOne({ where: { userId:req.user.id } });
  
      responseData.msg = "All bank details fetched successfully";
      responseData.bankDetails = bankDetails;
      responseData.paymentUrl = paymentUrl;
      responseData.transactionId=transactionId.transactionId;
  
      return res.status(200).json(responseData);
    } catch (error) {
      console.error(`Error fetching bank details: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
  };

  module.exports.getAllWithdrawlsFees = async (req, res) => {
    try {
        const data = await withdrawls_fee.findAll();
        return res.status(200).json({ message: "withdrawls_fees retrieved successfully", data });

    } catch (error) {
        console.error(`Error retrieving withdrawls_fees: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
};

module.exports.getSelectedShopItem = async (req, res) => {
    let responseData={};
    try {
        
        const userId = req.query.user_id;
        const userData = await db.users.findOne({
            where: {user_id: userId}
        });
          // Fetch selected shop items where is_Selected is 1
          const selectedShopItems = await db.ludo_shop_users.findAll({
            where: { user_id: userId, is_Selected: 1 }
        });
        if(selectedShopItems.length==0){
            responseData.msg="no shop item selected"
              return successResponse(req, res, responseData);
        }
        responseData.msg="fetch successfully"
      responseData.data=selectedShopItems;
        return successResponse(req, res, responseData);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};
  



  
