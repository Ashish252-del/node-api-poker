const responseHelper = require('../helpers/customResponse');
const userService = require("../services/userService");
const adminService = require("../services/adminService");
const {comparePassword, encryptPassword, encryptData, decryptData, makeString} = require("../utils");
const {
   createOrder,
   orderDetail,
   addBeneficiary,
   bankWithdraw,
   bankDetailsVerify,
   verifyPanCard,
   getBeneficiaryId
} = require("../utils/payment");
const sendEmail = require("../utils/sendEmail");
//const redisClient = require('../utils/redis');
const config = require("../config/config.json");
const {Op, fn, col} = require("sequelize");
const moment = require('moment');
const {sequelize} = require('../models/index')
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
         ifsc_code: (userBank) ? await decryptData(userBank.ifsc_code) : '',
         account_no: (userBank) ? await decryptData(userBank.account_no) : '',
         bank_address: (userBank) ? userBank.bank_address : ''
      }
      let today = new Date().toISOString().split('T')[0];
      let isClaim = 0;
      if (userWallet && (moment(userWallet.last_claim_date).format('YYYY-MM-DD') == today)) {
         isClaim = 1;
      }
      userWallet.dataValues.is_claim = isClaim;
      getUser.profile_image = (getUser.profile_image) ? req.protocol + '://' + req.headers.host + '/user/' + getUser.profile_image : '';
      getUser.mobile = await decryptData(getUser.mobile);
      getUser.email = (getUser.email) ? await decryptData(getUser.email) : '';
      getUser.dataValues.user_wallet = userWallet;
      getUser.dataValues.pan_number = (userKyc) ? await decryptData(userKyc.id_number) : '';
      getUser.dataValues.bank_details = bankD;
      responseData.msg = 'User Fetch successfully!!!';
      responseData.data = getUser;
      return responseHelper.success(res, responseData);
   } catch (error) {
      responseData.msg = error.message;
      return responseHelper.error(res, responseData, 500);
   }
}

