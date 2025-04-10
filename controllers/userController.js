const responseHelper = require('../helpers/customResponse');
const userService = require("../services/userService");
const clubService = require("../services/clubService");
const adminService = require("../services/adminService");
const pokerService = require('../services/pokerService');
const {sendPushNotification} = require('../utils/sendnotification')

const {comparePassword, encryptPassword, encryptData, decryptData, makeString, OTP,panVerify,
    adhaarVerify,
    verifyAdhaarOtp} = require("../utils");
const {
    addBeneficiary,
    bankWithdraw,
    bankDetailsVerify,
    getBeneficiaryId,
    signRequest,
    payIn,
    payOut,
    getepayPortal
} = require("../utils/payment");
const { decryptEas } = require('./../components/decryptEas');
const { encryptEas } = require('./../components/encryptEas');
const {
    getRandomAlphanumeric
} = require("../utils/index");
const sendEmail = require("../utils/sendEmail");
const config = require("../config/config.json");
const {Op, fn, col} = require("sequelize");
const moment = require('moment');
const {sequelize} = require('../models/index')
const process = require('process');
const dotenv = require("dotenv");
dotenv.config();
const axios = require('axios');
const {getRedisClient} = require("../helpers/redis");
const { QueryTypes } = require("sequelize");

const getProfile = async (req, res) => {
    let responseData = {};
    try {
        let user = req.user;
        let id = user.user_id;
        let query = {user_id: id}
        //console.log('await',await redisClient.get(id.toString()));
        console.log(query);
        let getUser = await userService.getUserDetailsById(query);
        if (!getUser) {
            responseData.msg = 'No User Found';
            return responseHelper.error(res, responseData, 201);
        }
        let userWallet = await userService.getUserWalletDetailsById({user_id: id});
        let userKyc = await userService.getUserKycDetailsById({user_id: id});
        let userBank = await userService.getUserBankDetailsById({user_id: id});

        let bankD = {
            bank_name: (userBank) ? userBank.bank_name : '',
            account_holder_name: (userBank) ? userBank.account_holder_name : '',
            ifsc_code: userBank?.ifsc_code ? await decryptData(userBank.ifsc_code) : "",
            account_no: userBank?.account_no ? await decryptData(userBank.account_no) : "",
            bank_address: (userBank) ? userBank.bank_address : ''
        }
        let today = new Date().toISOString().split('T')[0];
        let isClaim = 0;
        if (userWallet && (moment(userWallet.last_claim_date).format('YYYY-MM-DD') == today)) {
            isClaim = 1;
        }
        let isKycDone = 0;
        if (userKyc && userKyc.is_pan_card_verify == 1 && userKyc.is_adhaar_verify == 1) {
            isKycDone = 1;
        }
        userWallet.dataValues.is_claim = isClaim;
        getUser.profile_image = (getUser.profile_image) ? getUser.profile_image : '';
        getUser.mobile = getUser.mobile ? await decryptData(getUser.mobile) : "";
        getUser.email = getUser.email ? await decryptData(getUser.email) : "";
        getUser.user_wallet = userWallet;
        getUser.pan_number = (userKyc) ? await userKyc.pan_number : '';
        getUser.is_pan_card_verify = (userKyc) ? await userKyc.is_pan_card_verify : '';
        getUser.is_kyc_done = isKycDone;
        getUser.adhaar_number = (userKyc) ? await userKyc.adhaar_number : '';
        getUser.is_adhaar_verify = (userKyc) ? await userKyc.is_adhaar_verify : '';
        getUser.bank_details = bankD;
        responseData.msg = 'User Fetch successfully!!!';
        responseData.data = getUser;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const updateProfile = async (req, res) => {
    const responseData = {};
    let transaction;

    try {
        const { body: reqObj, user } = req;
        const { user_id: id } = user;
        const query = { user_id: id };

        // Start transaction
        transaction = await sequelize.transaction();

        // Get user details
        const getUser = await userService.getUserDetailsById(query, { transaction });
        if (!getUser) {
            await transaction.rollback();
            responseData.msg = 'No User Found';
            return responseHelper.error(res, responseData, 404);
        }

        // Helper function to safely update fields
        const getUpdatedValue = (newValue, currentValue) =>
            (newValue !== undefined && newValue !== '') ? newValue : currentValue;

        // Prepare updated user data
        const userData = {
            username: getUpdatedValue(reqObj.user_name, getUser.username),
            email: getUpdatedValue(reqObj.email, getUser.email),
            gender: getUpdatedValue(reqObj.gender, getUser.gender),
            dob: getUpdatedValue(reqObj.dob, getUser.dob),
            is_email_verified: getUser.is_email_verified
        };

        // Check for duplicate username
        if (userData.username !== getUser.username) {
            const existingUser = await userService.getUserDetailsById(
                { user_id: { [Op.ne]: id }, username: userData.username },
                { transaction }
            );
            if (existingUser) {
                await transaction.rollback();
                responseData.msg = 'Username is already registered';
                return responseHelper.error(res, responseData, 409);
            }
        }

        // Update user
        await userService.updateUserByQuery(userData, query, { transaction });

        // Create user log
        const userLog = {
            user_id: id,
            device_token: getUser.device_token,
            activity_type: 'update profile',
            old_value: JSON.stringify(getUser),
            new_value: JSON.stringify(userData)
        };
        await userService.addUserLog(userLog, { transaction });

        // Bank Account Update
        const checkUserBank = await userService.getUserBankDetailsById({ user_id: id }, { transaction });
        const {
            bank_name,
            account_holder_name,
            ifsc_code,
            account_no,
            bank_address
        } = reqObj;

        // Helper function for bank fields
        const getBankFieldValue = async (newValue, existingValue, shouldEncrypt = false) => {
            if (newValue !== undefined && newValue !== '') {
                return shouldEncrypt ? await encryptData(newValue) : newValue;
            }
            return existingValue;
        };

        const beneficiaryId = checkUserBank?.beneficiary_id || new Date().getTime();
        const accountData = {
            user_id: id,
            beneficiary_id: beneficiaryId,
            bank_name: await getBankFieldValue(bank_name, checkUserBank?.bank_name),
            account_holder_name: await getBankFieldValue(account_holder_name, checkUserBank?.account_holder_name),
            ifsc_code: await getBankFieldValue(ifsc_code, checkUserBank?.ifsc_code, true),
            account_no: await getBankFieldValue(account_no, checkUserBank?.account_no, true),
            bank_address: await getBankFieldValue(bank_address, checkUserBank?.bank_address)
        };

        // Validate required bank fields when creating or updating
        if (!accountData.bank_name || !accountData.account_no) {
            await transaction.rollback();
            responseData.msg = 'Bank name and account number are required';
            return responseHelper.error(res, responseData, 400);
        }

        if (checkUserBank) {
            await userService.updateBankAccount(accountData,
                { user_account_id: checkUserBank.user_account_id },
                { transaction }
            );
        } else {
            await userService.createBankAccount(accountData, { transaction });
        }

        // Commit transaction
        await transaction.commit();

        responseData.msg = 'User updated successfully';
        responseData.data = {};
        return responseHelper.success(res, responseData);

    } catch (error) {
        if (transaction) await transaction.rollback();
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, error.status || 500);
    }
};
const updateProfileImage = async (req, res) => {
    let responseData = {};
    try {
        let reqObj = req.body;
        let user = req.user;
        let id = user.user_id;
        let query = {user_id: id}
        let getUser = await userService.getUserDetailsById(query);
        if (!getUser) {
            responseData.msg = 'No User Found';
            return responseHelper.error(res, responseData, 201);
        }
        console.log(req.file);
        const file = req.file

        let profile;
        if (file) {
            console.log('ddd');
            profile = req.file.location;
        } else {
            console.log('ddd1');
            profile = getUser.profile_image;

        }
        let userData = {
            profile_image: profile
        }

        let userLog = {
            user_id: id,
            device_token: getUser.device_token,
            activity_type: 'update profile image',
            old_value: JSON.stringify(getUser),
            new_value: JSON.stringify(userData)
        }
        let updateUser = await userService.updateUserByQuery(userData, query);
        let updateLog = await userService.addUserLog(userLog);

        responseData.msg = 'Profile Image Updated successfully!!!';
        responseData.data = {};
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const changePassword = async (req, res) => {
    let responseData = {};
    try {
        let reqObj = req.body;
        let user = req.user;
        console.log(user);
        let id = user.user_id;
        let query = {user_id: id}
        let getUser = await userService.getUserDetailsById(query);
        if (!getUser) {
            responseData.msg = 'No User Found';
            return responseHelper.error(res, responseData, 201);
        }
        console.log(1);
        let comparePasswrd = await comparePassword(reqObj.old_password, getUser.password);
        console.log(4);
        if (!comparePasswrd) {
            console.log(3);
            responseData.msg = `Invalid old password !!!`;
            return responseHelper.error(res, responseData, 201);
        }

        console.log(2);
        let compareNewAndOld = await comparePassword(reqObj.new_password, getUser.password);
        if (compareNewAndOld) {
            responseData.msg = `New password must be different from old password !!!`;
            return responseHelper.error(res, responseData, 201);
        }
        let newPassword = await encryptPassword(reqObj.new_password);
        let updatedObj = {
            password: newPassword
        }

        let userLog = {
            user_id: id,
            device_token: getUser.device_token,
            activity_type: 'change password',
            old_value: getUser.password,
            new_value: newPassword
        }

        let updateProfile = await userService.updateUserByQuery(updatedObj, query);
        let updateLog = await userService.addUserLog(userLog);
        responseData.msg = `Password updated sucessfully !!!`;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const updateKyc = async (req, res) => {
    let responseData = {}
    try {
        console.log(req);
        let reqObj = req.body;
        let userId = req.user.user_id;
        let query = {
            user_id: userId
        }
        let userD = await userService.getUserDetailsById(query);
        if (!userD) {
            responseData.msg = 'user not found';
            return responseHelper.error(res, responseData, 201);
        }

        let checkUserKyc = await userService.getUserKycDetailsByQuery({user_id: userId});
        console.log(checkUserKyc);
        if (!checkUserKyc) {
            responseData.msg = 'Already updated';
            return responseHelper.error(res, responseData, 201);
        }
        let idType = reqObj.id_type;
        let idNumber = reqObj.id_number;
        let kycData = {
            user_id: userId,
            id_type: idType,
            id_number: await encryptData(idNumber),
            id_document: req.file.filename
        }

        let userLog = {
            user_id: userId,
            activity_type: 'update kyc',
            old_value: '',
            new_value: JSON.stringify(kycData)
        }

        let save = await userService.createUserKyc(kycData);
        let updateLog = await userService.addUserLog(userLog);
        responseData.msg = 'Kyc Updated Successfully';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const addBankAccount = async (req, res) => {
    let responseData = {}
    try {
        let userId = req.user.user_id;
        let query = {
            user_id: userId
        }
        let userD = await userService.getUserDetailsById(query);
        if (!userD) {
            responseData.msg = 'user not found';
            return responseHelper.error(res, responseData, 201);
        }
        let bankName, accountHoldername, ifscCode, accountNo, upiNo, bankAddress;
        if (req.body.bank_name != '') {
            bankName = req.body.bank_name;
        }

        if (req.body.account_holder_name != '') {
            accountHoldername = req.body.account_holder_name;
        }

        if (req.body.ifsc_code != '') {
            ifscCode = req.body.ifsc_code;
        }

        if (req.body.account_no != '') {
            accountNo = req.body.account_no;
        }

        if (req.body.upi_no != '') {
            upiNo = req.body.upi_no;
        }

        if (req.body.bank_address != '') {
            bankAddress = req.body.bank_address;
        }

        let benefiaciaryId = new Date().getTime();
        let bankData = {
            beneId: benefiaciaryId,
            name: accountHoldername,
            email: 'test@yopmail.com',
            phone: await decryptData(userD.mobile),
            bankAccount: accountNo,
            ifsc: ifscCode,
            address1: bankAddress,
            vpa: (upiNo) ? upiNo : ''
        }

        let accountData = {
            beneficiary_id: benefiaciaryId,
            user_id: userId,
            bank_name: bankName,
            account_holder_name: accountHoldername,
            ifsc_code: await encryptData(ifscCode),
            account_no: await encryptData(accountNo),
            upi_no: (upiNo) ? await encryptData(upiNo) : '',
            bank_address: bankAddress
        }
        let userLog = {
            user_id: userId,
            device_token: userD.device_token,
            activity_type: 'add bank account',
            old_value: '',
            new_value: JSON.stringify(accountData)
        }
        let bankVerify = await addBeneficiary(bankData);
        if (bankVerify.status == 'ERROR') {
            responseData.msg = bankVerify.message;
            return responseHelper.error(res, responseData, 201);
        }
        let save = await userService.createBankAccount(accountData);
        let updateLog = await userService.addUserLog(userLog);
        responseData.msg = 'Account Added Successfully';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const addAmount = async (req, res) => {
    let responseData = {};
    try {
        console.log(req.body);
        let amount = req.body.amount;

        let userId = req.user.user_id;
        let userD = await userService.getUserDetailsById({user_id: userId});
        if (!userD) {
            responseData.msg = 'user not found';
            return responseHelper.error(res, responseData, 201);
        }

        let mobile = await decryptData(userD.mobile);
        let random = await getRandomAlphanumeric(8);
        let transactionId = "TXN-" + random;
        let data = {
            order_id: transactionId,
            user_id: userId,
            type: 'CR',
            other_type: 'Deposit',
            amount: amount,
            transaction_status: 'Pending',
            reference: 'Deposit'
        }

        let reqData = {
            email: (userD.email) ? await decryptData(userD.email) : 'dinesh@7unique.in',
            name: userD.name,
            amount: amount,
            mobile: mobile,
            reference: transactionId
        };
        console.log(reqData);
        const response = await payIn(reqData);

        if (response.status == 'success') {
            await userService.createTransaction(data);
            responseData.msg = 'Payment link generated';
            responseData.data = {link: response.data.payment_link};
            return responseHelper.success(res, responseData);
        } else {
            responseData.msg = response.data.message;
            return responseHelper.error(res, responseData, 201);
        }
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 201);
    }
}

// const addAmount = async (req, res) => {
//     let responseData = {}
//     try {
//         let userId = req.user.user_id;
//         let query = {
//             user_id: userId
//         }
//         let userD = await userService.getUserDetailsById(query);
//         let userWallet = await userService.getUserWalletDetailsById({user_id: userId});
//         if (!userD) {
//             responseData.msg = 'user not found';
//             return responseHelper.error(res, responseData, 201);
//         }
//         let amount, category;
//         if (req.body.amount != '') {
//             amount = req.body.amount;
//         }
//
//         let openingBalnace, closingBalance, savewalet;
//         if (!userWallet) {
//             openingBalnace = amount;
//             closingBalance = amount;
//             let walletData = {
//                 user_id: userId,
//                 real_amount: amount
//             }
//             savewalet = await userService.createUserWallet(walletData);
//         } else {
//             openingBalnace = userWallet.real_amount;
//             closingBalance = (+userWallet.real_amount) + (+amount);
//
//             let walletData = {
//                 real_amount: closingBalance
//             }
//             savewalet = await userService.updateUserWallet(walletData, {user_wallet_id: userWallet.user_wallet_id});
//         }
//         let transactionId = "MT" + Date.now();
//         let data = {
//             user_id: userId,
//             closing_balance: closingBalance,
//             opening_balance: openingBalnace,
//             type: 'CR',
//             other_type: 'Deposit',
//             amount: amount,
//             order_id: transactionId,
//             reference: 'Deposit',
//             transaction_status: 'Success'
//         }
//         let userLog = {
//             user_id: userId,
//             activity_type: 'add amount',
//             old_value: '',
//             new_value: JSON.stringify(data)
//         }
//
//         let save = await userService.createTransaction(data);
//         let updateLog = await userService.addUserLog(userLog);
//         responseData.msg = 'Amount Added Successfully';
//         return responseHelper.success(res, responseData);
//     } catch (err) {
//         responseData.msg = err;
//         return responseHelper.error(res, responseData, 500);
//     }
// }
const updatePaymentStatus = async (reqData) => {
    let responseData = {};
    try {
        console.log('paymentstatus', reqData)
        let transactionData = await userService.getOneTransactionByQuery({
            order_id: reqData.reference,
            transaction_status: 'Pending'
        })
        if (!transactionData) {
            return {code: 201, status: false, message: 'Transaction not found', statusCode: ''}
        }
        let paymentStatus;
        if (reqData.status == 'Success') {
            paymentStatus = 'Success';
        } else if (reqData.status == 'Failed') {
            paymentStatus = 'Failed';
        } else {
            paymentStatus = 'Pending';
        }
        await userService.updateTransaction({transaction_status: paymentStatus}, {transaction_id: transactionData.transaction_id})
        if (reqData.status == 'Success') {
            const getUserWallet = await userService.getUserWalletDetailsById({
                user_id: transactionData.user_id
            })
            let realamount = parseFloat(transactionData.amount);
            console.log('realamount', realamount);
            if (!getUserWallet) {
                const walletInfo = {
                    user_id: transactionData.user_id,
                    real_amount: realamount
                }
                await userService.createUserWallet(walletInfo);
            } else {
                const mainBal = parseFloat(getUserWallet.real_amount) + realamount;
                console.log('mainBal', mainBal);
                await userService.updateUserWallet({real_amount: mainBal}, {user_wallet_id: getUserWallet.user_wallet_id});
            }
        }
        return {code: 200, status: true, message: 'Transaction ' + paymentStatus, statusCode: paymentStatus}
    } catch (error) {
        return {code: 500, status: false, message: 'Something went wrong', statusCode: 'Error'}
    }
}
const callBackStatus = async (request) => {
    try {
        let responseDatas = request.body.response
        console.log('response', responseDatas);
        let data1 = atob(responseDatas);
        let response = JSON.parse(data1)
        console.log('decoderesponse', response);
        const sign = responseDatas + process.env.PHONEPE_SALT_KEY;
        const X_VERIFY = signRequest(sign) + "###1";
        console.log(X_VERIFY);
        console.log(request.headers['x-verify']);
        if (X_VERIFY != request.headers['x-verify']) {
            return {status: false, code: 'Invalid Checksum'};
        }

        let responseData = response;
        let transactionId = responseData.data.merchantTransactionId;
        let amount = (responseData.data.amount / 100);
        const walletData = await userService.getTransactionById({
            order_id: transactionId
        });
        if (walletData && (walletData.amount != amount)) {
            return {status: false, code: 'Invalid Amount'};
        }
        console.log('callbackapi', walletData);
        if (walletData) {
            let status;
            if (responseData.code == 'TXN_AUTO_FAILED' || responseData.code == 'PAYMENT_ERROR' || responseData.code == 'PAYMENT_DECLINED') {
                status = 'FAILED';
            } else if (responseData.code == 'PAYMENT_SUCCESS') {
                status = 'SUCCESS';
            } else if (responseData.code == 'PAYMENT_PENDING') {
                status = 'TXN_PENDING';
            } else {
                status = 'FAILED';
            }
            console.log(status);
            await userService.updateTransaction({transaction_status: status}, {order_id: transactionId})
            if (status == 'SUCCESS') {
                const getUserWallet = await userService.getUserWalletDetailsById({
                    user_id: walletData.user_id
                })
                if (!getUserWallet) {
                    const walletInfo = {
                        user_id: walletData.user_id,
                        deposit: walletData.amount
                    }
                    await userService.createUserWallet(walletInfo);
                } else {
                    const mainBal = +(getUserWallet.deposit) + (+walletData.amount);
                    await userService.updateUserWallet({deposit: mainBal}, {user_wallet_id: getUserWallet.user_wallet_id});
                }
            }
        }
        return {status: true, code: responseData.code};
    } catch (error) {
        return {status: false, code: 'PAYMENT_ERROR'};
    }
}
const redeem = async (req, res) => {
    let responseData = {}
    try {
        let userId = req.user.user_id;
        let userD = await userService.getUserDetailsById({user_id: userId});
        let userWallet = await userService.getUserWalletDetailsById({user_id: userId});
        if (!userD) {
            responseData.msg = 'user not found';
            return responseHelper.error(res, responseData, 201);
        }
        let getBankDetails = await userService.getUserBankDetailsById({user_id: userId});
        if (!getBankDetails) {
            responseData.msg = 'Bank Details not found.Please add your bank details';
            return responseHelper.error(res, responseData, 201);
        }
        let accountId, redemAmount;
        let orderId = 'order_' + new Date().getTime();
        let tdsorderId = 'order_' + new Date().getTime();
        redemAmount = req.body.amount;
        console.log('redem Logs', redemAmount);

        if (userWallet && (parseInt(userWallet.win_amount) < parseInt(redemAmount))) {
            responseData.msg = 'Winning amount is low';
            return responseHelper.error(res, responseData, 201);
        }


        /*Verify Bank*/
        let bankDetails = {
            name: getBankDetails.account_holder_name,
            phone: await decryptData(userD.mobile),
            account_no: await decryptData(getBankDetails.account_no),
            ifsc_code: await decryptData(getBankDetails.ifsc_code),
        }
        let verifyBank = await bankDetailsVerify(bankDetails);
        console.log(verifyBank);
        if (verifyBank.status == 'ERROR') {
            responseData.msg = 'Invalid Bank Details.';
            return responseHelper.error(res, responseData, 201);
        }
        /*Verify Bank*/

        let getRedemptionSetting = await adminService.getRedemptionSetting();
        if (getRedemptionSetting && getRedemptionSetting.withdraw_type == '2') {
            let redemData = {
                user_id: userId,
                account_id: getBankDetails.user_account_id,
                redeem_amount: redemAmount,
                redemption_status: 'Pending',
                bank_reference_id: '',
                transaction_id: orderId
            }
            let save = await userService.redemptionSave(redemData);
            responseData.msg = 'Your request has been successfully proceed to admin.';
            return responseHelper.success(res, responseData);
        }

        /*TDS Calculation Start*/
        var todayDate = new Date();
        let fiscalyear;
        if ((todayDate.getMonth() + 1) <= 3) {
            fiscalyear = (todayDate.getFullYear() - 1) + "-04-01";
        } else {
            fiscalyear = todayDate.getFullYear() + "-04-01";
        }
        let getTdsSetting = await adminService.getTdsSetting();
        let fromDate = (userWallet.last_withdraw_date) ? userWallet.last_withdraw_date : fiscalyear;
        let toDate = moment(todayDate).format('YYYY-MM-DD');
        let totalDeposit = await sequelize.query(`Select SUM(amount) as totaldeposit
                                                  from transactions
                                                  where user_id = ${userId}
                                                    AND other_type = 'Deposit'
                                                    AND DATE (transactions.createdAt) BETWEEN '${fromDate}'
                                                    AND '${toDate}'`, {type: sequelize.QueryTypes.SELECT});
        console.log('totalDeposit', totalDeposit[0].totaldeposit);
        let totalWinningAmount = await sequelize.query(`Select SUM(win_amount) as totalwinning
                                                        from game_histories
                                                        where user_id = ${userId}
                                                          AND DATE (game_histories.createdAt) BETWEEN '${fromDate}'
                                                          AND '${toDate}'`, {type: sequelize.QueryTypes.SELECT});
        console.log('totalWinningAmount', totalWinningAmount[0].totalwinning);

        if ((+totalWinningAmount[0].totalwinning) > (+totalDeposit[0].totaldeposit)) {
            totalWinningAmount = (+totalWinningAmount[0].totalwinning) - (+totalDeposit[0].totaldeposit);
        }
        console.log(totalWinningAmount);
        let tdsAmount = 0.00;
        let isTds = false;
        if (getTdsSetting && ((+totalWinningAmount) >= (+getTdsSetting.tds_amount_limit))) {
            isTds = true;
            tdsAmount = parseFloat(totalWinningAmount * (getTdsSetting.tds_percentage / 100)).toFixed(2);
        }
        /*TDS Calculation End */
        console.log('win', userWallet.win_amount);
        let winAmountUpdate = (+userWallet.win_amount) - (+redemAmount);
        console.log(winAmountUpdate);
        if (parseFloat(redemAmount) > parseFloat(tdsAmount)) {
            redemAmount = redemAmount - parseFloat(tdsAmount);
        }
        //redemAmount = redemAmount - parseFloat(tdsAmount);
        console.log('redem', redemAmount);

        //Bank Transfer Cashfree
        let transferD = {
            beneId: getBankDetails.beneficiary_id,
            amount: redemAmount + '.00',
            transferId: orderId
        }

        let withdrawStatus = await bankWithdraw(transferD);
        if (withdrawStatus.status == 'ERROR') {
            responseData.msg = 'Something Went wrong. Please try again later';
            return responseHelper.error(res, responseData, 201);
        }
        //return false;
        let openingBalnace = userWallet.real_amount;

        console.log('winAmountUpdate', winAmountUpdate);
        let walletData = {
            win_amount: winAmountUpdate,
            last_withdraw_date: toDate
        }
        let savewalet = await userService.updateUserWallet(walletData, {user_wallet_id: userWallet.user_wallet_id});

        let dataTransactions = {
            user_id: userId,
            order_id: orderId,
            closing_balance: openingBalnace,
            opening_balance: openingBalnace,
            type: 'DR',
            other_type: 'Withdraw',
            amount: redemAmount,
            transaction_status: 'SUCCESS'
        }

        let dataTdsTransactions = {
            user_id: userId,
            order_id: tdsorderId,
            closing_balance: openingBalnace,
            opening_balance: openingBalnace,
            type: 'DR',
            other_type: 'TDS',
            amount: tdsAmount
        }
        let redemData = {
            user_id: userId,
            account_id: getBankDetails.user_account_id,
            redeem_amount: redemAmount,
            redemption_status: 'Withdraw',
            bank_reference_id: withdrawStatus.data.referenceId,
            transaction_id: orderId
        }
        let userLog = {
            user_id: userId,
            device_token: userD.device_token,
            activity_type: 'redeem',
            old_value: '',
            new_value: JSON.stringify(redemData)
        }

        let save = await userService.redemptionSave(redemData);
        let updateLog = await userService.addUserLog(userLog);
        let saveTransactions = await userService.createTransaction(dataTransactions);
        if (isTds == true) {
            let saveTdsTransactions = await userService.createTransaction(dataTdsTransactions);
        }

        responseData.msg = 'Your request has been successfully done';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const withdrawAmount = async (req, res) => {
    let responseData = {}
    try {
        let userId = req.user.user_id;
        let address = req.body.address;
        let account_number = req.body.account_number;
        let ifsc_code = req.body.ifsc_code;
        let userD = await userService.getUserDetailsById({user_id: userId});
        let userWallet = await userService.getUserWalletDetailsById({user_id: userId});
        if (!userD) {
            responseData.msg = 'user not found';
            return responseHelper.error(res, responseData, 201);
        }
        let  redemAmount;
        let orderId = 'order_' + new Date().getTime();
        let tdsorderId = 'order_' + new Date().getTime();
        redemAmount = req.body.amount;
        console.log('redem Logs', redemAmount);

        if (userWallet && (parseInt(userWallet.real_amount) < parseInt(redemAmount))) {
            responseData.msg = 'Deposit amount is low';
            return responseHelper.error(res, responseData, 201);
        }


        let redemData = {
            user_id: userId,
            redeem_amount: redemAmount,
            redemption_status: 'Pending',
            transaction_id: orderId,
            account_number: account_number,
            ifsc_code: ifsc_code,
        }
        let mobile = await decryptData(userD.mobile);
        let reqData = {
            reference: orderId,
            email: (userD.email) ? await decryptData(userD.email) : 'dinesh@7unique.in',
            name: userD.name,
            amount: redemAmount,
            mobile: mobile,
            address: address,
            account_number:account_number,
            ifsc_code:ifsc_code
        }
        let response = await payOut(reqData);
        if(response.status=='Success'){
            let dataTransaction = {
                order_id: orderId,
                user_id: userId,
                type: 'DR',
                other_type: 'Withdraw',
                amount: redemAmount,
                transaction_status: 'Pending',
                reference: 'Withdraw'
            }
            await userService.createTransaction(dataTransaction);
            await userService.redemptionSave(redemData);
            responseData.msg = 'Your request has been successfully done';
            return responseHelper.success(res, responseData);
        }else{
            responseData.msg = response.data.message;
            return responseHelper.error(res, responseData, 201);
        }
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const tds = async () => {
    let responseData = {}
    try {
        console.log(req);
        let reqObj = req.body;
        let userId = req.user.user_id;
        let query = {
            user_id: userId
        }
        let userD = await userService.getUserDetailsById(query);
        if (!userD) {
            responseData.msg = 'user not found';
            return responseHelper.error(res, responseData, 201);
        }


        let tdsAmount = reqObj.tds_amount;
        let financialDate = reqObj.financial_date;
        console.log(req.file.filename)
        let tdsData = {
            user_id: userId,
            tds_amount: tdsAmount,
            tds_file: req.file.filename,
            financial_date: financialDate
        }

        let userLog = {
            user_id: userId,
            device_token: userD.device_token,
            activity_type: 'tds',
            old_value: '',
            new_value: JSON.stringify(tdsData)
        }
        let save = await userService.createTds(tdsData);
        let updateLog = await userService.addUserLog(userLog);
        responseData.msg = 'Tds Done';
        return responseHelper.success(res, responseData);

    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const getNotification = async (req, res) => {
    let responseData = {};
    try {
        let user = req.user;
        let id = user.user_id;
        let query = {receiver_user_id: id}
        let getNotification = await userService.getUserNotifications(query);
        if (getNotification.length == 0) {
            responseData.msg = 'No Notification Found';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'Notification Fetch successfully!!!';
        responseData.data = getNotification;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const getGameHistory = async (req, res) => {
    let responseData = {};
    try {
        let userId = req.user.user_id;
        console.log(userId);
        let getData = await userService.getGameHistory({user_id: userId});
        if (getData.length == 0) {
            responseData.msg = 'Game history not found';
            return responseHelper.success(res, responseData, 201);
        }
        responseData.msg = 'Game History Data';
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const getTransactions = async (req, res) => {
    let responseData = {};
    try {
        let userId = req.user.user_id;
        let getData = await userService.getTransactionData({user_id: userId});
        if (getData.length == 0) {
            responseData.msg = 'Transaction Data not found';
            return responseHelper.success(res, responseData, 201);
        }
        responseData.msg = 'Transaction Data';
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const getBankAccounts = async (req, res) => {
    let responseData = {};
    try {
        let userId = req.user.user_id;
        let getData = await userService.getBankList({user_id: userId});
        if (getData.length == 0) {
            responseData.msg = 'Bank Data not found';
            return responseHelper.success(res, responseData, 201);
        }
        getData = getData.map(async (element, i) => {
            element.ifsc_code = await decryptData(element.ifsc_code);
            element.account_no = await decryptData(element.account_no);
            element.upi_no = (element.upi_no) ? await decryptData(element.upi_no) : '';
            return element;
        });
        getData = await Promise.all(getData);
        responseData.msg = 'Bank Data';
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const getRedeemList = async (req, res) => {
    let responseData = {};
    try {
        let userId = req.user.user_id;
        let getData = await userService.getRedeemList({user_id: userId});
        if (getData.length == 0) {
            responseData.msg = 'Redeem Data not found';
            return responseHelper.success(res, responseData, 201);
        }
        responseData.msg = 'Redeem Data';
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const getWallet = async (req, res) => {
    let responseData = {};
    try {
        let id = req.user.user_id;
        let getUserD = await userService.getUserDetailsById({user_id: id});
        let getWallet = await userService.getUserWalletDetailsById({user_id: id});
        let realAmount = '0.00', practiceAmount = '0.00', bonusAmount = '0.00', winAmount = '0.00', coins = 0;
        if (getWallet) {
            realAmount = (getWallet.real_amount) ? getWallet.real_amount : '0.00';
            practiceAmount = (getWallet.practice_amount) ? getWallet.practice_amount : '0.00';
            bonusAmount = (getWallet.bonus_amount) ? getWallet.bonus_amount : '0.00';
            winAmount = (getWallet.win_amount) ? getWallet.win_amount : '0.00';
            coins = (getWallet.coins) ? getWallet.coins : 0;
        }
        let today = new Date().toISOString().split('T')[0];
        let isClaim = 0;
        if (getWallet && (moment(getWallet.last_claim_date).format('YYYY-MM-DD') == today)) {
            isClaim = 1;
        }
        responseData.msg = 'Wallet Data!!!';
        responseData.data = {
            real_amount: realAmount,
            practice_amount: practiceAmount,
            bonus_amount: bonusAmount,
            win_amount: winAmount,
            coins: coins,
            is_kyc: (getUserD) ? getUserD.is_kyc_done : false,
            is_claim: isClaim
        };
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const addAddress = async (req, res) => {
    let responseData = {};
    try {
        let userId = req.user.user_id;
        let address = req.body.address;
        let city = req.body.city;
        let pincode = req.body.pincode;
        let state = req.body.state;
        let country = req.body.country;
        let addressObj = {
            user_id: userId,
            address: address,
            city: city,
            pincode: pincode,
            state: state,
            country: country
        }
        await userService.addAddress(addressObj);
        responseData.msg = 'Address save successfully';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const getAddressById = async (req, res) => {
    let responseData = {};
    try {
        let id = req.params.id;
        let getAddressList = await userService.getAddressById({user_address_id: id});
        if (getAddressList.length == 0) {
            responseData.msg = 'Address not found';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'Address data';
        responseData.data = getAddressList;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const updateAddress = async (req, res) => {
    let responseData = {};
    try {
        let id = req.body.id;
        let address = req.body.address;
        let city = req.body.city;
        let pincode = req.body.pincode;
        let state = req.body.state;
        let country = req.body.country;
        let addressObj = {
            address: address,
            city: city,
            pincode: pincode,
            state: state,
            country: country
        }
        await userService.updateAddress(addressObj, {user_address_id: id});
        responseData.msg = 'Address updated successfully';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const lockBalanceOfUser = async (lockBalanceReq) => {
    try {
        let userId = lockBalanceReq.user_id;
        let amount = parseFloat(lockBalanceReq.amount);
        let tableId = lockBalanceReq.tableId;
        let gameType = lockBalanceReq.gameType;
        if (!gameType) {
            gameType = "TEXAS";
        }
        let lockedBalanceHistory = await userService.getOneLockedBalanceHistory({
            user_id: userId
            , table_id: tableId,
            status: "unsettled"
        });
        console.log(lockedBalanceHistory);
        if (lockedBalanceHistory) { // added condition for avoiding issue of balance lock unlock 
            await unlockBalanceOfUser(
                {
                    user_id:userId,
                    amount:lockedBalanceHistory.locked_amount,
                    tableId :tableId,
                    gameType :gameType,
               }
            )
            //throw new Error("User already has unsettled locked balance for this table");
        }
        // Unlock already locked amount for similar tables which are setteled 
      //  await unlockAlreadylockedbalance(userId, tableId);
        let userWallet = await userService.getUserWalletDetailsByQuery({user_id: userId});
        if (!userWallet) {
            throw Error("Wallet does not exist");
        }
        let balance;
        if (gameType.startsWith("PRACTICE")) {
            balance = parseFloat(userWallet.practice_amount);
        } else {
            balance = parseFloat(userWallet.real_amount) + parseFloat(userWallet.bonus_amount)
                + parseFloat(userWallet.win_amount);
        }
        if (amount > balance) {
            throw Error("Locked amount is greater than balance 1");
        }
        let lockBalance;
        if (userWallet.locked_amount) {
            lockBalance = parseFloat(userWallet.locked_amount);
        } else {
            lockBalance = 0;
        }
        let transaction = {
            user_id: userId,
            table_id: tableId,
            type: "DR",
            amount: amount,
            opening_balance: balance,
            closing_balance: balance - amount,
        }
        let newBalance = balance - amount;
        let newLockBalance = lockBalance + amount;
        if (gameType.startsWith("PRACTICE")) {
            await userService.updateUserWallet({practice_amount: newBalance, locked_amount: newLockBalance}
                , {user_wallet_id: userWallet.user_wallet_id});
        } else {
            let getBonus = await userService.getBonusSetting();
            let bonusAmt = 0;
            let betAmount = amount;
            if (getBonus && getBonus.data) {
                bonusAmt = userWallet.bonus_amount * getBonus.data / 100
                betAmount = parseFloat("" + amount) - parseFloat("" + bonusAmt);
            }
            let deductBonusAmount = parseFloat(userWallet.bonus_amount) - parseFloat(bonusAmt);
            let deductAmount = parseFloat(userWallet.real_amount) - parseFloat(betAmount);
            let deductWinAmount = parseFloat(userWallet.win_amount);
            if (deductAmount < 0) {
                deductAmount = deductAmount * -1
                deductWinAmount = parseFloat(userWallet.win_amount) - parseFloat(deductAmount);
                deductAmount = 0;
            }
            await userService.updateUserWallet({
                real_amount: deductAmount,
                bonus_amount: deductBonusAmount,
                win_amount: deductWinAmount,
                locked_amount: newLockBalance
            }, {user_wallet_id: userWallet.user_wallet_id});
        }
        let pokerTable = await pokerService.getOneGameTableModalDataByQuery({
            game_table_id: tableId
        });
        lockedBalanceHistory = {
            user_id: userId,
            table_id: tableId,
            locked_amount: amount,
            buy_in_amount: parseFloat("" + amount),
            status: "unsettled",
            round_count: 0,
            game_id: pokerTable.game_id,
            is_buyIn_unlocked: false
        }
        await userService.createLockedBalanceHistory(lockedBalanceHistory);
        await userService.createTransaction(transaction);
        return {
            status: true,
            message: "Balance locked successfully",
        }
    } catch (error) {
        console.log("Error in lock balance of user ", error);
        return {
            status: false,
            message: error.message
        }
    }
}
const deductJoinFees = async (deductBalanceReq) => {
    try {
        let userId = deductBalanceReq.user_id;
        let amount = parseFloat(deductBalanceReq.lockAmount+"");
        let deductBalance = parseFloat(deductBalanceReq.deductBalance+"");
        let tableId = deductBalanceReq.tableId;
        let userWallet = await userService.getUserWalletDetailsByQuery({user_id: userId});
        let userWalletAdmin = await userService.getUserWalletDetailsByQuery({user_id: 1});
        if (!userWallet || !userWalletAdmin) {
            throw Error("Wallet does not exist");
        }
        let balance = parseFloat(userWallet.real_amount+"") + parseFloat(userWallet.bonus_amount+"")
            + parseFloat(userWallet.win_amount+"");
        let balanceAdmin = parseFloat(userWalletAdmin.real_amount+"") + parseFloat(userWalletAdmin.bonus_amount+"")
            + parseFloat(userWalletAdmin.win_amount+"");
        if (deductBalance > balance) {
            throw Error("Locked amount is greater than balance ",deductBalance);
        }
        let transaction = {
            user_id: userId,
            table_id: tableId,
            type: "DR",
            other_type: 'Bet Amount',
            category: 'Poker',
            amount: deductBalance,
            opening_balance: balance,
            closing_balance: balance - deductBalance,
        }
        let transactionAdmin = {
            user_id: 1,
            table_id: tableId,
            type: "CR",
            amount: deductBalance,
            opening_balance: balanceAdmin,
            closing_balance: balanceAdmin + deductBalance,
        }
        let getBonus = await userService.getBonusSetting();
        let bonusAmt = 0;
        let betAmount = deductBalance;
        if (getBonus && getBonus.data) {
            bonusAmt = userWallet.bonus_amount * getBonus.data / 100
            betAmount = parseFloat("" + deductBalance) - parseFloat("" + bonusAmt);
        }
        let deductBonusAmount = parseFloat(userWallet.bonus_amount+"") - parseFloat(bonusAmt+"");
        let deductAmount = parseFloat(userWallet.real_amount+"") - parseFloat(betAmount+"");
        let deductWinAmount = parseFloat(userWallet.win_amount+"");
        if (deductAmount < 0) {
            deductAmount = deductAmount * -1
            deductWinAmount = parseFloat(userWallet.win_amount+"") - parseFloat(deductAmount+"");
            deductAmount = 0;
        }
        if (amount) {
            let lockedBalanceHistory = await userService.getOneLockedBalanceHistory({
                user_id: userId
                , table_id: tableId,
                status: "unsettled"
            });
            if (lockedBalanceHistory) {
                throw new Error("User already has unsettled locked balance for this table");
            }
            let pokerTable = await pokerService.getOneGameTableModalDataByQuery({
                game_table_id: tableId
            });
            lockedBalanceHistory = {
                user_id: userId,
                table_id: tableId,
                locked_amount: amount,
                buy_in_amount: parseFloat("" + amount),
                status: "unsettled",
                round_count: 0,
                game_id: pokerTable.game_id,
                is_buyIn_unlocked: true
            }
            await userService.createLockedBalanceHistory(lockedBalanceHistory);
        }
        await userService.updateUserWallet({
            real_amount: deductAmount,
            bonus_amount: deductBonusAmount,
            win_amount: deductWinAmount,
        }, {user_wallet_id: userWallet.user_wallet_id});
        await userService.updateUserWallet({
                real_amount: (parseFloat(userWalletAdmin.real_amount+"")
                    + deductBalance)
            },
            {user_wallet_id: userWalletAdmin.user_wallet_id});
        await userService.createTransaction(transaction);
        await userService.createTransaction(transactionAdmin);
        return {
            status: true,
            message: "Balance locked successfully",
        }
    } catch (error) {
        console.log("Error in lock balance of user ", error);
        return {
            status: false,
            message: error.message
        }
    }
}
const returnDeductedBalance = async (deductBalanceReq) => {
    try {
        let userId = deductBalanceReq.user_id;
        let amount = parseFloat(deductBalanceReq.lockAmount);
        let deductBalance = parseFloat(deductBalanceReq.deductBalance);
        let tableId = deductBalanceReq.tableId;
        let userWallet = await userService.getUserWalletDetailsByQuery({user_id: userId});
        let userWalletAdmin = await userService.getUserWalletDetailsByQuery({user_id: 1});
        if (!userWallet || !userWalletAdmin) {
            throw Error("Wallet does not exist");
        }
        let balance = parseFloat(userWallet.real_amount) + parseFloat(userWallet.bonus_amount)
            + parseFloat(userWallet.win_amount);
        let balanceAdmin = parseFloat(userWalletAdmin.real_amount) + parseFloat(userWalletAdmin.bonus_amount)
            + parseFloat(userWalletAdmin.win_amount);
        userWallet.real_amount = parseFloat(userWallet.real_amount) + parseFloat(deductBalance);
        userWalletAdmin.real_amount = parseFloat(userWalletAdmin.real_amount) - parseFloat(deductBalance);
        let transaction = {
            user_id: userId,
            table_id: tableId,
            type: "CR",
            other_type: 'Bet Amount',
            category: 'Poker',
            amount: deductBalance,
            opening_balance: balance,
            closing_balance: balance + deductBalance,
        }
        let transactionAdmin = {
            user_id: 1,
            table_id: tableId,
            type: "DR",
            amount: deductBalance,
            opening_balance: balanceAdmin,
            closing_balance: balanceAdmin - deductBalance,
        }
        await userService.updateUserWallet({
            real_amount: userWallet.real_amount,
        }, {user_wallet_id: userWallet.user_wallet_id});
        await userService.updateUserWallet({
                real_amount: userWalletAdmin.real_amount
            },
            {user_wallet_id: userWalletAdmin.user_wallet_id});
        await userService.createTransaction(transaction);
        await userService.createTransaction(transactionAdmin);
        return {
            status: true,
            message: "Balance locked successfully",
        }
    } catch (error) {
        console.log("Error in return deducted balance ", error);
        return {
            status: false,
            message: error.message
        }
    }
}
const updateLockBalanceOfUserForTable = async (lockBalanceReq) => {
    try {
        let userId = lockBalanceReq.user_id;
        let amount = parseFloat(lockBalanceReq.amount+"");
        let tableId = lockBalanceReq.tableId;
        let lockedBalanceHistory = await userService.getOneLockedBalanceHistory({
            user_id: userId
            , table_id: tableId,
            status: "unsettled"
        });
        if (!lockedBalanceHistory) {
            throw new Error("User does not have unsettled locked balance for this table");
        }
        let userWallet = await userService.getUserWalletDetailsByQuery({user_id: userId});
        if (!userWallet) {
            throw Error("Wallet does not exist");
        }
        let lockBalance = parseFloat(userWallet.locked_amount+"");
        let lockBalanceForThisTable = parseFloat(lockedBalanceHistory.locked_amount+"");
        if (!lockedBalanceHistory.round_count) {
            lockedBalanceHistory.round_count = 0;
        }
        let round_count = parseInt(lockedBalanceHistory.round_count);
        round_count++;
        let lockedBalanceForOtherTable = lockBalance - lockBalanceForThisTable;
        userWallet.locked_amount = lockedBalanceForOtherTable + amount;
        await userService.updateUserWallet({
                locked_amount: userWallet.locked_amount
            },
            {user_wallet_id: userWallet.user_wallet_id});
        await userService.updateLockedBalanceHistory({
                locked_amount: amount,
                round_count: round_count
            },
            {locked_balance_history_id: lockedBalanceHistory.locked_balance_history_id});
        return {
            status: true,
            message: "Balance locked successfully",
        }
    } catch (error) {
        console.log("Error in update lock balance of user ", error);
        return {
            status: false,
            message: error.message
        }
    }
}
const topUpBalanceOfUser = async (topUpBalanceRequest) => {
    try {
        let userId = topUpBalanceRequest.user_id;
        let prevAmount = parseFloat(topUpBalanceRequest.prev_amount);
        let tableId = topUpBalanceRequest.tableId;
        let topUpAmount = parseFloat(topUpBalanceRequest.top_up_amount);
        let gameType = topUpBalanceRequest.gameType;
        if (!gameType) {
            gameType = "TEXAS";
        }
        let lockedBalanceHistory = await userService.getOneLockedBalanceHistory({
            user_id: userId
            , table_id: tableId,
            status: "unsettled"
        });
        if (!lockedBalanceHistory) {
            throw new Error("User does not have unsettled locked balance for this table");
        }
        let userWallet = await userService.getUserWalletDetailsByQuery({user_id: userId});
        if (!userWallet) {
            throw Error("Wallet does not exist");
        }
        let balance;
        if (gameType.startsWith("PRACTICE")) {
            balance = parseFloat(userWallet.practice_amount);
        } else {
            balance = parseFloat(userWallet.real_amount) + parseFloat(userWallet.bonus_amount)
                + parseFloat(userWallet.win_amount);
        }
        if (balance < topUpAmount) {
            throw Error("Insufficient balance");
        }
        let lockBalance = parseFloat(userWallet.locked_amount);
        let lockBalanceForThisTable = parseFloat(lockedBalanceHistory.locked_amount);
        let lockedBalanceForOtherTable = lockBalance - lockBalanceForThisTable;
        userWallet.locked_amount = lockedBalanceForOtherTable + prevAmount + topUpAmount;
        let prevBalance = balance;
        balance = balance - topUpAmount;

        if (gameType.startsWith("PRACTICE")) {
            await userService.updateUserWallet({
                practice_amount: balance,
                locked_amount: userWallet.locked_amount
            }, {user_wallet_id: userWallet.user_wallet_id});
        } else {
            let getBonus = await userService.getBonusSetting();
            let bonusAmt = 0;
            let betAmount = topUpAmount;
            if (getBonus && getBonus.data) {
                bonusAmt = userWallet.bonus_amount * getBonus.data / 100
                betAmount = parseFloat("" + topUpAmount) - parseFloat("" + bonusAmt);
            }
            let deductBonusAmount = parseFloat(userWallet.bonus_amount) - parseFloat(bonusAmt);
            let deductAmount = parseFloat(userWallet.real_amount) - parseFloat(betAmount);
            let deductWinAmount = parseFloat(userWallet.win_amount);
            if (deductAmount < 0) {
                deductAmount = deductAmount * -1
                deductWinAmount = parseFloat(userWallet.win_amount) - parseFloat(deductAmount);
                deductAmount = 0;
            }
            await userService.updateUserWallet({
                real_amount: deductAmount,
                bonus_amount: deductBonusAmount,
                win_amount: deductWinAmount,
                locked_amount: userWallet.locked_amount
            }, {user_wallet_id: userWallet.user_wallet_id});
        }
        await userService.updateLockedBalanceHistory({
                locked_amount: prevAmount + topUpAmount,
                buy_in_amount: parseFloat(lockedBalanceHistory.buy_in_amount) + topUpAmount,
            },
            {locked_balance_history_id: lockedBalanceHistory.locked_balance_history_id});
        let transaction = {
            user_id: userId,
            table_id: tableId,
            type: "DR",
            other_type: 'Bet Amount',
            category: 'Poker',
            amount: topUpAmount,
            opening_balance: prevBalance,
            closing_balance: balance,
        }
        await userService.createTransaction(transaction);

        // updating table attributes as well in table_round
        let tableRoundData = await pokerService.getTableRoundByQuery({
            game_table_id: tableId
        });
        let tableAttributes = tableRoundData.table_attributes;
        let tableAttributesObj = JSON.parse(tableAttributes);
        // if (tableAttributesObj.players.find(player => player.userId === userId)) {
        //     player.stack += topUpAmount;
        // }
        for (let i = 0; i < tableAttributesObj.players.length; i++) {
            if (tableAttributesObj.players[i].userId == userId)
                tableAttributesObj.players[i].stack += topUpAmount;
        }
        tableRoundData.table_attributes = JSON.stringify(tableAttributesObj);
        await pokerService.updateTableRoundModalDataByQuery({
            table_attributes: tableRoundData.table_attributes,
        }, {
            table_round_id: tableRoundData.table_round_id
        });
        return {
            status: true,
            message: "Top up balance successfully",
        }
    } catch (error) {
        console.log("error in topUpBalanceOfUser controller ", error);
        return {
            status: false,
            message: error.message
        }
    }
}
// we need to unlock balance only when user not won game or it's practice game 
const unlockBalanceOfUser = async (unlockBalanceReq) => {
    try {
        let userId = unlockBalanceReq.user_id;
        let amount = parseFloat(unlockBalanceReq.amount+"");
        let tableId = unlockBalanceReq.tableId;
        let gameType = unlockBalanceReq.gameType;
        if (!gameType) {
            gameType = "TEXAS";
        }
        let lockedBalanceHistory = await userService.getOneLockedBalanceHistory({
            user_id: userId,
            table_id: tableId,
            status: "unsettled"
        });
        console.log("lockedBalanceHistory from unlockBalanceOfUser-->",lockedBalanceHistory);
        if (!lockedBalanceHistory) {
            throw new Error("No unsettled locked balance found for this table");
        }
        let lockedAmount = parseFloat(lockedBalanceHistory.locked_amount+"");
        let userWallet = await userService.getUserWalletDetailsByQuery({user_id: userId});
        if (!userWallet) {
            throw Error("Wallet does not exist");
        }
        let lockBalance = parseFloat(userWallet.locked_amount+"");
        if (lockedAmount > lockBalance) {
            throw Error("Locked amount is greater than balance 3");
        }
        let balance;
        if (gameType.startsWith("PRACTICE")) {
            balance = parseFloat(userWallet.practice_amount+"");
        } else {
            balance = parseFloat(userWallet.real_amount+"") + parseFloat(userWallet.bonus_amount+"")
                + parseFloat(userWallet.win_amount+"");
        }
        let newBalance = balance + amount;
        let newLockBalance = lockBalance - lockedAmount;
        if(newLockBalance <0) newLockBalance =0;
        let transaction = {
            user_id: userId,
            table_id: tableId,
            type: "CR",
            other_type: 'Winning',
            category: 'Poker',
            amount: amount,
            opening_balance: balance,
            closing_balance: newBalance,
        }
        let profitLoss = amount - parseFloat(lockedBalanceHistory.buy_in_amount+"");
        console.log("==========profitLoss is ============", profitLoss);
        let is_balance_unlocked = false;
        if (profitLoss > 0 && !gameType.startsWith("PRACTICE")) {
            let game_table = await pokerService.getOneGameTableModalDataByQuery({game_table_id: tableId});
            let game = await pokerService.getGameModalDataByQuery({game_id: game_table.game_id});
            let pokerWinInSession = {
                game_table_id: tableId,
                user_id: userId,
                winning: profitLoss,
                game_type_id: parseInt(game.game_type_id),
                rounds_played: lockedBalanceHistory.round_count,
            };
            await userService.createPokerSessionWin(pokerWinInSession);
        }
        if (gameType.startsWith("PRACTICE")) {
            await userService.updateUserWallet({
                    practice_amount: newBalance,
                    locked_amount: newLockBalance
                }
                , {user_wallet_id: userWallet.user_wallet_id});
        } else {
            // if (profitLoss > 0) {
            //     let oldWinAmount = userWallet.win_amount;
            //     console.log("------------------------------------------------------------------------Old Win Amount from " +
            //         "DB ", oldWinAmount, " Profit Loss ", profitLoss, " User Wallet ", userWallet);
            //     if (!oldWinAmount) {
            //         oldWinAmount = 0;
            //     }
            //     oldWinAmount = parseFloat("" + oldWinAmount);
            //     console.log("------------------------------------------------------------------------Old Win Amount " +
            //         "after parse", oldWinAmount);
            //     await userService.updateUserWallet({
            //             win_amount: (oldWinAmount + parseFloat("" + profitLoss)),
            //             real_amount: (parseFloat(userWallet.real_amount)
            //                 + parseFloat(lockedBalanceHistory.buy_in_amount)),
            //             locked_amount: newLockBalance
            //         }
            //         , {user_wallet_id: userWallet.user_wallet_id});
            // } 
            // adding condition to unlock amount of previous games which are already locked 
            // if(!(await islockAlreadylockedbalanceExist(userId, tableId))) {
            //     console.log("=======inside islockAlreadylockedbalanceExist =========");
            //     if(profitLoss<=0)  is_balance_unlocked = true;
            // }
        //  else if((await CanunlockAlreadylockedbalance(userId,tableId,amount))) {
        //     console.log("=======inside CanunlockAlreadylockedbalance =========");
        //     await unlockAlreadylockedbalance(userId, tableId);
        //     is_balance_unlocked = true;
        //   }
        is_balance_unlocked = true;
         // console.log("===== is_balance_unlocked is =========", is_balance_unlocked);
            if (is_balance_unlocked) {
                await userService.updateUserWallet({
                        real_amount: (parseFloat(userWallet.real_amount+"") + parseFloat("" + amount)),
                        locked_amount: newLockBalance
                    }
                    , {user_wallet_id: userWallet.user_wallet_id});
            }
        }
        // commented because 
        if ( gameType.startsWith("PRACTICE")) is_balance_unlocked = true; // marking unloacked only if player looses
        let resp =   await userService.updateLockedBalanceHistory({
                status: "settled",
                locked_amount: amount,
                is_buyIn_unlocked: is_balance_unlocked
            } // added locked_amount: amount by my own
            , {locked_balance_history_id: lockedBalanceHistory.locked_balance_history_id});
console.log("resp of setteld balance is =======================", resp);
        await userService.createTransaction(transaction);
        return {
            status: true,
            message: "Balance unlocked successfully",
        }
    } catch (error) {
        console.log("Error in unlock balance of user ", error);
        return {
            status: false,
            message: error.message
        }
    }
}

const addPrizeMoney = async (addPrizeMoneyReq) => {
    try {
        let userId = addPrizeMoneyReq.user_id;
        let amount = parseFloat(addPrizeMoneyReq.prizeMoney);
        let tableId = addPrizeMoneyReq.tableId;
        let lockedBalanceHistory = await userService.getOneLockedBalanceHistory({
            user_id: userId,
            table_id: tableId,
            status: "unsettled"
        });
        if (!lockedBalanceHistory) {
            return {
                status: false,
                message: "Not found any balance locked history ",
            }
        }
        let userWallet = await userService.getUserWalletDetailsByQuery({user_id: userId});
        if (!userWallet) {
            throw Error("Wallet does not exist");
        }
        let balance = parseFloat(userWallet.real_amount) + parseFloat(userWallet.bonus_amount)
            + parseFloat(userWallet.win_amount);
        let newBalance = balance + amount;
        let transaction = {
            user_id: userId,
            table_id: tableId,
            type: "CR",
            other_type: 'Winning',
            category: 'Poker',
            amount: amount,
            opening_balance: balance,
            closing_balance: newBalance,
        }
        let profitLoss = amount;
        if (profitLoss > 0) {
            let game_table = await pokerService.getOneGameTableModalDataByQuery({game_table_id: tableId});
            let game = await pokerService.getGameModalDataByQuery({game_id: game_table.game_id});
            let pokerWinInSession = {
                game_table_id: tableId,
                user_id: userId,
                winning: profitLoss,
                game_type_id: parseInt(game.game_type_id),
                rounds_played: lockedBalanceHistory.round_count,
            };
            if (game.is_single_table && !game.is_game_finished) {
                game.is_game_finished = true;
                await pokerService.updateGameByQuery({
                    is_game_finished: game.is_game_finished
                }, {
                    game_id: game.game_id
                });
            }
            await userService.createPokerSessionWin(pokerWinInSession);
        }
        if (amount > 0) {
            let oldWinAmount = userWallet.win_amount;
            if (!oldWinAmount) {
                oldWinAmount = 0;
            }
            oldWinAmount = parseFloat("" + oldWinAmount);
            await userService.updateUserWallet({
                    win_amount: (oldWinAmount + parseFloat("" + amount)),
                    locked_amount: parseFloat(userWallet.locked_amount)
                        - (parseFloat(lockedBalanceHistory.locked_amount))
                }
                , {user_wallet_id: userWallet.user_wallet_id});
            await userService.createTransaction(transaction);
        }
        await userService.updateLockedBalanceHistory({status: "settled", is_buyIn_unlocked: true}
            , {locked_balance_history_id: lockedBalanceHistory.locked_balance_history_id});
        return {
            status: true,
            message: "Balance unlocked successfully",
        }
    } catch (error) {
        console.log("Error in unlock balance of user ", error);
        return {
            status: false,
            message: error.message
        }
    }
}
const userDetails = async (UserDetailsReq) => {
    try {
        let userId = UserDetailsReq.user_id;
        let details = await userService.getUserDetails(userId);
        return {details};
    } catch (error) {
        console.log('error occured ', error);
        return {
            details: [{
                status: false,
                message: error.message
            }]
        }
    }
}
const getUserNameByUserId = async (userIdRequest) => {
    let user_id = userIdRequest.user_id;
    let user = await userService.getUserDetailsById({user_id: user_id});
    if (user) {
        return {
            username: user.username
        }
    }
    return {
        username: ""
    }
}
const userReferral = async (req, res) => {
    let responseData = {};
    try {
        let userId = req.user.user_id;
        let referCode = req.body.refer_code;
        /**********Bonus Code Start *********/
        let userData = await userService.getUserDetailsById({user_id: userId});
        const getBonus = await userService.getBonusSetting();
        let userBonus = 0, referUserBonus = 0;
        if (getBonus) {
            userBonus = getBonus.referral_bonus;
            referUserBonus = getBonus.referral_bonus;
        }
        const userDetail = await userService.getUserDetailsById({referral_code: referCode});
        if (!userDetail) {
            responseData.msg = "User not found with this Refer code";
            return responseHelper.error(res, responseData, 201);
        }
        if (userDetail) {
            const checkReferral = await userService.checkUserReferalData({
                user_id: userData.user_id,
                referral_user_id: userDetail.user_id
            });
            if (!checkReferral) {
                const info = {
                    user_id: userData.user_id,
                    referral_user_id: userDetail.user_id,
                    user_bonus: userBonus,
                    referral_user_bonus: referUserBonus,
                };
                await userService.createReferralData(info);


                const getUserWallet = await userService.getUserWalletDetailsById({user_id: userData.user_id})

                if (!getUserWallet) {
                    const walletInfo = {
                        user_id: userData.user_id,
                        bonus_amount: userBonus
                    }
                    await userService.createUserWallet(walletInfo);
                } else {
                    const bonus = +(getUserWallet.bonus_amount) + userBonus;
                    await userService.updateUserWallet({bonus_amount: bonus}, {user_id: userData.user_id});
                }
                const transactionInfo = {
                    order_id: Math.floor(Math.random() * 1000000000),
                    amount: userBonus,
                    other_type: 'Bonus',
                    reference: 'Signup',
                    user_id: userData.user_id,
                    type: "CR",
                };

                await userService.createTransaction(transactionInfo);


                /***Referral User Bonus ***/
                const getReferralUserWallet = await userService.getUserWalletDetailsById({user_id: userDetail.user_id})

                if (!getReferralUserWallet) {
                    const walletInfos = {
                        user_id: userDetail.user_id,
                        bonus_amount: referUserBonus
                    }
                    await userService.createUserWallet(walletInfos);
                } else {
                    const bonus = +(getReferralUserWallet.bonus_amount) + referUserBonus;
                    await userService.updateUserWallet({bonus_amount: bonus}, {user_id: userDetail.user_id});
                }
                const transactionInfos = {
                    order_id: Math.floor(Math.random() * 1000000000),
                    amount: referUserBonus,
                    other_type: 'Bonus',
                    reference: 'Referral',
                    user_id: userDetail.user_id,
                    type: "CR",
                };

                await userService.createTransaction(transactionInfos);
            }
        }

        responseData.msg = 'Referral Done';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }


    /***User Bonus ***/


    /**********Bonus Code End *********/
}
const emailVerificationLinkSent = async (req, res) => {
    let responseData = {}
    try {
        console.log(req);
        let email = req.params.email;
        let userId = req.user.user_id;
        let query = {
            user_id: userId,
            email: await encryptData(email)
        }
        let userD = await userService.getUserDetailsById(query);
        if (!userD) {
            responseData.msg = 'user not found';
            return responseHelper.error(res, responseData, 201);
        }

        let emailToken = Math.random().toString(36).slice(2);
        await userService.updateUserByQuery({email_verify_token: emailToken}, {user_id: userId});
        let url = config.APPURL + 'api/v1/auth/email-verify?token=' + emailToken;

        const body = "Please verify email click on verify: <a href='" + url + "' target='_blank'>Verify Email</a>";

        await sendEmail(email, "OHO Email Verification", body);
        responseData.msg = 'Verification Link Sent';
        responseData.data = url;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const emailVerify = async (token) => {
    let responseData = {}
    try {
        let query = {
            email_verify_token: token
        }
        let userD = await userService.getUserDetailsById(query);
        if (!userD) {
            return false;
        }
        await userService.updateUserByQuery({email_verify_token: null, is_email_verified: 1}, {user_id: userD.user_id});
        return true;
    } catch (error) {
        return false;
    }
}
const getWithdrawlStatus = async (req, res) => {
    let responseData = {};
    try {
        let {transaction_id} = req.params;
        let redemData = await userService.getRedeemDataById({transaction_id: transaction_id});
        if (redemData && redemData.bank_reference_id) {
            let data = await getTransferStatus(redemData.bank_reference_id, transaction_id);
            responseData.msg = 'Transfer Status';
            responseData.data = data.status;
            return responseHelper.success(res, responseData);
        }
        responseData.msg = 'Pending';
        return responseHelper.error(res, responseData, 201);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const claimPracticeAmount = async (req, res) => {
    let responseData = {}
    try {
        let userId = req.user.user_id;
        let query = {
            user_id: userId
        }
        let userD = await userService.getUserDetailsById(query);
        let userWallet = await userService.getUserWalletDetailsById({user_id: userId});
        if (!userD) {
            responseData.msg = 'user not found';
            return responseHelper.error(res, responseData, 201);
        }
        let today = new Date().toISOString().split('T')[0]
        if (moment(userWallet.last_claim_date).format('YYYY-MM-DD') == today) {
            responseData.msg = 'Please try again tomorrow';
            return responseHelper.error(res, responseData, 201);
        }

        let amount = 50000;

        if (!userWallet) {
            let walletData = {
                user_id: userId,
                practice_amount: amount,
                last_claim_date: today
            }
            await userService.createUserWallet(walletData);
        } else {
            let walletData = {
                practice_amount: amount,
                last_claim_date: today
            }
            await userService.updateUserWallet(walletData, {user_wallet_id: userWallet.user_wallet_id});
        }

        responseData.msg = 'Amount Added Successfully';
        return responseHelper.success(res, responseData);
    } catch (err) {
        responseData.msg = err;
        return responseHelper.error(res, responseData, 500);
    }
}

const sendOtp = async (req, res) => {
    let reqObj = req.body;
    let responseData = {};
    let mobile = await encryptData(reqObj.mobile);
    try {
        let type = reqObj.type;
        let userData;
        let query;

        userData = await userService.getUserDetailsById({mobile: mobile});
        query = {
            mobile: mobile
        }
        if (!userData) {
            responseData.msg = "no user found";
            return responseHelper.error(res, responseData, 201);
        }
        //let otp = '123456';
        let otp = OTP();
        await userService.updateUserByQuery({
            otp: otp
        }, query);

        responseData.msg = "Otp Send Successfully";
        responseData.data = {otp: otp};
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const verifyOtp = async (req, res) => {
    let mobile = req.body.mobile;
    let otp = req.body.otp;
    let responseData = {};
    mobile = await encryptData(mobile);
    try {
        let userData;
        let updateObj;
        let query;
        userData = await userService.getUserDetailsById({mobile: mobile});
        updateObj = {
            otp: null
        };
        query = {
            mobile: mobile
        }

        if (!userData) {
            responseData.msg = "no user found";
            return responseHelper.error(res, responseData, 201);
        }

        if (userData.otp != otp) {
            responseData.msg = "Invalid Otp";
            return responseHelper.error(res, responseData, 201);
        }

        let updatedUser = await userService.updateUserByQuery(updateObj, query);
        if (!updatedUser) {
            responseData.msg = 'failed to verify mobile';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'Your mobile has been successfully verified!!!';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const verifyPanDetail = async (req, res) => {
    let responseData = {}
    try {
        let userId = req.user.user_id;
        let panNumber = req.body.pan_number;
        let name = req.body.pan_name;
        let dob = req.body.pan_dob;
        let query = {
            user_id: userId
        }
        let userD = await userService.getUserDetailsById(query);
        if (!userD) {
            responseData.msg = 'user not found';
            return responseHelper.error(res, responseData, 201);
        }

        if (!dob) {
            responseData.msg = 'DOB is required';
            return responseHelper.error(res, responseData, 201);
        }

        let checkUserKyc = await userService.getUserKycDetailsById({
            user_id: userId,
            pan_number: panNumber,
            is_pan_card_verify: '1'
        });
        // if (checkUserKyc) {
        //     responseData.msg = 'Already updated';
        //     return responseHelper.error(res, responseData, 201);
        // }

        let requestObj = {
            pan_number: panNumber,
            name: name,
            dob: dob
        }
        let result = await panVerify(requestObj);
        console.log(result);
        if (result.response.status == 'SUCCESS') {
            let kycData = {
                user_id: userId,
                pan_number: panNumber,
                pan_name: result.response.data.name_pan_card,
                pan_dob: dob,
                is_pan_card_verify: '1'
            }

            let userLog = {
                user_id: userId,
                activity_type: 'pan verify kyc',
                old_value: '',
                new_value: JSON.stringify(kycData)
            }
            let check = await userService.getUserKycDetailsById({user_id: userId});
            if (!check) {
                await userService.createUserKyc(kycData);
            } else {
                await userService.updateUserKycByQuery(kycData, {user_kyc_id: check.user_kyc_id});
            }
            await userService.addUserLog(userLog);
            responseData.msg = result.response.message;
            responseData.data = {};
            return responseHelper.success(res, responseData);
        } else {
            console.log('HHH1')
            responseData.msg = result.response.message;
            return responseHelper.error(res, responseData, 201);
        }

    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const verifyAdhaarDetail = async (req, res) => {
    let responseData = {}
    try {
        let userId = req.user.user_id;
        let adhaarNumber = req.body.adhaar_number;
        let query = {
            user_id: userId
        }
        let userD = await userService.getUserDetailsById(query);
        if (!userD) {
            responseData.msg = 'user not found';
            return responseHelper.error(res, responseData, 201);
        }

        let checkUserKyc = await userService.getUserKycDetailsById({
            user_id: userId,
            adhaar_number: adhaarNumber,
            is_adhaar_verify: '1'
        });
        if (checkUserKyc) {
            responseData.msg = 'Already updated';
            return responseHelper.error(res, responseData, 201);
        }

        let requestObj = {
            adhaar_number: adhaarNumber
        }
        let result = await adhaarVerify(requestObj);
        console.log(result);
        if (result.response.status == 'SUCCESS') {
            let kycData = {
                user_id: userId,
                adhaar_number: adhaarNumber,
                transaction_id: result.response.refid,
                //transaction_id: '123456'
            }
            let check = await userService.getUserKycDetailsById({user_id: userId});
            if (!check) {
                await userService.createUserKyc(kycData);
            } else {
                await userService.updateUserKycByQuery(kycData, {user_kyc_id: check.user_kyc_id});
            }

            responseData.msg = 'Otp sent to your mobile number';
            responseData.data = {};
            return responseHelper.success(res, responseData);
        } else {
            responseData.msg = result.response.message;
            return responseHelper.error(res, responseData, 201);
        }

    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const verifyAdhaarOtpDet = async (req, res) => {
    let responseData = {}
    try {
        let userId = req.user.user_id;
        let otp = req.body.otp;
        let adhaarNumber = req.body.adhaar_number;
        let query = {
            user_id: userId
        }
        let userD = await userService.getUserDetailsById(query);
        if (!userD) {
            responseData.msg = 'user not found';
            return responseHelper.error(res, responseData, 201);
        }

        let checkUserKyc = await userService.getUserKycDetailsById({
            user_id: userId,
            adhaar_number: adhaarNumber,
            is_adhaar_verify: '1'
        });
        if (checkUserKyc) {
            responseData.msg = 'Already updated';
            return responseHelper.error(res, responseData, 201);
        }

        let resultKyc = await userService.getUserKycDetailsById({
            user_id: userId,
            is_adhaar_verify: '0'
        });
        // if(resultKyc.transaction_id!=otp){
        //     responseData.msg = 'Invalid OTP';
        //     return responseHelper.error(res, responseData, 201);
        // }
        let requestObj = {
            transaction_id: resultKyc.transaction_id,
            otp: otp
        }
        let result = await verifyAdhaarOtp(requestObj);
        if (result.response.status == 'SUCCESS') {
            let kycData = {
                user_id: userId,
                transaction_id: null,
                is_adhaar_verify: '1'
            }

            let userLog = {
                user_id: userId,
                activity_type: 'Adhaar verify kyc',
                old_value: '',
                new_value: JSON.stringify(kycData)
            }
            await userService.updateUserKycByQuery(kycData, {user_id: userId});
            await userService.addUserLog(userLog);
            responseData.msg = 'Verify Done';
            responseData.data = {};
            return responseHelper.success(res, responseData);
        }  else {
            responseData.msg = result.response.message;
            return responseHelper.error(res, responseData, 201);
        }

    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

// game types for private table creation 
const gameTypeListForPrivateTable = async (req, res) => {
    let responseData = {};
    try { // categoryId for poker is 2
        let categoryId = req.query.category_id;
        let getTypes;
        if (categoryId) {
            getTypes = await adminService.getAllGameType({
                game_category_id: categoryId, game_type_status: '1', club_type: 0, name: {
                    [Op.in]: ['TEXAS', 'PLO 4', 'PL0 5', 'PLO 6']
                }
            });
        }
        if (!categoryId || getTypes.length == 0) {
            responseData.msg = `Game Category not found ${categoryId}`;
            return responseHelper.error(res, responseData, 201);
        }
        getTypes = getTypes.map(async (element, i) => {
            let getCategoryData = await adminService.getGameCategoryByQuery({game_category_id: element.game_category_id});
            element.dataValues.game_fields_json_data = JSON.parse(element.game_fields_json_data);
            element.dataValues.game_category_id = (getCategoryData) ? getCategoryData.game_category_id : '';
            element.dataValues.game_category_name = (getCategoryData) ? getCategoryData.name : '';
            return element;
        })
        getTypes = await Promise.all(getTypes);
        responseData.msg = 'Game Category List';
        responseData.data = getTypes;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

// create game for Private Table
// game_category_id == 2 for poker 
const createGameForPrivate = async (req, res) => {
    let responseData = {};
    try {
        let {
            game_category_id,
            game_type_id,
            game_json_data,
            game_blind_structure_json_data,
            game_price_json_data
        } = req.body;
        // here can not be already added because private_table code would be unique every tine 
        // if (game_category_id == 2) {
        //     let check = await adminService.getGameByQuery({
        //         game_category_id: game_category_id,
        //         game_type_id: game_type_id
        //     });
        //     if (check) {
        //         responseData.msg = 'Already Added';
        //         return responseHelper.error(res, responseData, 201);
        //     }
        // }
//game_category_id==3 for rummy
        let data = {
            game_category_id: game_category_id,
            game_type_id: game_type_id,
            game_name: "",
            game_json_data: JSON.stringify(game_json_data),
            added_by: req.user.user_id,
            club_id: 0,
            is_club_template: 0,
            game_blind_id: game_json_data.game_blind_id ? parseInt(game_json_data.game_blind_id) : null,
            game_prize_id: game_json_data.game_prize_id ? parseInt(game_json_data.game_prize_id) : null,
            private_table_code: Date.now() // code for private tables
        }
        data.is_single_table = true;
        let save = await adminService.createGame(data);
        responseData.msg = 'Game Added Done';
        responseData.data = {};
        responseData.data.private_table_code = data.private_table_code;
        console.log("responseData is ", responseData);
        await (await getRedisClient()).del("ROOM");
        return responseHelper.success(res, responseData);
    } catch (error) {
        console.log(error);
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const changeGameStatusPrivateRoom = async (req, res) => {
    let responseData = {};
    try {
        const {id, status} = req.body;
        let checkRole = await adminService.getGameByQuery({game_id: id});
        if (!checkRole || checkRole.added_by != req.user.user_id) {
            if (!checkRole) responseData.msg = 'Game not found';
            else responseData.msg = 'You have not right to delete';
            return responseHelper.error(res, responseData, 201);
        }
        let roleObj = {
            game_status: status,
            updated_by: req.user.user_id
        }
        await adminService.updateGameById(roleObj, {game_id: id});
        await (await getRedisClient()).del("ROOM", "" + id);
        responseData.msg = 'Status Updated';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const getMinMaxBuyInForTable = async (userMinMaxBuyInReq) => {
    try {
        let data = {};
        if (!userMinMaxBuyInReq.userId) {
            throw new Error("User id is required");
        }
        if (!userMinMaxBuyInReq.tableId) {
            throw new Error("tableId is required");
        }
        let userId = userMinMaxBuyInReq.userId;
        let tableId = userMinMaxBuyInReq.tableId;

        // to get table by tableId
        let pokerTable = await pokerService.getOneGameTableModalDataByQuery({
            game_table_id: tableId
        });
        if (!pokerTable) {
            throw new Error("Table not found");
        }
        let gameModalData = await pokerService.getGameModalDataByQuery({game_id: pokerTable.game_id});
        // let locked_balance_history = await userService.getOneLockedBalanceHistoryByOrder({
        //     where: {user_id: userId, table_id: tableId, status: "settled", is_balance_unlocked: false},
        //     order: [["updatedAt", "DESC"]],
        //     limit: 1,
        //     raw: true
        // });

        // if (!locked_balance_history) {
        //     locked_balance_history = await userService.getOneLockedBalanceHistoryByOrder({
        //         where: {user_id: userId, game_id: pokerTable.game_id, status: "settled", is_balance_unlocked: false},
        //         order: [["updatedAt", "DESC"]],
        //         limit: 1,
        //         raw: true
        //     });
        // }
        let roomAttributes = gameModalData.game_json_data;
        let roomAttributesObj = JSON.parse(roomAttributes);
       // console.log("locked_balance_history is --->", locked_balance_history);


        let userWallet = await userService.getUserWalletDetailsByQuery({user_id: userId});
       
        let realAmount = parseFloat(userWallet.real_amount) || 0;
        let bonusAmount = userWallet.bonus_amount != null ? parseFloat(userWallet.bonus_amount) : 0;
        let winAmount = userWallet.win_amount != null ? parseFloat(userWallet.win_amount) : 0;

        let balance = realAmount + bonusAmount + winAmount;

            console.log("userWallet is --->", userWallet, balance);
       // if (!locked_balance_history) {

            data["minimum_buyin"] = parseInt(roomAttributesObj.minimum_buyin);
            data["maximum_buyin"] = parseInt(roomAttributesObj.maximum_buyin);
            data["message"] = "Success"
            data["tableId"] = tableId;
            data["user_balance"] = balance;
            return data;
      //  }
//         // Assuming dbDate is the timestamp retrieved from your database
//         const dbDate = new Date(locked_balance_history.updatedAt + "");
//         const currentDate = new Date();
// // Calculate the difference in milliseconds
//         const diffInMs = currentDate - dbDate;
// // Calculate the difference in hours
//         const diffInHours = diffInMs / (1000 * 60 * 60);
//         if (diffInHours > roomAttributes.game_timmer || parseInt(roomAttributesObj.minimum_buyin) > locked_balance_history.locked_amount) { // initially it was locked_balance_history.buy_in_amount >= there 
//             data["minimum_buyin"] = parseInt(roomAttributesObj.minimum_buyin);
//             data["maximum_buyin"] = parseInt(roomAttributesObj.maximum_buyin);
//             data["message"] = "Success"
//             data["tableId"] = tableId;
//             data["user_balance"] = balance;
//             return data;
//         }

//         data["minimum_buyin"] = parseInt(locked_balance_history.locked_amount);
//         data["maximum_buyin"] = Math.max(parseInt(locked_balance_history.locked_amount), parseInt(roomAttributesObj.maximum_buyin))
//         data["message"] = "Success"
//         data["tableId"] = tableId;
//         data["user_balance"] = balance;
//         return data;
    } catch (error) {
        console.error("error in getMinMaxBuyInForTable", error);
        let data = {};
        data["message"] = error;
        data["tableId"] = userMinMaxBuyInReq.tableId;
        return data;
    }
}

const islockAlreadylockedbalanceExist = async (userId, tableId) => {
    // let pokerTable = await pokerService.getOneGameTableModalDataByQuery({
    //     game_table_id: tableId
    // });
    let locked_balance_history = await userService.getOneLockedBalanceHistoryByOrder({
        where: {user_id: userId, table_id: tableId, status: "settled", is_buyIn_unlocked: false},
        order: [["updatedAt", "ASC"]],
        limit: 1,
        raw: true
    });
    if(locked_balance_history == null) return false;
    return true;
}

const CanunlockAlreadylockedbalance = async (userId, tableId, amount) => {
    // let pokerTable = await pokerService.getOneGameTableModalDataByQuery({
    //     game_table_id: tableId
    // });
    let locked_balance_history = await userService.getOneLockedBalanceHistoryByOrder({
        where: {user_id: userId, table_id: tableId, status: "settled", is_buyIn_unlocked: false},
        order: [["updatedAt", "ASC"]],
        limit: 1,
        raw: true
    });
    if(locked_balance_history == null )  return false ;
    if( locked_balance_history.buy_in_amount < amount) return false;
    return true;
}

const unlockAlreadylockedbalance = async (userId, tableId) => {
    // let pokerTable = await pokerService.getOneGameTableModalDataByQuery({
    //     game_table_id: tableId
    // });
    try {
        let balanceHistories = await userService.getLockedBalanceHistory({
            user_id: userId,
            // game_id: pokerTable.game_id,
            table_id: tableId,
            is_buyIn_unlocked: false,
            status: "settled"
        })
        balanceHistories.forEach(async (history) => {
            let lockedAmount = parseFloat(history.locked_amount);
            let userWallet = await userService.getUserWalletDetailsByQuery({
                user_id: history.user_id,
            });
            if (!userWallet) {
                throw Error("Wallet does not exist");
            }
            let lockBalance = parseFloat(userWallet.locked_amount);
            if (lockedAmount > lockBalance) {
                throw Error("Locked amount is greater than balance");
            }

            let newLockBalance = lockBalance - lockedAmount;
            let profitLoss = lockedAmount - parseFloat(history.buy_in_amount);
            let oldWinAmount = userWallet.win_amount;
            if (!oldWinAmount) {
                oldWinAmount = 0;
            }
            await userService.updateUserWallet(
                {
                    win_amount: parseFloat(oldWinAmount) + parseFloat("" + profitLoss),
                    real_amount:
                        parseFloat(userWallet.real_amount) +
                        parseFloat(history.buy_in_amount),
                    locked_amount: newLockBalance,
                },
                {user_wallet_id: userWallet.user_wallet_id}
            );
            await userService.updateLockedBalanceHistory(
                {is_buyIn_unlocked: true},
                {locked_balance_history_id: history.locked_balance_history_id}
            );
        });
    }catch (error){
        throw Error("something went wrong..");
    }
}

const unlockAlreadylockedbalanceForClub = async (userId, tableId, clubId) => {
    let pokerTable = await pokerService.getOneGameTableModalDataByQuery({
        game_table_id: tableId
    });
    let balanceHistories = await userService.getLockedBalanceHistory({
        user_id: userId,
        game_id: pokerTable.game_id,
        is_buyIn_unlocked: false,
        status: "settled",
        club_id: clubId
    })
    balanceHistories.forEach(async (history) => {
        let lockedAmount = parseFloat(history.locked_club_amount);
        console.log("lockedamonut--->",lockedAmount);

        let clubChips = await clubService.getJoinClubByClubId({where: {user_id: history.user_id, clubId: clubId}, raw: true});
        if (!clubChips) {
            throw Error("Wallet does not exist");
        }

        let lockBalance = parseFloat(clubChips.locked_amount);
        console.log("lockbalance-->",lockBalance);
        if (lockedAmount > lockBalance) {
            throw Error("Locked amount is greater than balance 5");
        }

        let newLockBalance = lockBalance - lockedAmount;
        let profitLoss = lockedAmount - parseFloat(history.buy_in_club_amount);
        let oldWinAmount = clubChips.chips;
        if (!oldWinAmount) {
            oldWinAmount = 0;
        }
        await clubService.updateJoinClub({
            chips: parseFloat(clubChips.chips) - parseFloat(profitLoss) +  parseFloat(history.buy_in_club_amount),
            locked_amount: newLockBalance,
        }, {where:{registeration_Id: clubChips.registeration_Id}});

        await userService.updateLockedBalanceHistory(
            {is_buyIn_unlocked: true},
            {locked_balance_history_id: history.locked_balance_history_id}
        );
    });
}

const lockBalanceOfUserForClub = async (lockBalanceReq) => {
    try {
        let userId = lockBalanceReq.user_id;
        let amount = parseFloat(lockBalanceReq.amount);
        console.log("amonut",amount);
        let tableId = lockBalanceReq.tableId;
        let gameType = lockBalanceReq.gameType;
        let clubId = lockBalanceReq.clubId;
        if (!gameType) {
            gameType = "TEXAS";
        }
        let lockedBalanceHistory = await userService.getOneLockedBalanceHistory({
            user_id: userId
            , table_id: tableId,
            status: "unsettled",
            club_id: clubId
        });
        console.log(lockedBalanceHistory);
        if (lockedBalanceHistory) {
            throw new Error("User already has unsettled locked balance for this table");
        }
        // Unlock already locked amount for similar tables which are setteled
        await unlockAlreadylockedbalanceForClub(userId, tableId, clubId);
        let clubChips = await clubService.getJoinClubByClubId({where: {user_id: userId, clubId: clubId}, raw: true});
        console.log("clubchips",clubChips);
        if (!clubChips) {
            throw Error("Wallet does not exist");
        }
        let balance = clubChips.chips;

        if (amount > balance) {
            throw Error("Locked amount is greater than balance 6");
        }
        let lockBalance;
        if (clubChips.locked_amount) {
            lockBalance = parseFloat(clubChips.locked_amount);
        } else {
            lockBalance = 0;
        }
        let transaction = {
            user_id: userId,
            table_id: tableId,
            type: "DR",
            amount: amount,
            opening_balance: balance,
            closing_balance: balance - amount,
        }
        let newLockBalance = lockBalance + amount;
        await clubService.updateJoinClub({
            chips: parseFloat(clubChips.chips) - parseFloat(amount),
            locked_amount: parseFloat(newLockBalance)
        }, {where:{registeration_Id: clubChips.registeration_Id}});
        let pokerTable = await pokerService.getOneGameTableModalDataByQuery({
            game_table_id: tableId
        });
        lockedBalanceHistory = {
            user_id: userId,
            table_id: tableId,
            locked_club_amount: amount,
            buy_in_club_amount: parseFloat("" + amount),
            status: "unsettled",
            round_count: 0,
            game_id: pokerTable.game_id,
            is_buyIn_unlocked: false,
            club_id: clubId
        }
        await userService.createLockedBalanceHistory(lockedBalanceHistory);
        await userService.createTransaction(transaction);
        return {
            status: true,
            message: "Balance locked successfully",
        }
    } catch (error) {
        console.log("Error in lock balance of user ", error);
        return {
            status: false,
            message: error.message
        }
    }
}
const deductJoinFeesForClub = async (deductBalanceReq) => {
    try {
        let userId = deductBalanceReq.user_id;
        let amount = parseFloat(deductBalanceReq.lockAmount);
        let deductBalance = parseFloat(deductBalanceReq.deductBalance);
        let tableId = deductBalanceReq.tableId;
        let clubId = deductBalanceReq.clubId;

        let clubChips = await clubService.getJoinClubByClubId({where: {user_id: userId, clubId: clubId}, raw: true});
        if (!clubChips) {
            throw Error("Wallet does not exist");
        }
        let balance = clubChips.chips;
        if (deductBalance > balance) {
            throw Error("Locked amount is greater than balance 7");
        }
        // let userWallet = await userService.getUserWalletDetailsByQuery({user_id: userId});
        // let userWalletAdmin = await userService.getUserWalletDetailsByQuery({user_id: 1});
        // if (!userWallet || !userWalletAdmin) {
        //     throw Error("Wallet does not exist");
        // }
        // let balance = parseFloat(userWallet.real_amount) + parseFloat(userWallet.bonus_amount)
        //     + parseFloat(userWallet.win_amount);
        // let balanceAdmin = parseFloat(userWalletAdmin.real_amount) + parseFloat(userWalletAdmin.bonus_amount)
        //     + parseFloat(userWalletAdmin.win_amount);
        // if (deductBalance > balance) {
        //     throw Error("Locked amount is greater than balance");
        // }
        let transaction = {
            user_id: userId,
            table_id: tableId,
            type: "DR",
            other_type: 'Bet Amount',
            category: 'Poker',
            amount: deductBalance,
            opening_balance: balance,
            closing_balance: balance - deductBalance,
        }
        // let transactionAdmin = {
        //     user_id: 1,
        //     table_id: tableId,
        //     type: "CR",
        //     amount: deductBalance,
        //     opening_balance: balanceAdmin,
        //     closing_balance: balanceAdmin + deductBalance,
        // }
        // let getBonus = await userService.getBonusSetting();
        // let bonusAmt = 0;
        // let betAmount = deductBalance;
        // if (getBonus && getBonus.data) {
        //     bonusAmt = userWallet.bonus_amount * getBonus.data / 100
        //     betAmount = parseFloat("" + deductBalance) - parseFloat("" + bonusAmt);
        // }
        // let deductBonusAmount = parseFloat(userWallet.bonus_amount) - parseFloat(bonusAmt);
        // let deductAmount = parseFloat(userWallet.real_amount) - parseFloat(betAmount);
        // let deductWinAmount = parseFloat(userWallet.win_amount);
        // if (deductAmount < 0) {
        //     deductAmount = deductAmount * -1
        //     deductWinAmount = parseFloat(userWallet.win_amount) - parseFloat(deductAmount);
        //     deductAmount = 0;
        // }
        if (amount) {
            let lockedBalanceHistory = await userService.getOneLockedBalanceHistory({
                user_id: userId,
                table_id: tableId,
                status: "unsettled",
                club_id: clubId
            });
            if (lockedBalanceHistory) {
                throw new Error("User already has unsettled locked balance for this table");
            }
            let pokerTable = await pokerService.getOneGameTableModalDataByQuery({
                game_table_id: tableId
            });
            lockedBalanceHistory = {
                user_id: userId,
                table_id: tableId,
                locked_club_amount: amount,
                buy_in_club_amount: parseFloat("" + amount),
                status: "unsettled",
                round_count: 0,
                game_id: pokerTable.game_id,
                is_buyIn_unlocked: false,
                club_id: clubId
            }
            await userService.createLockedBalanceHistory(lockedBalanceHistory);
        }
        await clubService.updateJoinClub({
            chips: parseFloat(clubChips.chips) - parseFloat(deductBalance)
        }, {where:{registeration_Id: clubChips.registeration_Id}});

        await userService.createTransaction(transaction);
        return {
            status: true,
            message: "Balance locked successfully",
        }
    } catch (error) {
        console.log("Error in lock balance of user ", error);
        return {
            status: false,
            message: error.message
        }
    }
}

const getMinMaxBuyInForTableForClub = async (userMinMaxBuyInReq) => {
    try {
        let data = {};
        if (!userMinMaxBuyInReq.userId) {
            throw new Error("User id is required");
        }
        if (!userMinMaxBuyInReq.tableId) {
            throw new Error("tableId is required");
        }
        if (!userMinMaxBuyInReq.clubId) {
            throw new Error("clubId is required");
        }
        let userId = userMinMaxBuyInReq.userId;
        let tableId = userMinMaxBuyInReq.tableId;
        let clubId = userMinMaxBuyInReq.clubId;

        // to get table by tableId
        let pokerTable = await pokerService.getOneGameTableModalDataByQuery({
            game_table_id: tableId
        });
        if (!pokerTable) {
            throw new Error("Table not found");
        }
        let gameModalData = await pokerService.getGameModalDataByQuery({game_id: pokerTable.game_id});
        let locked_balance_history = await userService.getOneLockedBalanceHistoryByOrder({
            where: {user_id: userId, table_id: tableId, status: "settled", is_buyIn_unlocked: false},
            order: [["updatedAt", "DESC"]],
            limit: 1,
            raw: true
        });
        let clubChips = await clubService.getJoinClubByClubId({where: {user_id: userId, clubId: clubId}, raw: true});
        if (!locked_balance_history) {
            locked_balance_history = await userService.getOneLockedBalanceHistoryByOrder({
                where: {user_id: userId, game_id: pokerTable.game_id, status: "settled", is_buyIn_unlocked: false},
                order: [["updatedAt", "DESC"]],
                limit: 1,
                raw: true
            });
        }
        let roomAttributes = gameModalData.game_json_data;
        let roomAttributesObj = JSON.parse(roomAttributes);
        console.log("locked_balance_history is --->", locked_balance_history);
        if (!locked_balance_history) {

            data["minimum_buyin"] = parseInt(roomAttributesObj.minimum_buyin);
            data["maximum_buyin"] = parseInt(roomAttributesObj.maximum_buyin);
            data["message"] = "Success"
            data["tableId"] = tableId;
            data["user_balance"] = clubChips.chips;
            return data;
        }
        // Assuming dbDate is the timestamp retrieved from your database
        const dbDate = new Date(locked_balance_history.updatedAt + "");
        const currentDate = new Date();
// Calculate the difference in milliseconds
        const diffInMs = currentDate - dbDate;
// Calculate the difference in hours
        const diffInHours = diffInMs / (1000 * 60 * 60);
        if (diffInHours > roomAttributes.game_timmer || locked_balance_history.buy_in_club_amount >= locked_balance_history.locked_club_amount) {
            data["minimum_buyin"] = parseInt(roomAttributesObj.minimum_buyin);
            data["maximum_buyin"] = parseInt(roomAttributesObj.maximum_buyin);
            data["message"] = "Success"
            data["tableId"] = tableId;
            data["user_balance"] = clubChips.chips;
            return data;
        }

        data["minimum_buyin"] = parseInt(locked_balance_history.locked_club_amount);
        data["maximum_buyin"] = Math.max(parseInt(locked_balance_history.locked_club_amount), parseInt(roomAttributesObj.maximum_buyin))
        data["message"] = "Success"
        data["tableId"] = tableId;
        data["user_balance"] = clubChips.chips;
        return data;
    } catch (error) {
        console.error("error in getMinMaxBuyInForTable", error);
        let data = {};
        data["message"] = error;
        data["tableId"] = userMinMaxBuyInReq.tableId;
        return data;
    }
}

const updateLockBalanceOfUserForTableForClub = async (lockBalanceReq) => {
    try {

        let userId = lockBalanceReq.user_id;
        let amount = parseFloat(lockBalanceReq.amount+"");
        let tableId = lockBalanceReq.tableId;
        let clubId = lockBalanceReq.clubId;
       

        let lockedBalanceHistory = await userService.getOneLockedBalanceHistory({
            user_id: userId
            , table_id: tableId,
            status: "unsettled",
            club_id: clubId
        });
        

        console.log("lockedBalanceHistory-->",lockedBalanceHistory);
        
        if (!lockedBalanceHistory) {
            throw new Error("User does not have unsettled locked balance for this table");
        }
  
        let userWallet = await clubService.getJoinClubByClubId({where: {user_id: userId, clubId: clubId}, raw: true});
        if (!userWallet) {
            throw Error("Wallet does not exist");
        }
        let lockBalance = parseFloat(userWallet.locked_amount+"");
        let lockBalanceForThisTable = parseFloat(lockedBalanceHistory.locked_club_amount+"");
        if (!lockedBalanceHistory.round_count) {
            lockedBalanceHistory.round_count = 0;
        }
        let round_count = parseInt(lockedBalanceHistory.round_count);
        round_count++;
        let lockedBalanceForOtherTable = lockBalance - lockBalanceForThisTable;
        userWallet.locked_amount = lockedBalanceForOtherTable + amount;
        await clubService.updateJoinClub({
                locked_amount: userWallet.locked_amount
            },
            {where:{registeration_Id: userWallet.registeration_Id}});

            let winnings=amount-parseFloat(lockedBalanceHistory.buy_in_club_amount+"");
        await userService.updateLockedBalanceHistory({
            locked_club_amount: amount,
                round_count: round_count,
                winnings:winnings
            },
            {locked_balance_history_id: lockedBalanceHistory.locked_balance_history_id});
        return {
            status: true,
            message: "Balance locked successfully",
        }
    } catch (error) {
        console.log("Error in update lock balance of user ", error);
        return {
            status: false,
            message: error.message
        }
    }
}

const unlockBalanceOfUserForClub = async (unlockBalanceReq) => {
    console.log('gggggggg');
    try {
        let userId = unlockBalanceReq.user_id;
        let amount = parseFloat(unlockBalanceReq.amount);
        let tableId = unlockBalanceReq.tableId;
        let gameType = unlockBalanceReq.gameType;
        let clubId = unlockBalanceReq.clubId
        if (!gameType) {
            gameType = "TEXAS";
        }
        let lockedBalanceHistory = await userService.getOneLockedBalanceHistory({
            user_id: userId,
            table_id: tableId,
            status: "unsettled",
            club_id: clubId
        });
        if (!lockedBalanceHistory) {
            throw new Error("No unsettled locked balance found for this table");
        }
        let lockedAmount = parseFloat(lockedBalanceHistory.locked_club_amount);
        let userWallet = await clubService.getJoinClubByClubId({where: {user_id: userId, clubId: clubId}, raw: true});
        if (!userWallet) {
            throw Error("Wallet does not exist");
        }
        let lockBalance = parseFloat(userWallet.locked_amount);
        if (lockedAmount > lockBalance) {
            throw Error("Locked amount is greater than balance 9");
        }
        let balance = parseFloat(userWallet.chips);
        let newBalance = balance + amount;
        let newLockBalance = lockBalance - lockedAmount;
        let transaction = {
            user_id: userId,
            table_id: tableId,
            type: "CR",
            other_type: 'Winning',
            category: 'Poker',
            amount: amount,
            opening_balance: balance,
            closing_balance: newBalance,
        }
        let profitLoss = amount - parseFloat(lockedBalanceHistory.buy_in_club_amount);
        if (profitLoss > 0 && !gameType.startsWith("PRACTICE")) {
            let game_table = await pokerService.getOneGameTableModalDataByQuery({game_table_id: tableId});
            let game = await pokerService.getGameModalDataByQuery({game_id: game_table.game_id});
            let pokerWinInSession = {
                game_table_id: tableId,
                user_id: userId,
                winning: profitLoss,
                game_type_id: parseInt(game.game_type_id),
                rounds_played: lockedBalanceHistory.round_count,
            };
            await userService.createPokerSessionWin(pokerWinInSession);
        }

        if (profitLoss <= 0) {
            await clubService.updateJoinClub({
                chips: (parseFloat(userWallet.chips) + parseFloat("" + amount)),
                    locked_amount: newLockBalance
                },
                {where:{registeration_Id: userWallet.registeration_Id}});
        }
        let is_balance_unlocked = false;
        if (profitLoss <= 0 || gameType.startsWith("PRACTICE")) is_balance_unlocked = true; // marking unloacked only if player looses
        await userService.updateLockedBalanceHistory({
                status: "settled",
                locked_club_amount: amount,
                is_buyIn_unlocked: is_balance_unlocked
            } // added locked_amount: amount by my own
            , {locked_balance_history_id: lockedBalanceHistory.locked_balance_history_id});
            console.log(`Updated locked balance history for history_id ${lockedBalanceHistory.locked_balance_history_id}`);
        await userService.createTransaction(transaction);
        return {
            status: true,
            message: "Balance unlocked successfully",
        }
    } catch (error) {
        console.log("Error in unlock balance of user ", error);
        return {
            status: false,
            message: error.message
        }
    }
}

const topUpBalanceOfUserForClub = async (topUpBalanceRequest) => {
    try {
        let userId = topUpBalanceRequest.user_id;
        let prevAmount = parseFloat(topUpBalanceRequest.prev_amount);
        let tableId = topUpBalanceRequest.tableId;
        let topUpAmount = parseFloat(topUpBalanceRequest.top_up_amount);
        let gameType = topUpBalanceRequest.gameType;
        let clubId = topUpBalanceRequest.clubId;
        if (!gameType) {
            gameType = "TEXAS";
        }
        let lockedBalanceHistory = await userService.getOneLockedBalanceHistory({
            user_id: userId
            , table_id: tableId,
            status: "unsettled",
            club_id:clubId
        });
        if (!lockedBalanceHistory) {
            throw new Error("User does not have unsettled locked balance for this table");
        }
        let userWallet = await clubService.getJoinClubByClubId({where: {user_id: userId, clubId: clubId}, raw: true});
        if (!userWallet) {
            throw Error("Wallet does not exist");
        }



        let balance = userWallet.chips;
        let lockBalance = parseFloat(userWallet.locked_amount);
        let lockBalanceForThisTable = parseFloat(lockedBalanceHistory.locked_club_amount);
        let lockedBalanceForOtherTable = lockBalance - lockBalanceForThisTable;
        userWallet.locked_amount = lockedBalanceForOtherTable + prevAmount + topUpAmount;

        let betAmount = topUpAmount;
        // i want to add the check if the userwallet is less than the topup amount then not procced

        if(betAmount>balance){
            throw new Error("Player not have enough chips for top up");

        }
        // updating table attributes as well in table_round
        let tableRoundData = await pokerService.getTableRoundByQuery({
            game_table_id: tableId
        });
        let tableAttributes = tableRoundData.table_attributes;
        let tableAttributesObj = JSON.parse(tableAttributes);

        
        let maximumBuyin = parseFloat(tableAttributesObj.maximum_buyin);

        let player = tableAttributesObj.players.find(player => player.userId === userId);

        if (player) {
            if (player.stack + topUpAmount > maximumBuyin) {
                throw new Error(`You cannot have a stack greater than the maximum buyin of ${maximumBuyin}`);
            }
            player.stack += topUpAmount;
        } else {
            throw new Error("Player not found in table attributes");
        }

        await clubService.updateJoinClub({
            chips: parseFloat(userWallet.chips) - parseFloat(betAmount)
        }, {where:{registeration_Id: userWallet.registeration_Id}});

        await userService.updateLockedBalanceHistory({
                locked_club_amount: prevAmount + topUpAmount,
                buy_in_club_amount: parseFloat(lockedBalanceHistory.buy_in_club_amount) + topUpAmount,
            },
            {locked_balance_history_id: lockedBalanceHistory.locked_balance_history_id});
        let transaction = {
            user_id: userId,
            table_id: tableId,
            type: "DR",
            other_type: 'Bet Amount',
            category: 'Poker',
            amount: topUpAmount
        }
        await userService.createTransaction(transaction);

        // // updating table attributes as well in table_round
        // let tableRoundData = await pokerService.getTableRoundByQuery({
        //     game_table_id: tableId
        // });
        // let tableAttributes = tableRoundData.table_attributes;
        // let tableAttributesObj = JSON.parse(tableAttributes);
        // // if (tableAttributesObj.players.find(player => player.userId === userId)) {
        // //     player.stack += topUpAmount;
        // // }
        // for (let i = 0; i < tableAttributesObj.players.length; i++) {
        //     if (tableAttributesObj.players[i].userId == userId)
        //         tableAttributesObj.players[i].stack += topUpAmount;
        // }
        tableRoundData.table_attributes = JSON.stringify(tableAttributesObj);
        await pokerService.updateTableRoundModalDataByQuery({
            table_attributes: tableRoundData.table_attributes,
        }, {
            table_round_id: tableRoundData.table_round_id
        });
        return {
            status: true,
            message: "Top up balance successfully",
        }
    } catch (error) {
        console.log("error in topUpBalanceOfUser controller ", error);
        return {
            status: false,
            message: error.message
        }
    }
}

const addPrizeMoneyForClub = async (addPrizeMoneyReq) => {
    try {
        let userId = addPrizeMoneyReq.user_id;
        let amount = parseFloat(addPrizeMoneyReq.prizeMoney);
        let tableId = addPrizeMoneyReq.tableId;
        let clubId = addPrizeMoneyReq.clubId;
        let lockedBalanceHistory = await userService.getOneLockedBalanceHistory({
            user_id: userId,
            table_id: tableId,
            status: "unsettled",
            club_id:clubId
        });
        if (!lockedBalanceHistory) {
            return {
                status: false,
                message: "Not found any balance locked history ",
            }
        }
        let userWallet = await clubService.getJoinClubByClubId({where: {user_id: userId, clubId: clubId}, raw: true});
        if (!userWallet) {
            throw Error("Wallet does not exist");
        }

        let profitLoss = amount;
        if (profitLoss > 0) {
            let game_table = await pokerService.getOneGameTableModalDataByQuery({game_table_id: tableId});
            let game = await pokerService.getGameModalDataByQuery({game_id: game_table.game_id});
            let pokerWinInSession = {
                game_table_id: tableId,
                user_id: userId,
                winning: profitLoss,
                game_type_id: parseInt(game.game_type_id),
                rounds_played: lockedBalanceHistory.round_count,
            };
            if (game.is_single_table && !game.is_game_finished) {
                game.is_game_finished = true;
                await pokerService.updateGameByQuery({
                    is_game_finished: game.is_game_finished
                }, {
                    game_id: game.game_id
                });
            }
            await userService.createPokerSessionWin(pokerWinInSession);
        }
        if (amount > 0) {
            let oldWinAmount = userWallet.chips;
            if (!oldWinAmount) {
                oldWinAmount = 0;
            }
            oldWinAmount = parseFloat("" + oldWinAmount);
            await clubService.updateJoinClub({
                    chips: (oldWinAmount + parseFloat("" + amount)),
                    locked_amount: parseFloat(userWallet.locked_amount)
                        - (parseFloat(lockedBalanceHistory.locked_club_amount))
                }
                , {where:{registeration_Id: userWallet.registeration_Id}});
        }
        await userService.updateLockedBalanceHistory({status: "settled", is_buyIn_unlocked: true}
            , {locked_balance_history_id: lockedBalanceHistory.locked_balance_history_id});
        return {
            status: true,
            message: "Balance unlocked successfully",
        }
    } catch (error) {
        console.log("Error in unlock balance of user ", error);
        return {
            status: false,
            message: error.message
        }
    }
}

const logout = async (req, res) => {
    let responseData = {}
    try {
        const userId = req.user.user_id;
        let query = {user_id: userId}
        let getUser = await userService.getUserDetailsById(query);
        if (!getUser) {
            responseData.msg = 'No User Found';
            return responseHelper.error(res, responseData, 201);
        }
        await userService.updateUserByQuery({is_login: '0'}, query);
        responseData.msg = 'User logout successfully!!!';
        responseData.data = {};
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const deductJoinFeesForRummy = async (deductBalanceReq) => {
    try {
        //let deductBalanceReq = req.body;
        console.log('Rummy deductBalanceReq------>', deductBalanceReq)
        let userId = deductBalanceReq.user_id;
        let deductBalance = Math.abs(parseFloat(deductBalanceReq.deductBalance));
        let userWallet = await userService.getUserWalletDetailsByQuery({user_id: userId});

        if (!userWallet) {
            throw Error("Wallet does not exist");
        }
        // console.log("userWallet-->", userWallet);
        // Parse the string values to float
        let depositAmount = parseFloat(userWallet.dataValues.real_amount) || 0;
        let bonusAmount = parseFloat(userWallet.dataValues.bonus_amount) || 0;
        let winAmount = parseFloat(userWallet.dataValues.win_amount) || 0;
        let locked_amt = parseFloat(userWallet.dataValues.locked_amount) || 0;
        let updated_locked_amt = locked_amt + deductBalance;
// Check the parsed values
        console.log("Parsed values: ", depositAmount, bonusAmount, winAmount);

        let getBonus = await userService.getBonusSetting();
        let betAmount = deductBalance;

// Step 1: Deduct 10% of the bet amount from the bonus amount
        let bonusDeduction = 0;
        if (getBonus && getBonus.bet_bonus_amount) {
            bonusDeduction = betAmount * getBonus.bet_bonus_amount / 100;
        }
        let bonusPerAmt = 0;
        if (bonusAmount >= bonusDeduction) {
            bonusPerAmt = bonusDeduction;
        }
// Perform calculations
        let balance = depositAmount + bonusPerAmt + winAmount;

// Check the total amount
        console.log("Total amount user: ", balance);

        // let balance = parseFloat(userWallet.real_amount) + parseFloat(userWallet.otp_amount) + parseFloat(userWallet.bonus_amount)
        //     + parseFloat(userWallet.win_amount);
        // console.log("user all amount--->",balance);
        if (deductBalance > balance) {
            throw Error("Locked amount is greater than balance");
        }

        let transactionAdmin = {
            user_id: 1,
            type: "CR",
            amount: deductBalance,
            opening_balance: balance,
            closing_balance: balance + deductBalance,
        }

        if (bonusAmount >= bonusDeduction) {
            bonusAmount -= bonusDeduction;
        } else {
            console.log("Not enough bonus amount to deduct.");
            bonusDeduction = bonusAmount;
            bonusAmount = 0;
        }

        let remainingBet = betAmount - bonusDeduction;

// Step 2: Deduct the remaining bet amount from the deposit amount
        if (depositAmount >= remainingBet) {
            depositAmount -= remainingBet;
            remainingBet = 0;
        } else {
            remainingBet -= depositAmount;
            depositAmount = 0;
        }

// Step 3: Deduct any remaining bet amount from the win amount
        if (remainingBet > 0) {
            if (winAmount >= remainingBet) {
                winAmount -= remainingBet;
                remainingBet = 0;
            } else {
                console.log("Not enough win amount to deduct.");
                remainingBet -= winAmount;
                winAmount = 0;
            }
        }

        console.log(`Bonus Amount: ${bonusAmount}`);
        console.log(`Deposit Amount: ${depositAmount}`);
        console.log(`Win Amount: ${winAmount}`);
        console.log(`Remaining Bet Amount: ${remainingBet}`);


        console.log('Rummy deduction', {
            real_amount: depositAmount,
            bonus_amount: bonusAmount,
            win_amount: winAmount,
            locked_amount: updated_locked_amt,
            user_id: userId
        })


        let depositAmounts = parseFloat(userWallet.dataValues.real_amount) || 0;
        let bonusAmounts = parseFloat(userWallet.dataValues.bonus_amount) || 0;
        let winAmounts = parseFloat(userWallet.dataValues.win_amount) || 0;

        console.log('Transaction Amount', {
            depositAmounts: parseFloat(depositAmounts) - parseFloat(depositAmount),
            bonusAmounts: parseFloat(bonusAmounts) - parseFloat(bonusAmount),
            winAmounts: parseFloat(winAmounts) - parseFloat(winAmount)
        })

        await userService.updateUserWallet({
            real_amount: parseFloat(depositAmount),
            bonus_amount: parseFloat(bonusAmount),
            win_amount: parseFloat(winAmount),
            locked_amount: updated_locked_amt,
        }, {user_wallet_id: userWallet.user_wallet_id});

        let transaction = {
            user_id: userId,
            type: "DR",
            other_type: 'Bet Amount',
            category: 'Rummy',
            amount: deductBalance,
            opening_balance: balance,
            real_amount: parseFloat(depositAmounts) - parseFloat(depositAmount),
            win_amount: parseFloat(winAmounts) - parseFloat(winAmount),
            bonus_amount: parseFloat(bonusAmounts) - parseFloat(bonusAmount),
            closing_balance: balance - deductBalance,
        }
        console.log("transaction-->", transaction);
        await userService.createTransaction(transaction);
        return {
            status: true,
            message: "Balance locked successfully",
        }
    } catch (error) {
        console.log("Error in lock balance of user ", error);
        return {
            status: false,
            message: error.message
        }
    }
}

const addWinningAmountForRummy = async (addWinBalanceRequest) => {
    try {
        console.log("addWinBalanceRequest---->", addWinBalanceRequest);
        let userId = addWinBalanceRequest.user_id;
        let realAmount = parseFloat(addWinBalanceRequest.realAmount);
        let winAmount = parseFloat(addWinBalanceRequest.winningAmount + "");
        let AdminCommision = parseFloat(addWinBalanceRequest.adminCommision);
        let newlocked_amt = parseFloat(addWinBalanceRequest.newLockedAmount);
        let remainingAmt = parseFloat(addWinBalanceRequest.remainingAmount);
        console.log("newlocked amt-->", parseFloat(addWinBalanceRequest.newLockedAmount));
        console.log("Raw commission:", AdminCommision);
        console.log("Rounded commission:", Number(AdminCommision.toFixed(4)));

        let userWallet = await userService.getUserWalletDetailsByQuery({user_id: userId});
        if (!userWallet) {
            throw Error("Wallet does not exist");
        }

        if (parseInt(addWinBalanceRequest.success) == 0) {
            let transaction = await userService.getLastTransactionById({
                user_id: userId,
                category: 'Rummy',
                other_type: 'Bet Amount',
                amount: realAmount
            })
            console.log("transaction-->", transaction);
            if (transaction && transaction.amount > 0) {
                if (remainingAmt > 0) {
                    // lets say plyer is getting some redunded amount then adding that amount in real balance
                    let transactionDatas = {
                        order_id: 'TXN_' + new Date().getTime(),
                        amount: parseFloat(remainingAmt),
                        type: 'CR',
                        other_type: 'Refunded',
                        category: 'Rummy',
                        user_id: userId,
                        transaction_status: 'SUCCESS',
                        real_amount: parseFloat(realAmount),
                        win_amount: parseFloat(userWallet.win_amount),
                        bonus_amount: parseFloat(userWallet.bonus_amount),
                    }
                    await userService.createTransaction(transactionDatas);
                }
                await userService.updateUserWallet({
                    real_amount: realAmount,
                    locked_amount: newlocked_amt
                }, {user_id: userId});

                return {
                    status: true,
                    message: "remaining amount added ",
                }
            }
        }
        await userService.updateUserWallet({
            real_amount: realAmount,
            win_amount: winAmount,
            locked_amount: newlocked_amt
        }, {user_id: userId})
        let orderId = 'TXN_' + new Date().getTime();
        let transactionDatas = {
            order_id: orderId,
            amount: winAmount - parseFloat(userWallet.win_amount+""),
            //amount: (winAmount - (parseFloat(userWallet.win_amount) + (parseFloat(userWallet.locked_amount - newlocked_amt))) < 0) ? 0 : (winAmount - (parseFloat(userWallet.win_amount) + (parseFloat(userWallet.locked_amount - newlocked_amt)))),
            type: 'CR',
            other_type: 'Winning',
            category: 'Rummy',
            user_id: userId,
            transaction_status: 'SUCCESS',
            commission: Number(AdminCommision.toFixed(4))

        }
        await userService.createTransaction(transactionDatas);

        let orderAdminId = 'TXN_' + new Date().getTime();
        let transactionAdminDatas = {
            order_id: orderAdminId,
            amount: winAmount - parseFloat(userWallet.win_amount+""),
            //amount: winAmount - (parseFloat(userWallet.win_amount) + (parseFloat(userWallet.locked_amount - newlocked_amt))),
            type: 'CR',
            other_type: 'Commission',
            category: 'Rummy',
            user_id: userId,
            commission: Number(AdminCommision.toFixed(4)),
            is_admin: 1,
            transaction_status: 'SUCCESS'
        }
        console.log("transactionAdminDatas---->", transactionAdminDatas);
        await userService.createTransaction(transactionAdminDatas);
        return {
            status: true,
            message: "Winning amount added ",
        }

    } catch (error) {
        console.log("Error in unlock balance of user ", error);
        return {
            status: false,
            message: error.message
        }
    }
}

const userBonusPercentage = async () => {
    try {
        let details = await userService.getBonusSetting();
        let percentage = (details) ? details.bet_bonus_amount : 0;
        return {
            bonus_percentage: percentage
        };
    } catch (error) {
        console.log('error occured ', error);
        return {
            details: [{
                status: false,
                message: error.message
            }]
        }
    }
}
const get_all_avatars = async (req, res) => {
    let responseData = {};
    try {
  
        const avatars = await adminService.getAllAvatar({});
        responseData.msg="all avatar fetch successfully"
        responseData.data=avatars
        return responseHelper.success(res, responseData,200);
        
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
  };

//   const savePoolGameHistory=async(req,res)=>{
//       let responseData={};
//       try {

          


          
//       } catch (error) {
//         responseData.msg = error.message;
//         return responseHelper.error(res, responseData, 500);
//       }
//   }


const addPokerSusPiciousUser = async (request) => {
    const transaction = await sequelize.transaction(); // Start transaction
    try {
        let user = await userService.getUserDetailsById({user_id:request.userId});
      //  console.log("user-->",user);
       let tableRoundData = await pokerService.getTableRoundByQuery({
               game_table_id: request.tableId,
               table_round_status: "Active"
            });

        let details = await userService.createPokerSuspiciousUser(
            {
                userId: request.userId,
                tableId: request.tableId,
                gameId: request.gameId,
                action: request.action,
                roundId:tableRoundData.table_round_id
            },
             transaction  // Pass transaction object
        );
        
        let admins = await adminService.getAllAdmins({admin_status:'1'});
       // console.log("user-->",admins);

        for (let i = 0; i < admins.length; i++) {
            let userID = admins[i].user_id;
  
            // let checkUser = await user.findOne({ where: {id:userIDS } });
            let checkUser=await adminService.getUserDetailsById({user_id:userID})
  
            if (!checkUser) {
               continue;
            }
            if(!(await(getRole(userID))>0)){ continue;}
          
            if (checkUser.device_token) {
                let pushData = {
                    title: 'Suspicious User Detected !!',
                    message: 'user '+user.username+" did "+request.action +" action!!",
                    device_token: checkUser.device_token
                };
               try {
                console.log("pushData-->",pushData, "userData-->",checkUser);
                
                let result = await sendPushNotification(pushData); } 
                catch (error) {
                   console.log("error in push notification",error);
            }
        }
        }
        await transaction.commit(); // Commit transaction if successful
    return { status: true , message: "Suspicious user added successfully" };
    } catch (error) {
        console.error("Error in addPokerSusPiciousUser", error);
        await transaction.rollback(); // Rollback transaction in case of an error
        return { status: false, message: error.message }; // Return error for debugging
    }
};

const getRole = async (userId)=> {
   try {
    let userData_admin = await adminService.geAdminDetailsById({ user_id: userId });
    const allRolesQuery = `
    SELECT role_id, roles, role_status 
    FROM roles
    WHERE role_status = '1'
  `;
    const allRoles = await sequelize.query(allRolesQuery, {
      type: QueryTypes.SELECT,
    });

    let adminRoles = [];

    if (userData_admin) {
      const user_id = userData_admin.admin_id;
      // Step 2: Fetch roles associated with the admin
      const adminRolesQuery = `
        SELECT roles.role_id
        FROM admins
        INNER JOIN user_roles ON user_roles.userId = admins.admin_id
        INNER JOIN roles ON roles.role_id = user_roles.roleId
        WHERE admins.admin_id = :user_id
      `;

      adminRoles = await sequelize.query(adminRolesQuery, {
        replacements: { user_id },
        type: QueryTypes.SELECT,
      });
      console.log("adminRoles-->", adminRoles);
    }

    // Step 3: Set isActive flag for each role
    const rolesWithIsActive = allRoles.map((role) => ({
      ...role,
      isActive: adminRoles.some(
        (adminRole) => adminRole.role_id === role.role_id
      ),
    }));
return rolesWithIsActive.filter((role) =>  role.isActive).length;
   } catch (error) {
    console.log("error in getRole", error);
    return 0;
   }
}

const getBanner = async (req, res) => {
    let responseData = {}
    try {
        let getBanners = await userService.getBanner({status: '1'});
        if (getBanners.length == 0) {
            responseData.msg = 'Banner not Found';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'Banner list';
        responseData.data = getBanners;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const updateWalletForFantasy = async (req, res) => {
    let responseData = {}
    try {
        let {userId, depositeAmount, bonusAmount, winningAmount} = req.body;
        let result = await userService.getUserWalletDetailsById({user_id: req.body.userId});
        if (!result) {
            responseData.msg = 'Data not Found';
            return responseHelper.error(res, responseData, 201);
        }
        let walletObj = {
            real_amount: parseFloat(result.real_amount) - parseFloat(depositeAmount),
            bonus_amount: parseFloat(result.bonus_amount) - parseFloat(bonusAmount),
            win_amount: parseFloat(result.win_amount) - parseFloat(winningAmount)
        }
        let totalBetAmount = parseFloat(depositeAmount) + parseFloat(bonusAmount) + parseFloat(winningAmount)
        let transaction = {
            order_id: "MT" + Date.now(),
            user_id: userId,
            type: "DR",
            other_type: 'Bet Amount',
            category: 'Fantasy',
            amount: totalBetAmount
        }

        await userService.updateUserWallet(walletObj, {user_id: userId})
        await userService.createTransaction(transaction)
        responseData.msg = 'Wallet Update';
        responseData.data = {};
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const updateWalletRefund = async (req, res) => {
    let responseData = {}
    try {
        let {userId, depositeAmount, bonusAmount, winningAmount, message} = req.body;
        let result = await userService.getUserWalletDetailsById({user_id: req.body.userId});
        if (!result) {
            responseData.msg = 'Data not Found';
            return responseHelper.error(res, responseData, 201);
        }
        let walletObj = {
            real_amount: parseFloat(result.real_amount) + parseFloat(depositeAmount),
            bonus_amount: parseFloat(result.bonus_amount) + parseFloat(bonusAmount),
            win_amount: parseFloat(result.win_amount) + parseFloat(winningAmount)
        }
        let totalBetAmount = parseFloat(depositeAmount) + parseFloat(bonusAmount) + parseFloat(winningAmount)
        let transaction = {
            order_id: "MT" + Date.now(),
            user_id: userId,
            type: "CR",
            other_type: 'Refund',
            category: 'Fantasy',
            amount: totalBetAmount
        }
        await userService.updateUserWallet(walletObj, {user_id: userId})
        await userService.createTransaction(transaction)
        let data = {
            sender_user_id: 1,
            receiver_user_id: userId,
            title: 'Fantasy Refund',
            message: message
        };

        await adminService.sendNotification(data);


        responseData.msg = 'Wallet Update';
        responseData.data = {};
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const updateWinWalletForFantasy = async (req, res) => {
    let responseData = {}
    try {
        let {bulk} = req.body;
        for (let i = 0; i < bulk.length; i++) {
            let result = await userService.getUserWalletDetailsById({user_id: bulk[i].userId});
            if (result) {
                let walletObj = {
                    win_amount: parseFloat(result.win_amount) + parseFloat(bulk[i].winningAmount)
                }
                //console.log(walletObj,bulk[i].userId)
                let transaction = {
                    order_id: "MT" + Date.now(),
                    user_id: bulk[i].userId,
                    type: "CR",
                    other_type: 'Winning',
                    category: 'Fantasy',
                    amount: parseFloat(bulk[i].winningAmount)
                }
                //console.log(transaction,bulk[i].userId)
                await userService.updateUserWallet(walletObj, {user_id: bulk[i].userId})
                await userService.createTransaction(transaction)
            }
        }
        responseData.msg = 'Wallet Update';
        responseData.data = {};
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const depositAmount = async(req,res) => {
    let responseData = {}
    try{
        let amount = req.body.amount;
        let userId = req.user.user_id;
        let userD = await userService.getUserDetailsById({user_id: userId});
        if (!userD) {
            responseData.msg = 'user not found';
            return responseHelper.error(res, responseData, 201);
        }
        console.log('v',new Date());
        let mobile = await decryptData(userD.mobile);
        let random = await getRandomAlphanumeric(8);
        let transactionId = "TXN-" + random;

        const email = (userD.email) ? userD.email : 'test@gmail.com';
        const data = {
            mid: process.env.GetepayMid,
            amount: amount,
            merchantTransactionId: transactionId,
            transactionDate: new Date(),
            terminalId: process.env.GeepayTerminalId,
            udf1: mobile,
            udf2: `mailto:${email}`,
            udf3: userD.username,
            udf4: "",
            udf5: "",
            udf6: "",
            udf7: "",
            udf8: "",
            udf9: "",
            udf10: "",
            ru: `${process.env.API_URL}success-payment`,
            callbackUrl: `${process.env.API_URL}api/v1/user/deposit-callback`,
            currency: "INR",
            paymentMode: "ALL",
            bankId: "",
            txnType: "single",
            productType: "IPG",
            txnNote: "Deposit",
            vpa: process.env.GeepayTerminalId,
        };

        getepayPortal(data)
            .then(async ({ paymentUrl, paymentId }) => {
                console.log(paymentId, "Payment URL");
                let transactionData = {
                    order_id: transactionId,
                    payment_id:paymentId,
                    user_id: userId,
                    type: 'CR',
                    other_type: 'Deposit',
                    amount: amount,
                    transaction_status: 'PENDING',
                    reference: 'Deposit',
                    is_deposit:1
                }
                await userService.createTransaction(transactionData);
                responseData.msg = 'Payment link generated';
                responseData.data = {link: paymentUrl};
                return responseHelper.success(res, responseData);
            })
            .catch((error) => {
                responseData.msg = error.message;
                return responseHelper.error(res, responseData, 500);
            });
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }

}

const handleSuccessPayment = async(req, res) => {
    const result = req.body.response;
    var dataitems = decryptEas(
        result,
        process.env.GetepayKey,
        process.env.GetepayIV

    );
    const parsedData = JSON.parse(JSON.parse(dataitems));
    let paymentId = parsedData.getepayTxnId;
    let resultData = await userService.getOneTransactionByQuery({payment_id:paymentId})
    let status = parsedData.txnStatus;
    await userService.updateTransaction({transaction_status: status}, {payment_id: paymentId})
    let userId = resultData.user_id;
    let amount = parsedData.txnAmount;
    if(parsedData.txnStatus=='SUCCESS'){
        const getUserWallet = await userService.getUserWalletDetailsById({
            user_id: userId
        })
        if (!getUserWallet) {
            const walletInfo = {
                user_id: userId,
                real_amount: amount
            }
            await userService.createUserWallet(walletInfo);
        } else {
            const mainBal = +(getUserWallet.real_amount) + (+amount);
            await userService.updateUserWallet({real_amount: mainBal}, {user_wallet_id: getUserWallet.user_wallet_id});
        }
    }
    res.render("success", {
        payment_status: parsedData.txnStatus,
        transaction_id: parsedData.getepayTxnId
    });
}

const checkStatus = async(req,res) => {
    let responseData = {};
    const axios = require('axios');
    let JsonData = JSON.stringify({
        "mid": "108",
        "paymentId": "19164131",
        "referenceNo": "",
        "status": "",
        "terminalId": "Getepay.merchant61062@icici"
    });
    var ciphertext = encryptEas(
        JsonData,
        process.env.GetepayKey,
        process.env.GetepayIV
    );
    var newCipher = ciphertext.toUpperCase();

    var data = JSON.stringify({
        mid: process.env.GetepayMid,
        terminalId: process.env.GeepayTerminalId,
        req: newCipher,
    });
    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://pay1.getepay.in:8443/getepayPortal/pg/invoiceStatus',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': 'JSESSIONID=D436C0E66CEA81127963E742F1C21014'
        },
        data : data
    };

    axios.request(config)
        .then((response) => {
            console.log(JSON.parse(JSON.stringify(response.data)));
            const response1 = JSON.parse(JSON.stringify(response.data));
            var dataitem = decryptEas(
                response1.response,
                process.env.GetepayKey,
                process.env.GetepayIV
            );
            const parsedData = JSON.parse(dataitem);
            console.log('dd',parsedData)
        })
        .catch((error) => {
            console.log(error);
            responseData.msg = error.message;
            return responseHelper.error(res, responseData, 500);
        });

}

const liveData = async (req, res) => {
    let responseData = {};
    try {
        console.log(req.body);
        let gameType = req.body.game_type;
        let userId = req.user.user_id;

        // Get user details
        let userD = await userService.getUserDetailsById({user_id: userId});
        if (!userD) {
            responseData.msg = 'User not found';
            return responseHelper.error(res, responseData, 201);
        }

        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        const dateOnly = today.toISOString().split('T')[0]; // Extracts just the date part

        // Check if user already has an entry for today
        const existingEntry = await userService.getLiveUserByDate({
            user_id: userId,
            livedate: dateOnly, // Use just the date string
            game_type: gameType
        });

        let reqData = {
            user_id: userId,
            game_type: gameType,
            livedate: dateOnly // Store just the date without time
        };

        if (existingEntry) {
            // Update existing entry
            await userService.updateLiveUser(
                reqData,
                {where:{id: existingEntry.id}}
            );
            responseData.msg = 'Your existing request has been updated';
        } else {
            // Create new entry
            await userService.createLiveUsers(reqData);
            responseData.msg = 'Your request has been saved';
        }

        return responseHelper.success(res, responseData);
    } catch (error) {
        console.error("Error in liveData:", error);
        responseData.msg = error.message || 'Internal server error';
        return responseHelper.error(res, responseData, 500);
    }
};

const readNotification = async (req, res) => {
    let responseData = {};
    try {
        let user = req.user;
        let id = req.query.id;
        let query = {notification_id: id}
        await userService.updateNotifications({is_read:1},query);
        responseData.msg = 'Notification Fetch successfully!!!';
        responseData.data = {};
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
module.exports = {
    getBanner,
    sendOtp,
    verifyOtp,
    getProfile,
    updateProfile,
    updateProfileImage,
    changePassword,
    updateKyc,
    addBankAccount,
    addAmount,
    updatePaymentStatus,
    redeem,
    tds,
    getNotification,
    getGameHistory,
    getTransactions,
    getBankAccounts,
    getRedeemList,
    getWallet,
    addAddress,
    getAddressById,
    updateAddress,
    lockBalanceOfUser,
    unlockBalanceOfUser,
    userDetails,
    updateLockBalanceOfUserForTable,
    topUpBalanceOfUser,
    userReferral,
    emailVerificationLinkSent,
    emailVerify,
    deductJoinFees,
    returnDeductedBalance,
    addPrizeMoney,
    getWithdrawlStatus,
    withdrawAmount,
    claimPracticeAmount,
    getUserNameByUserId,
    verifyPanDetail,
    verifyAdhaarDetail,
    verifyAdhaarOtpDet,
    gameTypeListForPrivateTable,
    createGameForPrivate,
    changeGameStatusPrivateRoom,
    getMinMaxBuyInForTable,
    lockBalanceOfUserForClub,
    deductJoinFeesForClub,
    getMinMaxBuyInForTableForClub,
    updateLockBalanceOfUserForTableForClub,
    unlockBalanceOfUserForClub,
    addPrizeMoneyForClub,
    topUpBalanceOfUserForClub,
    deductJoinFeesForRummy,
    logout,
    addWinningAmountForRummy,
    userBonusPercentage,
    get_all_avatars,
    addPokerSusPiciousUser,
    updateWalletForFantasy,
    updateWalletRefund,
    updateWinWalletForFantasy,
    depositAmount,
    handleSuccessPayment,
    checkStatus,
    liveData,
    readNotification
    // savePoolGameHistory
}
