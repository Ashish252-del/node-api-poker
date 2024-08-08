const crypto = require("crypto");
const forge = require('node-forge');
const jwt = require("jsonwebtoken");
const {Sequelize} = require("sequelize");
const NodeRSA = require('node-rsa');
const Op = Sequelize.Op;
const {user, user_otp, chat_template, promocodes, sequelize, user_referral, tds_setting, game_history, user_wallet, bank_account, user_kyc, redemption, transaction} = require("../../models");
const sendEmail = require("../../utils/sendEmail");
const {successResponse, errorResponse, uniqueId} = require("../../helpers");
const {addRazorPayContact, addBankToRazorpay, payoutStatus, addUpiToRazorpay} = require('../../utils/payment')
const moment = require('moment');

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

const CsvParser  = require('json2csv').Parser;
const fs = require('fs');
const getPagination = (page,limit) => {
    page = page - 1;
    const offset = page ? page * limit : 0;
    return {limit, offset};
};
const last7Days = (d) => {
    d = +(d || new Date()), days = [], i = 7;
    while (i--) {
        days.push(formatUSDate(new Date(d -= 8.64e7)));
    }
    return days;
}

const formatUSDate = (d) => {
    function z(n) {
        return (n < 10 ? '0' : '') + +n;
    }

    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
}
module.exports.allUsers = async (req, res) => {
    try {

        const {page, search_key, from_date, end_date, page_limit} = req.query;
        let limits = (page_limit) ? page_limit : 50 ;
        const {limit, offset} = getPagination(page, limits);
        // var search_key = {};
        // if (typeof req.query.search_key !== 'undefined'){
        //     search_key.name = {[Op.like]: '%' + req.query.search_key + '%'};
        //     search_key.username = {[Op.like]: '%' + req.query.search_key + '%'};
        //     search_key.mobile = {[Op.like]: '%' + req.query.search_key + '%'};
        // }
        // const users = await user.findAndCountAll({
        //     where :{
        //         $or: [
        //             search_key
        //         ]
        //     },
        //     attributes: ['id', 'name', 'kyc', 'mobile', 'email', ['username', 'User_Name'], ['isMobileVerified', 'Is_Mobile_Verified'], ['isEmailVerified', 'Is_Email_Verified'], ['isVerified', 'Is_Verified'], ['referralCode', 'Referral_Code'], ['facebookUserId', 'Facebook_User_Id'], ['createdAt', 'Created_At'], ['updatedAt', 'Updated_At']],
        //     order: [["createdAt", "DESC"]],
        //     offset: (page - 1) * limit,
        //     limit,
        // });
        let response, responseTotalCount;
        let query = `isAdmin = 0 AND is_ludo_bot = 0`;
        if (from_date && end_date) {
            console.log('d');
            let fromDate = moment(from_date).format('YYYY-MM-DD');
            let endDate = moment(end_date).format('YYYY-MM-DD');
            query += ` AND DATE(createdAt) BETWEEN '${fromDate}' AND '${endDate}'`;
        }
        if (search_key) {
            query += ` AND (username like '%${search_key}%' OR name like '%${search_key}%' OR email like '%${search_key}%' OR mobile like '%${search_key}%')`;
        }
        query += ` order by id DESC`;
        response = await sequelize.query(`Select id, name, kyc, mobile, email, username as User_Name, isMobileVerified as Is_Mobile_Verified, isEmailVerified as Is_Email_Verified, isVerified as Is_Verified, referralCode as Referral_Code, facebookUserId as Facebook_User_Id, createdAt as Created_At, updatedAt as Updated_At  from users where ${query} LIMIT ${offset}, ${limit}`, {type: sequelize.QueryTypes.SELECT});
        responseTotalCount = await sequelize.query(`Select *  from users where ${query}`, {type: sequelize.QueryTypes.SELECT});
        //console.log(response);
        for (let i = 0; i < response.length; i++) {
            let userN = '';
            let getrefer = await user_referral.findOne({where: {userId: response[i].id}, raw: true});
            let getuserwallet = await user_wallet.findOne({where: {userId: response[i].id}, raw: true});
            if (getrefer) {
                console.log(getrefer)
                let referUser = await user.findOne({where: {id: getrefer.referralUserId}, raw: true});
                console.log(referUser);
                userN = (referUser) ? referUser.username + '(' + referUser.referralCode + ')' : ''
            }
            if(getuserwallet){
                response[i].wallet_balance = getuserwallet.mainBalance;
            }
            response[i].referred_by = userN;

        }
        // response.map(async(element) => {

        //     console.log(userN);
        //     element.referred_by = userN;
        // })
        // response = await Promise.all(response);
        let totalCount = responseTotalCount.length;
        let users = {};
        users.count = totalCount;
        users.rows = response;
        return successResponse(req, res, {users});
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

// module.exports.mostWinsUsers = async (req, res) => {
//   try {
//     const users = await user.findAll({
//       attributes: ["name", "email"],
//       include: {
//         model: wallet,
//         order: [["wins", "ASC"]],
//       },
//     });
//     return successResponse(req, res, { data: users });
//   } catch (error) {
//     return errorResponse(req, res, error.message);
//   }
// };
// module.exports.dashboard = async (req, res) => {
//   try {
//     const data = await wallet.findAll({
//       attributes: ["setAmount", "withdrawable"],
//     });
//     return successResponse(req, res, { data });
//   } catch (error) {
//     return errorResponse(req, res, error.message);
//   }
// };

module.exports.UserWithKyc = async (req, res) => {
    try {
        const userData = await user.findAll({
            where: {
                kyc: "Yes",
            },
        });
        return successResponse(req, res, {user: userData});
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.register = async (req, res) => {
    try {
        const {username, mobile, email, password} = req.body;

        if (process.env.IS_GOOGLE_AUTH_ENABLE === "true") {
            if (!req.body.code) {
                throw new Error("code must be defined");
            }
            const {code} = req.body;
            const customUrl = `${process.env.GOOGLE_CAPTCHA_URL}?secret=${process.env.GOOGLE_CAPTCHA_SECRET_SERVER}&response=${code}`;
            const response = await axios({
                method: "post",
                url: customUrl,
                data: {
                    secret: process.env.GOOGLE_CAPTCHA_SECRET_SERVER,
                    response: code,
                },
                config: {headers: {"Content-Type": "multipart/form-data"}},
            });
            if (!(response && response.data && response.data.success === true)) {
                throw new Error("Google captcha is not valid");
            }
        }

        const userData = await user.findOne({
            where: {
                [Op.or]: [{email: email}, {username: username}, {mobile: mobile}],
            },
        });
        if (userData) {
            const existKey =
                userData.email === email
                    ? "email"
                    : userData.mobile === mobile
                    ? "mobile"
                    : userData.username
                        ? "username"
                        : "";
            throw new Error(`User already exists with ${existKey}`);
        }
        const reqPass = crypto.createHash("md5").update(password).digest("hex");
        const otp = "111111";
        const payload = {
            mobile,
            email,
            username,
            password: reqPass,
            isVerified: false,
            verifyToken: uniqueId(),
            phoneOTP: otp,
            isAdmin: true,
        };

        await user.create(payload);
        return successResponse(req, res, {
            message: "User registered successfully",
        });
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};
module.exports.login = async (req, res) => {
    try {
        // Parse the private key using forge
        const privKey = forge.pki.privateKeyFromPem(PRIVATE_KEY);

        // Get the encrypted message from the request body
        const encryptedMessageBytes = Buffer.from(req.body.password, 'base64');

        // Decrypt the message using the private key
        const decryptedMessageBytes = privKey.decrypt(encryptedMessageBytes);
        const decryptedMessage = forge.util.decodeUtf8(decryptedMessageBytes);
        console.log("decryptedMessage--->", decryptedMessage);

        // Create a new NodeRSA instance with the public key
        // const key = new NodeRSA(PUBLIC_KEY);
        // console.log("key-->",key);

        // Query user data
        const userData = await user.scope("withSecretColumns").findOne({
            where: { username: req.body.username },
        });

        if (!userData) {
            throw new Error("Incorrect Username/Password");
        }

        // Decrypt the encrypted password
        // const decryptedPassword = key.decrypt(decryptedMessage, 'utf8');

        // Hash the decrypted password
        const hashedPassword = crypto.createHash("md5").update(decryptedMessage).digest("hex");

        // Compare with stored password hash
        if (hashedPassword !== userData.password) {
            throw new Error("Incorrect Username/Password");
        }

        // Generate JWT token
        const token = jwt.sign({
            user: {
                userId: userData.id,
                email: userData.email,
                createdAt: new Date(),
            },
        }, process.env.SECRET);

        // Remove sensitive data from user object
        delete userData.dataValues.password;

        // Send success response with user data and token
        return successResponse(req, res, { user: userData, token });
    } catch (error) {
        console.error(error);
        return errorResponse(req, res, error.message);
    }
};
// module.exports.login = async (req, res) => {
//     try {

//         const privKey = forge.pki.privateKeyFromPem(PRIVATE_KEY);
      
//       const newprivateKey = privateKey.replace(/\s+/g, "");
// const pkcs8Pem = newprivateKey;
// const text = req.body.password;



// // Decode the base64 encoded PKCS#8 private key
// const pkcs8EncodedBytes = Buffer.from(pkcs8Pem, 'base64');
// console.log("pkcs8EncodedBytes-->",pkcs8EncodedBytes);
// // Create the private key object
// const privKey = crypto.createPrivateKey({
//     key: pkcs8EncodedBytes,
//     format: 'der',
//     type: 'pkcs8'
// });
// // console.log("privKey",privKey);
// const encryptedMessageBytes = Buffer.from(text, 'base64');
// // Decrypt the message using the private key
// const decryptedMessageBytes = crypto.privateDecrypt(privKey, encryptedMessageBytes);

// // Convert the decrypted bytes to a UTF-8 string
// const decryptedMessage = decryptedMessageBytes.toString('utf8');

// console.log(" decryptedMessage--->", decryptedMessage);

//         // Load the RSA private key from environment variables or a secure location
//         const publicKey = process.env.PUBLIC_KEY;
//         console.log("privateKey",publicKey);

//         // Create a new NodeRSA instance with the private key
//         const key = new NodeRSA(publicKey);

//         const userData = await user.scope("withSecretColumns").findOne({
//             where: { username: req.body.username },
//         });

//         if (!userData) {
//             throw new Error("Incorrect Username/Password");
//         }

//         // Decrypt the encrypted password
//         const decryptedPassword = key.decrypt(decryptedMessage, 'utf8');

//         // Hash the decrypted password
//         const reqPass = crypto
//             .createHash("md5")
//             .update(decryptedPassword)
//             .digest("hex");

//         if (reqPass.localeCompare(userData.password) !== 0) {
//             throw new Error("Incorrect Username/Password");
//         }

//         const token = jwt.sign(
//             {
//                 user: {
//                     userId: userData.id,
//                     email: userData.email,
//                     createdAt: new Date(),
//                 },
//             },
//             process.env.SECRET
//         );

//         delete userData.dataValues.password;

//         return successResponse(req, res, { user: userData, token });
//     } catch (error) {
//         return errorResponse(req, res, error.message);
//     }
// };

module.exports.verifyOTP = async (req, res) => {
    try {
        const {mobile, otp} = req.body;
        const user = await user.findOne({
            where: {mobile: mobile},
        });

        if (user.phoneOTP !== otp) {
            return errorResponse(req, res, "Invalid OTP");
        }

        await user.update(
            {phoneOTP: "", isMobileVerified: true},
            {where: {id: user.id}}
        );
        return successResponse(req, res, {
            message: "OTP verified successfully",
        });
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.checkUserExist = async (req, res) => {
    try {
        const {mobile} = req.params;

        const user = await user.findOne({
            where: {mobile: mobile},
        });

        if (user) {
            return errorResponse(req, res, {message: "User exist"});
        }

        return successResponse(req, res, {message: "User available"});
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.sendEmailOTP = async (req, res) => {
    const {email} = req.params;
    try {
        const userData = await user.findOne({
            where: {
                email: email,
                isAdmin: true
            },
        });
        if (!userData) {
            return errorResponse(req, res, `No user found with this email`);
        }

        const otp = String(Math.random() * 1000000).slice(0, 6);

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
        const {username, newPassword} = req.body;
        const userOtp = await user_otp.findOne({
            include: [
                {
                    model: user,
                    as: user.userId,
                    where: {username: username},
                },
            ],
        });
        if (!userOtp) {
            return errorResponse(req, res, `Incorrect Username `);
        }
        if (!userOtp.isVerified) {
            return errorResponse(req, res, `Please verify OTP`);
        }
        const userData = await user.findOne({
            where: {username: username},
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
                    where: {username: username},
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

module.exports.addChatTemplate = async (req, res) => {
    try {
        const {title} = req.body;
        if (!title) {
            return errorResponse(req, res, `Title is required `);
        }
        let checkTitle = await db.ludo_chat_template.findOne({where: {title: title, status: 1}});
        if (checkTitle) {
            return errorResponse(req, res, `Title Already added `);
        }
        await db.ludo_chat_template.create({title: title, status: 1});
        return successResponse(req, res, {
            message: "Chat Template added successfully",
        });
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.updateChatTemplate = async (req, res) => {
    try {
        const id = req.params.id;
        console.log('id', id);
        const title = req.body.title;
        if (!title) {
            return errorResponse(req, res, `Title is required `);
        }
        let checkTitle = await db.ludo_chat_template.findOne({where: {id: id}});
        if (!checkTitle) {
            return errorResponse(req, res, `Chat Template not found`);
        }
        await db.ludo_chat_template.update({title: title}, {where: {id: id}});
        return successResponse(req, res, {
            message: "Chat Template updated successfully",
        });
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.getChatTemplate = async (req, res) => {
    try {
        let data = await db.ludo_chat_template.findAll();
        return successResponse(req, res, data);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.getChatTemplateById = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            return errorResponse(req, res, `Id is required `);
        }

        let data = await db.ludo_chat_template.findOne({where: {id: id}});
        if (!data) {
            return errorResponse(req, res, `Chat Template not found`);
        }
        return successResponse(req, res, data);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.deleteChatTemplateById = async (req, res) => {
    try {
        const {id} = req.body.params;
        if (!id) {
            return errorResponse(req, res, `Id is required `);
        }

        let data = await db.ludo_chat_template.findOne({where: {id: id}});
        if (!data) {
            return errorResponse(req, res, `Chat Template not found`);
        }
        await db.ludo_chat_template.destroy({where: {id: id}});
        return successResponse(req, res, {
            message: 'Chat Template deleted'
        });
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};


module.exports.addPromocode = async (req, res) => {
    console.log('sss');
    let responseData = {};
    try {
        const {
            promocode_type,
            coupon_code,
            amount_type,
            amount,
            start_date,
            end_date,
            no_of_usage_user,
            min_usage,
            max_usage
        } = req.body;
        let checkPromocode = await promocodes.findOne({
            where: {
                promocode_type: promocode_type,
                coupon_code: coupon_code
            }
        });
        if (checkPromocode) {
            return errorResponse(req, res, `Already Added`);
        }

        if (min_usage && max_usage && (parseInt(min_usage) > parseInt(max_usage))) {
            return errorResponse(req, res, `Min usage should not be greater than max usage`);
        }
        let roleObj = {
            promocode_type: promocode_type,
            coupon_code: coupon_code,
            amount_type: amount_type,
            amount: amount,
            start_date: start_date,
            end_date: end_date,
            no_of_usage_user: no_of_usage_user,
            min_usage: min_usage,
            max_usage: max_usage,
            added_by: req.user.userId
        }
        await promocodes.create(roleObj);
        return successResponse(req, res, {
            message: 'Promocode Added Done'
        });
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}

module.exports.promocodeList = async (req, res) => {
    let responseData = {};
    try {
        let getPromocode = await promocodes.findAll({where: {promocode_status: {[Op.ne]: '2'}}});
        if (getPromocode.length == 0) {
            return errorResponse(req, res, 'Promocode not found');
        }
        return successResponse(req, res, getPromocode);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}

module.exports.promocodeById = async (req, res) => {
    let responseData = {};
    try {
        let getPromocode = await promocodes.findOne({where: {promocode_id: req.params.id}});
        if (!getPromocode) {
            return errorResponse(req, res, 'Promocode not found');
        }
        return successResponse(req, res, getPromocode);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}

module.exports.updatePromocodeById = async (req, res) => {
    let responseData = {};
    try {
        const {
            promocode_id,
            promocode_type,
            coupon_code,
            amount_type,
            amount,
            start_date,
            end_date,
            no_of_usage_user,
            min_usage,
            max_usage
        } = req.body;
        let checkPromocode = await promocodes.findOne({where: {promocode_id: promocode_id}});
        if (!checkPromocode) {
            return errorResponse(req, res, 'PromoCode not found');
        }
        if (min_usage && max_usage && (parseInt(min_usage) > parseInt(max_usage))) {
            return errorResponse(req, res, 'Min usage should not be greater than max usage');
        }
        let roleObj = {
            promocode_type: promocode_type,
            coupon_code: coupon_code,
            amount_type: amount_type,
            amount: amount,
            start_date: start_date,
            end_date: end_date,
            no_of_usage_user: no_of_usage_user,
            min_usage: min_usage,
            max_usage: max_usage,
            updated_by: req.user.userId
        }
        await promocodes.update(roleObj, {where: {promocode_id: promocode_id}});
        return successResponse(req, res, {
            message: 'Promocode updated Done'
        });
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}

module.exports.changePromocodeStatus = async (req, res) => {
    let responseData = {};
    try {
        const {id, status} = req.body;
        let checkPromocode = await promocodes.findOne({where: {promocode_id: id}});
        if (!checkPromocode) {
            return errorResponse(req, res, 'Promocode not found');
        }
        let roleObj = {
            promocode_status: status,
            updated_by: req.user.userId
        }
        await promocodes.update(roleObj, {where: {promocode_id: id}});
        return successResponse(req, res, {
            message: 'Status Changed Done'
        });
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}


module.exports.getUserDetail = async (req, res) => {
    try {
        let result = await user.findOne({where: {id: req.params.user_id}});
        if (result) {
            return successResponse(req, res, result);
        }
        return successResponse(req, res, 'Not user details');
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.tdsSettingUpdate = async (req, res) => {
    try {
        let result = await tds_setting.findOne();
        if (result) {
            await tds_setting.update({tds_percentage: req.body.tds_percentage}, {where: {id: result.id}});
        } else {
            await tds_setting.create({tds_percentage: req.body.tds_percentage});
        }

        return successResponse(req, res, 'TDS setting update');
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.getTdsSetting = async (req, res) => {
    try {
        let result = await tds_setting.findOne();
        if (result) {
            return successResponse(req, res, result);
        }
        return successResponse(req, res, 'Not tds details');
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
        if (!ifscCode) {
            return errorResponse(req, res, "Ifsc code is required");
        }
        if (!bankAddress) {
            return errorResponse(req, res, "Bank Address is required");
        }
        if (!bankAccountNo) {
            return errorResponse(req, res, "Account number is required");
        }
        let userDet = await user.findOne({where: {id: userId}});
        if (!userDet) {
            return errorResponse(req, res, {message: 'User not found'})
        }


        let contactDet = {
            name: userDet.username,
            email: userDet.email,
            mobile: userDet.mobile,
            user_id: userId
        }
        let contactRes = await addRazorPayContact(contactDet);
        console.log(contactRes);
        let bankDet = {
            name: accountHolderName,
            ifsc_code: ifscCode,
            customer_id: contactRes.customer_id,
            account_number: bankAccountNo
        }
        let bankRes = await addBankToRazorpay(bankDet)
        console.log(bankRes);
        if (bankRes.status == 500) {
            return errorResponse(req, res, {message: bankRes.message})
        }
        bankJson.userId = userId;
        bankJson.customerId = contactRes.customer_id;
        bankJson.fundId = bankRes.fund_id;
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

module.exports.getHomeAccount = async (req, res) => {
    try {
        let userId = req.user.userId;
        let {dayType, fromDate, todate} = req.query;
        let userquery = `isAdmin=0`;
        let winquery = '';
        let walletquery = '';
        let transquery = `payment_status = 'SUCCESS'`;
        let withdrawquery = `status = 'Withdraw'`;
        if (dayType == 1) {
            fromDate = moment(new Date()).format('YYYY-MM-DD');
            userquery += ` AND DATE(createdAt) = '${fromDate}'`;
            winquery += ` DATE(createdAt) = '${fromDate}'`;
            walletquery += `DATE(createdAt) = '${fromDate}'`;
            transquery += ` AND DATE(createdAt) = '${fromDate}'`;
            withdrawquery += ` AND DATE(createdAt) = '${fromDate}'`;
        } else if (dayType == 2) {
            let dates = last7Days();
            dates = dates.reverse();
            fromDate = dates[0];
            todate = moment(new Date()).format('YYYY-MM-DD');
            userquery += ` AND DATE(createdAt) BETWEEN '${fromDate}' AND '${todate}'`;
            winquery += `DATE(createdAt) BETWEEN '${fromDate}' AND '${todate}'`;
            walletquery += `DATE(createdAt) BETWEEN '${fromDate}' AND '${todate}'`;
            transquery += ` AND DATE(createdAt) BETWEEN '${fromDate}' AND '${todate}'`;
            withdrawquery += ` AND DATE(createdAt) BETWEEN '${fromDate}' AND '${todate}'`;
        } else if (dayType == 3) {
            var today = new Date();
            var year = today.getFullYear();
            var month = today.getMonth() + 1;
            userquery += ` AND YEAR(createdAt) = '${year}' AND MONTH(createdAt)='${month}'`;
            winquery += `YEAR(createdAt) = '${year}' AND MONTH(createdAt)='${month}'`;
            walletquery += `YEAR(createdAt) = '${year}' AND MONTH(createdAt)='${month}'`;
            transquery += ` AND YEAR(createdAt) = '${year}' AND MONTH(createdAt)='${month}'`;
            withdrawquery += ` AND YEAR(createdAt) = '${year}' AND MONTH(createdAt)='${month}'`;
        } else if (dayType == 4) {
            var today = new Date();
            var year = today.getFullYear();
            userquery += ` AND YEAR(createdAt) = '${year}'`;
            winquery += `YEAR(createdAt) = '${year}'`;
            walletquery += `YEAR(createdAt) = '${year}'`;
            transquery += ` AND YEAR(createdAt) = '${year}'`;
            withdrawquery += ` AND YEAR(createdAt) = '${year}'`;
        } else if (dayType == 5 && fromDate && todate) {
            fromDate = moment(fromDate).format('YYYY-MM-DD');
            todate = moment(todate).format('YYYY-MM-DD');
            userquery += ` AND DATE(createdAt) BETWEEN '${fromDate}' AND '${todate}'`;
            winquery += `DATE(createdAt) BETWEEN '${fromDate}' AND '${todate}'`;
            walletquery += `DATE(createdAt) BETWEEN '${fromDate}' AND '${todate}'`;
            transquery += ` AND DATE(createdAt) BETWEEN '${fromDate}' AND '${todate}'`;
            withdrawquery += ` AND DATE(createdAt) BETWEEN '${fromDate}' AND '${todate}'`;
        } else {
            winquery += `1=1`;
            walletquery += `1=1`;
        }
        let newUserCount = 0;
        if (fromDate) {
            let newUser = await sequelize.query(`Select *  from users where isAdmin=0 and DATE(createdAt) = '${fromDate}'`, {type: sequelize.QueryTypes.SELECT});
            newUserCount = newUser.length;
        }

        let userCount = await sequelize.query(`Select *  from users where ${userquery}`, {type: sequelize.QueryTypes.SELECT});
        let totalWinning = await sequelize.query(`Select SUM(winAmount) AS winningAmount from game_history where ${winquery}`, {type: sequelize.QueryTypes.SELECT});
        let totalWallet = await sequelize.query(`Select SUM(mainBalance) AS mainAmount, SUM(winningBalance) AS winAmount from user_wallet where ${walletquery}`, {type: sequelize.QueryTypes.SELECT});
        let totalTransaction = await sequelize.query(`Select * from transaction where ${transquery}`, {type: sequelize.QueryTypes.SELECT});
        let totalWithdrawal = await sequelize.query(`Select SUM(amount) AS withdrawAmount from redemptions where ${withdrawquery}`, {type: sequelize.QueryTypes.SELECT});
        let winningAmt = totalWinning[0].winningAmount;
        console.log(totalWallet);
        let result = {
            newUser: newUserCount,
            totalUser: userCount.length,
            totalWinning: (winningAmt) ? winningAmt.toFixed(2) : 0.00,
            totalWallet: (totalWallet[0].mainAmount) ? parseFloat(totalWallet[0].mainAmount) + parseFloat(totalWallet[0].winAmount) : 0,
            totalTransaction: totalTransaction.length,
            totalwithdrawal: (totalWithdrawal[0].withdrawAmount) ? totalWithdrawal[0].withdrawAmount : 0
        }
        return successResponse(req, res, result);
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.getBankDetails = async (req, res) => {
    try {
        const {page, search_key, from_date, end_date,page_limit} = req.query;
        let limits = (page_limit) ? page_limit : 50 ;
        const {limit, offset} = getPagination(page, limits);
        let response, responseTotalCount;
        let query = `1=1`;
        if (from_date && end_date) {
            console.log('d');
            let fromDate = moment(from_date).format('YYYY-MM-DD');
            let endDate = moment(end_date).format('YYYY-MM-DD');
            query += ` AND DATE(bank_accounts.createdAt) BETWEEN '${fromDate}' AND '${endDate}'`;
        }
        if (search_key) {
            query += ` AND (users.username like '%${search_key}%' OR  users.mobile like '%${search_key}%')`;
        }
        query += ` order by id DESC`;
        response = await sequelize.query(`Select bank_accounts.*,users.username,users.mobile  from bank_accounts INNER JOIN users on bank_accounts.userId=users.id where ${query} LIMIT ${offset}, ${limit}`, {type: sequelize.QueryTypes.SELECT});
        responseTotalCount = await sequelize.query(`Select bank_accounts.*,users.username,users.mobile  from bank_accounts INNER JOIN users on bank_accounts.userId=users.id where ${query}`, {type: sequelize.QueryTypes.SELECT});
        let totalCount = responseTotalCount.length;
        let users = {};
        users.count = totalCount;
        users.rows = response;
        // if (totalCount > 0) {
        //     return successResponse(req, res, {users});
        // } else {
        //     return errorResponse(req, res, 'No Data found');
        // }
        return successResponse(req, res, {users});
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.getKycList = async (req, res) => {
    try {
        const {page, search_key, from_date, end_date,page_limit} = req.query;
        let limits = (page_limit) ? page_limit : 50 ;
        const {limit, offset} = getPagination(page, limits);
        let response, responseTotalCount;
        response = await sequelize.query(`Select user_kycs.*,users.username,users.mobile,users.kyc  from user_kycs INNER JOIN users on user_kycs.userId=users.id where user_kycs.status=0 LIMIT ${offset}, ${limit}`, {type: sequelize.QueryTypes.SELECT});
        responseTotalCount = await sequelize.query(`Select user_kycs.*,users.username,users.mobile,users.kyc  from user_kycs INNER JOIN users on user_kycs.userId=users.id where user_kycs.status=0`, {type: sequelize.QueryTypes.SELECT});
        let totalCount = responseTotalCount.length;
        let users = {};
        users.count = totalCount;
        users.rows = response;
        // if (totalCount > 0) {
        //     return successResponse(req, res, {users});
        // } else {
        //     return errorResponse(req, res, 'No Data found');
        // }
        return successResponse(req, res, {users});
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.getTdsList = async (req, res) => {
    try {
        const {page, search_key, from_date, end_date,page_limit} = req.query;
        let limits = (page_limit) ? page_limit : 50 ;
        const {limit, offset} = getPagination(page, limits);
        let checkUser, responseTotalCount;
        let query = `isAdmin=0`;
        if (from_date && end_date) {
            console.log('d');
            let fromDate = moment(from_date).format('YYYY-MM-DD');
            let endDate = moment(end_date).format('YYYY-MM-DD');
            query += ` AND DATE(createdAt) BETWEEN '${fromDate}' AND '${endDate}'`;
        }
        if (search_key) {
            query += ` AND (username like '%${search_key}%' OR name like '%${search_key}%' OR email like '%${search_key}%' OR mobile like '%${search_key}%')`;
        }
        query += ` order by id DESC`;
        checkUser = await sequelize.query(`Select id, name, kyc, mobile, email, username as User_Name, isMobileVerified as Is_Mobile_Verified, isEmailVerified as Is_Email_Verified, isVerified as Is_Verified, referralCode as Referral_Code, facebookUserId as Facebook_User_Id, createdAt as Created_At, updatedAt as Updated_At  from users where ${query} LIMIT ${offset}, ${limit}`, {type: sequelize.QueryTypes.SELECT});
        responseTotalCount = await sequelize.query(`Select *  from users where ${query}`, {type: sequelize.QueryTypes.SELECT});
        let newArr = [];
        for (let i = 0; i < checkUser.length; i++) {
            let userKyc = await user_kyc.findOne({where: {userId: checkUser[i].id}, raw: true})
            let wallet = await user_wallet.findOne({where: {userId: checkUser[i].id}, raw: true})
            let data = await redemption.findAll(
                {
                    where: {userId: checkUser[i].id, status: 'Withdraw'},
                    attributes: [
                        [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalAmount'],
                        [Sequelize.fn('SUM', Sequelize.col('tdsAmount')), 'tdsAmount']
                    ], raw: true
                });
            let result = {
                user_id: checkUser[i].id,
                username: checkUser[i].User_Name,
                mobileNo: checkUser[i].mobile,
                kyc_status: checkUser[i].kyc,
                status: (userKyc) ? userKyc.status : 0,
                panNumber: (userKyc) ? userKyc.panNumber : '',
                panDoc: (userKyc) ? userKyc.panDoc : '',
                totalAmount: (data[0].totalAmount) ? data[0].totalAmount : 0,
                tdsAmount: (data[0].tdsAmount) ? data[0].tdsAmount : 0,
                mainBalance: (wallet && wallet.mainBalance) ? wallet.mainBalance : 0,
                bonusBalance: (wallet && wallet.bonusBalance) ? wallet.bonusBalance : 0,
                winningBalance: (wallet && wallet.winningBalance) ? wallet.winningBalance : 0,
                createdAt: checkUser[i].Created_At
            }

            newArr.push(result);
        }

        let totalCount = responseTotalCount.length;
        let users = {};
        users.count = totalCount;
        users.rows = newArr;
        return successResponse(req, res, {users});
        // let checkUser = await user.findAll({raw:true});
        // if (checkUser.length > 0) {
        //     let newArr = [];
        //     for(let i=0; i<checkUser.length; i++){
        //         let userKyc = await user_kyc.findOne({where:{userId:checkUser[i].id}, raw:true})
        //         let wallet  = await user_wallet.findOne({where:{userId:checkUser[i].id}, raw:true})
        //         let data = await redemption.findAll(
        //             {where: {userId: checkUser[i].id,status:'Withdraw'},
        //                 attributes: [
        //                     [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalAmount'],
        //                     [Sequelize.fn('SUM', Sequelize.col('tdsAmount')), 'tdsAmount']
        //                 ],raw:true});
        //         let result = {
        //             user_id: checkUser[i].id,
        //             username: checkUser[i].username,
        //             mobileNo: checkUser[i].mobile,
        //             panNumber: (userKyc) ? userKyc.panNumber : '',
        //             panDoc: (userKyc) ? userKyc.panDoc : '',
        //             adharFrontDoc: (userKyc) ? userKyc.adharFrontDoc : '',
        //             adharBackDoc: (userKyc) ? userKyc.adharBackDoc : '',
        //             adharNumber: (userKyc) ? userKyc.adharNumber : '',
        //             totalAmount: (data[0].totalAmount) ? data[0].totalAmount : 0,
        //             tdsAmount: (data[0].tdsAmount) ? data[0].tdsAmount : 0,
        //             mainBalance: (wallet && wallet.mainBalance) ? wallet.mainBalance: 0,
        //             bonusBalance: (wallet && wallet.bonusBalance) ? wallet.bonusBalance: 0,
        //             winningBalance: (wallet && wallet.winningBalance) ? wallet.winningBalance: 0
        //         }
        //
        //         newArr.push(result);
        //     }
        //     return successResponse(req, res, newArr);
        // }
        //return errorResponse(req, res, 'Detail not found');
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.addBonus = async (req, res) => {
    try {
        let {user_id, amount} = req.body;
        let wallet = await user_wallet.findOne({where: {userId: user_id}, raw: true})
        let bonus;
        if (wallet) {
            bonus = parseFloat(wallet.bonusBalance) + parseFloat(amount);
            await user_wallet.update({bonusBalance: bonus}, {where: {userId: user_id}})
        } else {
            bonus = parseFloat(amount);
            await user_wallet.create({bonusBalance: bonus, userId: user_id})
        }
        const transactionInfo = {
            transactionId: Math.floor(Math.random() * 1000000000),
            currency: 'INR',
            cash: 0,
            bonus: amount,
            reference: 'By Admin',
            payment_status: 'SUCCESS',
            userId: user_id,
            type: 'DEPOSIT',
        };

        await transaction.create(transactionInfo);
        return successResponse(req, res, 'Coin Added Done');
    } catch (error) {
        return errorResponse(req, res, error.message)
    }
}

module.exports.userExport = async (req, res) => {
    await user.findAll({
        where: {isAdmin: 0}, raw: true
    }).then((objs) => {
        let users = [];

        objs.forEach((obj) => {
            const { id, mobile, username } = obj;
            users.push({ id, mobile, username });
        });

        const csvFields = ["Id", "Mobile", "UserName"];
        const csvParser = new CsvParser({ csvFields });
        const csvData = csvParser.parse(users);

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=users.csv");

        res.status(200).end(csvData);
    });
}