const updateProfile = async (req, res) => {
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

      let fullname, username, dobs, gendar, phone, emails;
      if (typeof reqObj.full_name == 'undefined') {
         fullname = getUser.full_name;
      } else if (reqObj.fullname == '') {
         fullname = getUser.full_name;
      } else {
         fullname = reqObj.full_name;
      }

      // if (typeof reqObj.user_name == 'undefined') {
      //    username = getUser.user_name;
      // } else if (reqObj.user_name == '') {
      //    username = getUser.user_name;
      // } else {
      //    username = reqObj.user_name;
      // }

      if (typeof reqObj.gender == 'undefined') {
         gendar = getUser.gender;
      } else if (reqObj.gender == '') {
         gendar = getUser.gender;
      } else {
         gendar = reqObj.gender;
      }

      if (typeof reqObj.dob == 'undefined') {
         dobs = getUser.dob;
      } else if (reqObj.dob == '') {
         dobs = getUser.dob;
      } else {
         dobs = reqObj.dob;
      }
      let isEmailVerify = getUser.is_email_verified;
      if (typeof reqObj.email == 'undefined') {
         emails = getUser.email;
      } else if (reqObj.email == '') {
         emails = getUser.email;
      } else {
         emails = await encryptData(reqObj.email);
         if (getUser.email && (await decryptData(getUser.email) != reqObj.email)) {
            isEmailVerify = 0;
         }
      }

      let query1 = {user_id: {[Op.ne]: id}, email: emails}
      let checkEmail = await userService.getUserDetailsById(query1);
      if (checkEmail) {
         responseData.msg = 'Email is already registered';
         return responseHelper.error(res, responseData, 201);
      }

      let userData = {
         full_name: fullname,
         email: emails,
         gender: gendar,
         dob: dobs,
         is_email_verified: isEmailVerify
      }


      let userLog = {
         user_id: id,
         device_token: getUser.device_token,
         activity_type: 'update profile',
         old_value: JSON.stringify(getUser),
         new_value: JSON.stringify(userData)
      }
      let updateUser = await userService.updateUserByQuery(userData, query);
      let updateLog = await userService.addUserLog(userLog);

      let saveKyc, panNumber;
      let checkUserKyc = await userService.getUserKycDetailsById({user_id: id});
      if (checkUserKyc) {
         if (typeof reqObj.pan_number == 'undefined') {
            panNumber = checkUserKyc.id_number;
         } else if (reqObj.pan_number == '') {
            panNumber = checkUserKyc.id_number;
         } else {
            panNumber = await encryptData(reqObj.pan_number);
         }
         let kycData = {
            id_number: panNumber
         }
         saveKyc = await userService.updateUserKycByQuery(kycData, {user_kyc_id: checkUserKyc.user_kyc_id});
         await userService.updateUserByQuery({is_kyc_done: 1}, query);
      } else {
         panNumber = (reqObj.pan_number) ? await encryptData(reqObj.pan_number) : '';
         if (panNumber) {
            let kycData = {
               user_id: id,
               id_type: 'Pan Card',
               id_number: panNumber
            }
            saveKyc = await userService.createUserKyc(kycData);
            //await verifyPanCard(reqObj.pan_number);
            await userService.updateUserByQuery({is_kyc_done: 1}, query);
         }
      }


      responseData.msg = 'User Updated successfully!!!';
      responseData.data = {};
      return responseHelper.success(res, responseData);
   } catch (error) {
      responseData.msg = error.message;
      return responseHelper.error(res, responseData, 500);
   }
}

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
         profile = req.file.filename;
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
      // let bankVerify = await addBeneficiary(bankData);
      // if (bankVerify.status == 'ERROR') {
      //    responseData.msg = bankVerify.message;
      //    return responseHelper.error(res, responseData, 201);
      // }
      let save = await userService.createBankAccount(accountData);
      let updateLog = await userService.addUserLog(userLog);
      responseData.msg = 'Account Added Successfully';
      return responseHelper.success(res, responseData);
   } catch (error) {
      responseData.msg = error.message;
      return responseHelper.error(res, responseData, 500);
   }
}

// const addAmount = async (req, res) => {
//    let responseData = {}
//    try {
//       let userId = req.user.user_id;
//       let query = {
//          user_id: userId
//       }
//       let userD = await userService.getUserDetailsById(query);
//       let userWallet = await userService.getUserWalletDetailsById({user_id: userId});
//       if (!userD) {
//          responseData.msg = 'user not found';
//          return responseHelper.error(res, responseData, 201);
//       }
//       let amount, category;
//       if (req.body.amount != '') {
//          amount = req.body.amount;
//       }
//
//       if (req.body.category != '') {
//          category = req.body.category;
//       }
//       let orderId = 'order_' + new Date().getTime();
//       let mobile = await decryptData(userD.mobile);
//       let customerData = {
//          customer_id: makeString(6).toUpperCase(),
//          email: 'amit@yopmail.com',
//          mobile: mobile,
//          amount: amount,
//          order_id: orderId
//       }
//       console.log(customerData);
//       let responseDatas = await createOrder(customerData);
//       let resD = JSON.parse(responseDatas);
//       console.log('d', resD);
//       let openingBalnace, closingBalance, savewalet;
//       if (!userWallet) {
//          openingBalnace = amount;
//          closingBalance = amount;
//       } else {
//          openingBalnace = userWallet.real_amount;
//          closingBalance = (+userWallet.real_amount) + (+amount);
//       }
//
//       let data = {
//          user_id: userId,
//          closing_balance: closingBalance,
//          opening_balance: openingBalnace,
//          type: 'CR',
//          other_type: 'Deposit',
//          amount: amount,
//          category: '',
//          order_id: orderId,
//          transaction_status: "Pending"
//       }
//       let userLog = {
//          user_id: userId,
//          activity_type: 'add amount',
//          old_value: '',
//          new_value: JSON.stringify(data)
//       }
//
//       let save = await userService.createTransaction(data);
//       let updateLog = await userService.addUserLog(userLog);
//       responseData.msg = 'Payment link generated';
//       responseData.data = resD.payment_link;
//       return responseHelper.success(res, responseData);
//    } catch (error) {
//       responseData.msg = error.message;
//       return responseHelper.error(res, responseData, 500);
//    }
// }

const addAmount = async (req, res) => {
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
      let amount, category;
      if (req.body.amount != '') {
         amount = req.body.amount;
      }

      if (req.body.category != '') {
         category = req.body.category;
      }

      let openingBalnace, closingBalance, savewalet;
      if (!userWallet) {
         openingBalnace = amount;
         closingBalance = amount;
         let walletData = {
            user_id: userId,
            real_amount: amount
         }
         savewalet = await userService.createUserWallet(walletData);
      } else {
         openingBalnace = userWallet.real_amount;
         closingBalance = (+userWallet.real_amount) + (+amount);

         let walletData = {
            real_amount: closingBalance
         }
         savewalet = await userService.updateUserWallet(walletData, {user_wallet_id: userWallet.user_wallet_id});
      }

      let data = {
         user_id: userId,
         closing_balance: closingBalance,
         opening_balance: openingBalnace,
         type: 'CR',
         other_type: 'Deposit',
         amount: amount,
         category: category
      }
      let userLog = {
         user_id: userId,
         activity_type: 'add amount',
         old_value: '',
         new_value: JSON.stringify(data)
      }

      let save = await userService.createTransaction(data);
      let updateLog = await userService.addUserLog(userLog);
      responseData.msg = 'Amount Added Successfully';
      return responseHelper.success(res, responseData);
   } catch (err) {
      responseData.msg = err;
      return responseHelper.error(res, responseData, 500);
   }
}

const updateAmount = async (data) => {
   console.log(data)
   try {
      let query = {
         order_id: data,
         transaction_status: 'Pending'
      }
      let responseDatas = await orderDetail(data);
      let resD = JSON.parse(responseDatas);
      console.log('dd', resD);
      if (resD.length > 0 && (resD[0].payment_status == 'SUCCESS')) {
         let userTransaction = await userService.getTransactionData(query);
         if (userTransaction.length > 0) {
            let userId = userTransaction[0].user_id;
            let userWallet = await userService.getUserWalletDetailsById({user_id: userId});
            let openingBalnace, closingBalance, savewalet;
            if (!userWallet) {
               openingBalnace = userTransaction[0].amount;
               closingBalance = userTransaction[0].amount;
               let walletData = {
                  user_id: userId,
                  real_amount: userTransaction[0].amount
               }
               savewalet = await userService.createUserWallet(walletData);
            } else {
               openingBalnace = userWallet.real_amount;
               closingBalance = (+userWallet.real_amount) + (+userTransaction[0].amount);
               let walletData = {
                  real_amount: closingBalance
               }
               savewalet = await userService.updateUserWallet(walletData, {user_wallet_id: userWallet.user_wallet_id});
            }
            let updateData = {
               transaction_status: resD[0].payment_status,
               closingBalance: closingBalance,
               openingBalnace: openingBalnace
            }
            await userService.updateTransaction(updateData, query);
            return resD[0].payment_status;
         } else {
            return 'EXPIRED';
         }

      } else {
         let updateData = {
            transaction_status: 'FAILED'
         }
         await userService.updateTransaction(updateData, query);
         return 'FAILED';
      }
   } catch (error) {
      return 'FAILED';
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
      let totalDeposit = await sequelize.query(`Select SUM(amount) as totaldeposit from transactions where user_id=${userId} AND other_type= 'Deposit' AND DATE(transactions.createdAt) BETWEEN '${fromDate}' AND '${toDate}'`, {type: sequelize.QueryTypes.SELECT});
      console.log('totalDeposit', totalDeposit[0].totaldeposit);
      let totalWinningAmount = await sequelize.query(`Select SUM(win_amount) as totalwinning from game_histories where user_id=${userId} AND DATE(game_histories.createdAt) BETWEEN '${fromDate}' AND '${toDate}'`, {type: sequelize.QueryTypes.SELECT});
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

      if (userWallet && (parseInt(userWallet.real_amount) < parseInt(redemAmount))) {
         responseData.msg = 'Deposit amount is low';
         return responseHelper.error(res, responseData, 201);
      }


      let redemData = {
         user_id: userId,
         account_id: getBankDetails.user_account_id,
         redeem_amount: redemAmount,
         redemption_status: 'Pending',
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
      responseData.msg = 'Your request has been successfully done';
      return responseHelper.success(res, responseData);
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

const getPolicyData = async (req, res) => {
   let responseData = {};
   try {
      let getData = await userService.getPolicyData();
      if (!getData) {
         responseData.msg = 'Policy data not found';
         return responseHelper.success(res, responseData, 201);
      }
      responseData.msg = 'Policy Data';
      responseData.data = getData;
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

const purchaseCoins = async (req, res) => {
   let responseData = {};
   try {
      let id = req.user.user_id;
      let price = req.body.price;
      let coins = req.body.coins;
      let data = {
         user_id: id,
         amount: price,
         type: 'Credit'
      }
      await userService.createTransaction(data);
      let userCoins = coins;
      let getCoins = await userService.getUserWalletDetailsById({user_id: id});
      if (getCoins && getCoins.coins >= 0) {
         userCoins = +getCoins.coins + (+coins);
         await userService.getUserWalletDetailsById({coins: userCoins}, {user_wallet_id: id})
      } else {
         await userService.createUserWallet({user_id: id, coins: userCoins})
      }

      responseData.msg = 'Coin purchased done!!!';
      responseData.data = {};
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

const saveGameHistory = async (req, res) => {
   let responseData = {};
   try {
      let gameId = req.body.game_id;
      let gameName = req.body.game_name;
      let handsRecord = req.body.hands_record;
      let otherInformation = req.body.other_information;
      let status = req.body.status;

      let gameObj = {
         game_type_id: gameId,
         game_name: gameName,
         hands_record: handsRecord,
         other_information: otherInformation,
         status: status
      }
      await userService.saveGameHistory(gameObj);
      responseData.msg = 'Game History Saved!!!';
      responseData.data = {};
      return responseHelper.success(res, responseData);
   } catch (error) {
      responseData.msg = error.message;
      return responseHelper.error(res, responseData, 500);
   }
}

const coinDeduct = async (req, res) => {
   let responseData = {};
   try {
      let coins = req.body.coins;
      let userId = req.user.user_id;

      let getCoins = await userService.getUserWalletDetailsById({user_id: userId});
      if (!getCoins && (getCoins.coins < coins)) {
         responseData.msg = 'You have insufficient coins';
         return responseHelper.success(res, responseData, 201);
      }
      let userObj = {
         user_id: userId,
         type: 'Debit'
      }
      await userService.createTransaction(userObj);

      let historyObj = {
         user_id: userId,
         coins: coins,
         previouscoins: getCoins.coins
      }
      await userService.createCoinHistory(historyObj);
      let coinBalance = +getCoins.coins - (+coins);
      await userService.updateUserWallet({coins: coinBalance}, {user_wallet_id: getCoins.id})
      responseData.msg = 'Coin Deduct done';
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

const getAllAddressByUserId = async (req, res) => {
   let responseData = {};
   try {
      let userId = req.user.user_id;
      let getAddressList = await userService.getAllAddressByUserId({user_id: userId});
      if (getAddressList.length == 0) {
         responseData.msg = 'Address list not found';
         return responseHelper.error(res, responseData, 201);
      }
      responseData.msg = 'Address List';
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
      if (lockedBalanceHistory) {
         throw new Error("User already has unsettled locked balance for this table");
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
      if (amount > balance) {
         throw Error("Locked amount is greater than balance");
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
      lockedBalanceHistory = {
         user_id: userId,
         table_id: tableId,
         locked_amount: amount,
         buy_in_amount: parseFloat("" + amount),
         status: "unsettled",
         round_count: 0,
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
      if (deductBalance > balance) {
         throw Error("Locked amount is greater than balance");
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
      let deductBonusAmount = parseFloat(userWallet.bonus_amount) - parseFloat(bonusAmt);
      let deductAmount = parseFloat(userWallet.real_amount) - parseFloat(betAmount);
      let deductWinAmount = parseFloat(userWallet.win_amount);
      if (deductAmount < 0) {
         deductAmount = deductAmount * -1
         deductWinAmount = parseFloat(userWallet.win_amount) - parseFloat(deductAmount);
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
         lockedBalanceHistory = {
            user_id: userId,
            table_id: tableId,
            locked_amount: amount,
            buy_in_amount: parseFloat("" + amount),
            status: "unsettled",
            round_count: 0,
         }
         await userService.createLockedBalanceHistory(lockedBalanceHistory);
      }
      await userService.updateUserWallet({
         real_amount: deductAmount,
         bonus_amount: deductBonusAmount,
         win_amount: deductWinAmount,
      }, {user_wallet_id: userWallet.user_wallet_id});
      await userService.updateUserWallet({
            real_amount: (parseFloat(userWalletAdmin.real_amount)
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
      let amount = parseFloat(lockBalanceReq.amount);
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
      let lockBalance = parseFloat(userWallet.locked_amount);
      let lockBalanceForThisTable = parseFloat(lockedBalanceHistory.locked_amount);
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
      return {
         status: true,
         message: "Top up balance successfully",
      }
   } catch (error) {
      console.log("Error in top up balance of user ", error);
      return {
         status: false,
         message: error.message
      }
   }
}

const unlockBalanceOfUser = async (unlockBalanceReq) => {
   try {
      let userId = unlockBalanceReq.user_id;
      let amount = parseFloat(unlockBalanceReq.amount);
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
      if (!lockedBalanceHistory) {
         throw new Error("No unsettled locked balance found for this table");
      }
      let lockedAmount = parseFloat(lockedBalanceHistory.locked_amount);
      let userWallet = await userService.getUserWalletDetailsByQuery({user_id: userId});
      if (!userWallet) {
         throw Error("Wallet does not exist");
      }
      let lockBalance = parseFloat(userWallet.locked_amount);
      if (lockedAmount > lockBalance) {
         throw Error("Locked amount is greater than balance");
      }
      let balance;
      if (gameType.startsWith("PRACTICE")) {
         balance = parseFloat(userWallet.practice_amount);
      } else {
         balance = parseFloat(userWallet.real_amount) + parseFloat(userWallet.bonus_amount)
            + parseFloat(userWallet.win_amount);
      }
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
      let profitLoss = amount - parseFloat(lockedBalanceHistory.buy_in_amount);
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
         if (profitLoss > 0) {
            let oldWinAmount = userWallet.win_amount;
            console.log("------------------------------------------------------------------------Old Win Amount from " +
               "DB ", oldWinAmount, " Profit Loss ", profitLoss, " User Wallet ", userWallet);
            if (!oldWinAmount) {
               oldWinAmount = 0;
            }
            oldWinAmount = parseFloat("" + oldWinAmount);
            console.log("------------------------------------------------------------------------Old Win Amount " +
               "after parse", oldWinAmount);
            await userService.updateUserWallet({
                  win_amount: (oldWinAmount + parseFloat("" + profitLoss)),
                  real_amount: (parseFloat(userWallet.real_amount)
                     + parseFloat(lockedBalanceHistory.buy_in_amount)),
                  locked_amount: newLockBalance
               }
               , {user_wallet_id: userWallet.user_wallet_id});
         } else {
            await userService.updateUserWallet({
                  real_amount: (parseFloat(userWallet.real_amount) + parseFloat("" + amount)),
                  locked_amount: newLockBalance
               }
               , {user_wallet_id: userWallet.user_wallet_id});
         }
      }
      await userService.updateLockedBalanceHistory({status: "settled"}
         , {locked_balance_history_id: lockedBalanceHistory.locked_balance_history_id});
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
         throw new Error("No unsettled locked balance found for this table");
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
      await userService.updateLockedBalanceHistory({status: "settled"}
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

const tdsCron = async (req, res) => {
   let userList = await sequelize.query(`Select user_id from users where user_status='1'`, {type: sequelize.QueryTypes.SELECT});
   //userList = userList.rows;
   var todayDate = new Date();
   let fiscalyearLastDate;
   if ((todayDate.getMonth() + 1) <= 3) {
      fiscalyearLastDate = (todayDate.getFullYear() - 1) + "-03-31";
   } else {
      fiscalyearLastDate = todayDate.getFullYear() + "-03-31";
   }

   let fiscalyear;
   if ((todayDate.getMonth() + 1) <= 3) {
      fiscalyear = (todayDate.getFullYear() - 1) + "-04-01";
   } else {
      fiscalyear = todayDate.getFullYear() + "-04-01";
   }
   if (moment(todayDate).format('YYYY-MM-DD') == fiscalyearLastDate) {
      userList.map(async (element) => {
         var userId = element.user_id;
         let orderId = 'order_' + new Date().getTime();
         let userWallet = await userService.getUserWalletDetailsById({user_id: userId});
         let getTdsSetting = await adminService.getTdsSetting();
         let fromDate = (userWallet && userWallet.last_withdraw_date) ? userWallet.last_withdraw_date : fiscalyear;
         let toDate = moment(todayDate).format('YYYY-MM-DD');
         let totalDeposit = await sequelize.query(`Select SUM(amount) as totaldeposit from transactions where user_id=${userId} AND other_type= 'Deposit' AND DATE(transactions.createdAt) BETWEEN '${fromDate}' AND '${toDate}'`, {type: sequelize.QueryTypes.SELECT});
         console.log('totalDeposit', userId, totalDeposit[0].totaldeposit);
         let totalWinningAmount = await sequelize.query(`Select SUM(win_amount) as totalwinning from game_histories where user_id=${userId} AND DATE(game_histories.createdAt) BETWEEN '${fromDate}' AND '${toDate}'`, {type: sequelize.QueryTypes.SELECT});
         console.log('totalWinningAmount', userId, totalWinningAmount[0].totalwinning);

         if ((+totalWinningAmount[0].totalwinning) > (+totalDeposit[0].totaldeposit)) {
            totalWinningAmount = (+totalWinningAmount[0].totalwinning) - (+totalDeposit[0].totaldeposit);
         }
         console.log(totalWinningAmount);
         let tdsAmount = 0;
         if (getTdsSetting && ((+totalWinningAmount) >= (+getTdsSetting.tds_amount_limit))) {
            tdsAmount = parseFloat(totalWinningAmount * (getTdsSetting.tds_percentage / 100)).toFixed(2);
         }
         if (userWallet) {
            let closingBalance = (+userWallet.win_amount) - (+tdsAmount);
            let walletData = {
               win_amount: closingBalance
            }
            console.log('sss', tdsAmount);

            // let savewalet = await userService.updateUserWallet(walletData, {user_wallet_id: userWallet.id});
            //
            // let dataTdsTransactions = {
            //    user_id: userId,
            //    order_id: orderId,
            //    type: 'Debit',
            //    other_type: 'TDS',
            //    amount: tdsAmount
            // }
            // let saveTdsTransactions = await userService.createTransaction(dataTdsTransactions);
         }
      })
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

const deductJoinFeesForLudo = async (deductBalanceReq) => {
   try {
      let userId = deductBalanceReq.user_id;
      let deductBalance = parseFloat(deductBalanceReq.deductBalance);
      let userWallet = await userService.getUserWalletDetailsByQuery({user_id: userId});
      let userWalletAdmin = await userService.getUserWalletDetailsByQuery({user_id: 1});
      if (!userWallet) {
         throw Error("Wallet does not exist");
      }
      let balance = parseFloat(userWallet.real_amount) + parseFloat(userWallet.bonus_amount)
         + parseFloat(userWallet.win_amount);
      if (deductBalance > balance) {
         throw Error("Locked amount is greater than balance");
      }
      let transaction = {
         user_id: userId,
         type: "DR",
         other_type: 'Bet Amount',
         category: 'Ludo',
         amount: deductBalance,
         opening_balance: balance,
         closing_balance: balance - deductBalance,
      }
      let transactionAdmin = {
         user_id: 1,
         type: "CR",
         amount: deductBalance,
         opening_balance: balance,
         closing_balance: balance + deductBalance,
      }
      let getBonus = await userService.getBonusSetting();
      let bonusAmt = 0;
      let betAmount = deductBalance;
      if (getBonus && getBonus.data) {
         bonusAmt = userWallet.bonus_amount * getBonus.data / 100
         betAmount = parseFloat("" + deductBalance) - parseFloat("" + bonusAmt);
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
      }, {user_wallet_id: userWallet.user_wallet_id});

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

const addWinningAmountForLudo = async (addWinBalanceRequest) => {
   try {
      let userId = addWinBalanceRequest.user_id;
      let realAmount = parseFloat(addWinBalanceRequest.realAmount);
      let winAmount = parseFloat(addWinBalanceRequest.winningAmount);
      let tableId = addWinBalanceRequest.tableId;

      let userWallet = await userService.getUserWalletDetailsByQuery({user_id: userId});
      if (!userWallet) {
         throw Error("Wallet does not exist");
      }
      await userService.updateUserWallet({win_amount: winAmount, real_amount: realAmount}, {user_id: userId})
      let orderId = 'order_' + new Date().getTime();
      let transactionDatas = {
         order_id: orderId,
         amount: winAmount,
         type: 'CR',
         other_type: 'Winning',
         category: 'Ludo',
         user_id: userId,
         transaction_status: 'SUCCESS'
      }
      await userService.createTransaction(transactionDatas);

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


const poolDashboard = async (req, res) => {
   let responseData = {};
   try{
      let userId = req.user.user_id;

      if(req.query.type=="GAME"){
         const leaderBoardData =  await userService.getUserByGameWinningInDesc();
         responseData.data = leaderBoardData
      }
      else if(req.query.type=="TOURNAMENT"){
         const leaderBoardData =  await userService.getUserByTournamentWinningInDesc();
         responseData.data = leaderBoardData
      }
      responseData.msg = 'Pool Dashboard';
      return responseHelper.success(res, responseData);
       
   } catch (error) {
       responseData.msg = error.message
       return responseHelper.error(res, responseData, 500);
   }
}


module.exports = {
   getProfile,
   updateProfile,
   updateProfileImage,
   changePassword,
   updateKyc,
   addBankAccount,
   addAmount,
   redeem,
   tds,
   getNotification,
   getPolicyData,
   getGameHistory,
   getTransactions,
   getBankAccounts,
   getRedeemList,
   purchaseCoins,
   getWallet,
   coinDeduct,
   saveGameHistory,
   poolDashboard,
   addAddress,
   getAddressById,
   getAllAddressByUserId,
   updateAddress,
   lockBalanceOfUser,
   updateAmount,
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
   tdsCron,
   getWithdrawlStatus,
   withdrawAmount,
   claimPracticeAmount,
   deductJoinFeesForLudo,
   addWinningAmountForLudo,
   getUserNameByUserId
}
