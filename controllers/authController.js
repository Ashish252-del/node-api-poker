const userService = require("../services/userService");
const responseHelper = require('../helpers/customResponse');
const CONSTANT = require("../utils/constant");
const {
   makeString,
   OTP,
   generateUserToken,
   comparePassword,
   encryptPassword,
   randomPasswordGenerator,
   getIPFromAmazon,
   encryptData,
   decryptData,
   sendSms
} = require("../utils");

const userSignup = async (req, res) => {
   let reqObj = req.body;
   let responseData = {};
   try {
      //check if user email is present in the database, then reject the signup request
      let mobile = reqObj.mobile;
      let mobile1 = reqObj.mobile;
      mobile = await encryptData(mobile);
      let checkMobile = await userService.getUserDetailsByQuery({mobile: mobile, is_mobile_verified: 1});

      if (checkMobile.length) {
         responseData.msg = 'Mobile number already registered';
         return responseHelper.error(res, responseData, 201);
      }
      let userDataMobile = await userService.getUserDetailsByQuery({mobile: mobile});
      if (userDataMobile.length) {
        // let otp = OTP();
          let otp = '123456';
      //   await sendSms(mobile1, otp);
         let update = await userService.updateUserByQuery({
            otp: otp,
            check_resend_otp_count_register: 0
         }, {user_id: userDataMobile[0].user_id});
         responseData.msg = 'OTP Sent to your registered mobile number. Please verify!!!';
         return responseHelper.success(res, responseData);
      }

      let device_token = reqObj.device_id;
      let device_type = 'Android';
     // let otp = OTP();
      
      let otp = '123456';
      let pass = await randomPasswordGenerator(8);
      let password = await encryptPassword(pass);
      let referCode = makeString(4).toUpperCase() + mobile1.substr(mobile1.length - 4)
      reqObj.mobile = mobile;
      reqObj.password = password;
      reqObj.otp = otp;
      reqObj.ip = '';
      reqObj.username = makeString(5).toUpperCase();
      reqObj.referral_code = referCode;
      reqObj.device_token = device_token;
      reqObj.device_type = 'Android';
      //create a new user in the database
      let newUser = await userService.createUser(reqObj);
      let userLog = {
         user_id: newUser.user_id,
         activity_type: 'New Registration',
         old_value: '',
         new_value: JSON.stringify(reqObj)
      }
      //await sendSms(mobile1, otp);
      let updateLog = await userService.addUserLog(userLog);

      let walletData = {
         user_id: newUser.user_id,
         real_amount: 100000000
      }
      let savewalet = await userService.createUserWallet(walletData);
      responseData.msg = 'OTP Sent to your registered mobile number. Please verify!!!';
      responseData.data = newUser;
      return responseHelper.success(res, responseData);
   } catch (error) {
      responseData.msg = error.message;
      return responseHelper.error(res, responseData, 500);
   }
}

const userLogin = async (req, res) => {
   let reqObj = req.body;
   let responseData = {};
   let mobile = await encryptData(reqObj.mobile);
   try {
      let device_token = reqObj.device_id;
      let device_type = 'Android';
      let mac_address = reqObj.mac_address;
      let os_version = reqObj.os_version;
      let app_version = reqObj.app_version;
      let userData = await userService.getUserDetailsById({mobile: mobile});

      console.log('========', userData);
      //return false;
      //if no user found, return error
      if (!userData) {
         responseData.msg = 'Mobile Number doesn\'t exists';
         return responseHelper.error(res, responseData, 201);
      }
      if (userData.is_mobile_verified == false) {
         responseData.msg = 'Please verify your account for Sign In';
         return responseHelper.error(res, responseData, 201);
      }

      const getUserWallet = await userService.getUserWalletDetailsById({user_id: userData.user_id})
      if (!getUserWallet) {
         let walletData = {
            user_id: userData.user_id,
            real_amount: 100000000,
            locked_amount: 0
         }
         let savewalet = await userService.createUserWallet(walletData);
      }

      // let device_token = reqObj.device_token;
      // let device_type = reqObj.device_type;
      if (reqObj.type == 1) {
         //let otp = '123456';

         let query = {
            user_id: userData.user_id
         }
         var now = new Date().getTime()
         let time = Math.floor(now / 1000);
         let timeDifference = Math.round((time - userData.resend_otp_time_for_register) / 60);
         let remainingMinutes = 30 - timeDifference;
         if (remainingMinutes == 1) {
            var minLabel = 'minute';
         } else {
            var minLabel = 'minutes';
         }
         if (userData.check_resend_otp_count_login == 3 && timeDifference < 30) {
            responseData.data = {resendCount: 0};
            await userService.updateUserByQuery({
               otp: null
            }, query);
            responseData.msg = "You have cross OTP send limit.Please try after " + remainingMinutes + " " + minLabel;
            responseData.type = reqObj.type;
            return responseHelper.errorType(res, responseData, 201);
         } else if (userData.check_resend_otp_count_login == 3 && timeDifference > 30) {
           // let otp = OTP();
            let otp = '123456';

           // await sendSms(reqObj.mobile, otp)
            let otpCount = 1;
            await userService.updateUserByQuery({
               otp: otp,
               check_resend_otp_count_login: 0,
               resend_otp_time_for_login: time
            }, query);
            responseData.msg = 'OTP Sent to registered mobile number';
            responseData.type = reqObj.type;
            responseData.data = {resendCount: 2, otp: otp};
            return responseHelper.successWithType(res, responseData);
         }
        // let otp = OTP();
         let otp = '123456';
        // await sendSms(reqObj.mobile, otp)
         let userD = {
            otp: otp,
            check_resend_otp_count_login: 0
         }
         let resendCount;
         if (userData.check_resend_otp_count_login == 0) {
            resendCount = 3
         } else if (userData.check_resend_otp_count_login == 1) {
            resendCount = 2
         } else if (userData.check_resend_otp_count_login == 2) {
            resendCount = 1
         } else if (userData.check_resend_otp_count_login == 3) {
            resendCount = 0
         } else {
            resendCount = 2
         }
         let updateUser = await userService.updateUserByQuery(userD, query)
         responseData.msg = 'OTP Sent to registered mobile number';
         responseData.type = reqObj.type;
         responseData.data = {resendCount: resendCount, otp: otp};
         return responseHelper.successWithType(res, responseData);
      } else {
         let reqPassword = reqObj.password;
         console.log(reqPassword);
         
         let userPassword = userData.password;
         console.log(userPassword);
         if (!userData.password) {
            responseData.msg = 'Invalid Password';
            return responseHelper.error(res, responseData, 201);
         }
         let isPasswordMatch = await comparePassword(reqPassword, userPassword);
         //console.log(isPasswordMatch);
         //if password does not match, return error
         if (!isPasswordMatch) {
            responseData.msg = 'Invalid Password';
            return responseHelper.error(res, responseData, 201);
         }
         //compare req body password and user password,

         let tokenData = {
            sub: userData.user_id,
            id: userData.user_id,
            mobile: userData.mobile
         };
         let jwtToken
         // if(userData.token){
         //     jwtToken = userData.token;
         // }else{
         jwtToken = generateUserToken(tokenData);
         //}
         //setUserToken(userData.id,jwtToken);
         //console.log('access_token', JSON.stringify({token: jwtToken}));
         let query = {
            user_id: userData.user_id
         }
         let userD = {
            last_login: new Date(),
            token: jwtToken,
            device_token: device_token,
            device_type: device_type,
         }
         let updateUser = await userService.updateUserByQuery(userD, query)
         let loginLogs = {
            user_id: userData.user_id,
            device_token: device_token,
            device_type: device_type,
            mac_address: mac_address,
            os_version: os_version,
            app_version: app_version,
            ip: ''
         }
         await userService.createLoginLog(loginLogs);
         userData.token = jwtToken;
         userData.mobile = await decryptData(userData.mobile)
         responseData.msg = 'You are login successfully';
         responseData.type = reqObj.type;
         responseData.data = userData
         return responseHelper.successWithType(res, responseData);
      }
   } catch (error) {
      responseData.msg = error.message;
      return responseHelper.error(res, responseData, 500);
   }
}

const verifyOtp = async (req, res) => {
   let mobile = req.body.mobile;
   mobile = await encryptData(mobile);
   let otp = req.body.otp;
   let type = req.body.type;
   let device_token = req.body.device_id;
   let device_type = 'Android';
   let mac_address = req.body.mac_address;
   let os_version = req.body.os_version;
   let app_version = req.body.app_version;
   let responseData = {};
   try {
      let userData;
      let updateObj;
      let query;
      userData = await userService.getUserDetailsById({mobile: mobile});
      if(type==1){
         updateObj = {
            is_mobile_verified: true,
            otp: null,
            check_resend_otp_count_register: 0,
            device_token: device_token,
            device_type: device_type,
         };
      }else{
         updateObj = {
            is_mobile_verified: true,
            otp: null,
            check_resend_otp_count_login: 0,
            device_token: device_token,
            device_type: device_type,
         };
      }

      query = {
         mobile: mobile
      }

      if (!userData) {
         responseData.msg = "no user found";
         return responseHelper.error(res, responseData, 201);
      }

      if (userData.otp != otp) {
         responseData.msg = "Invalid OTP";
         return responseHelper.error(res, responseData, 201);
      }

      if (userData.otp == null && userData.is_mobile_verified == true) {
         responseData.msg = "Please verify OTP!!!";
         return responseHelper.error(res, responseData, 201);
      }

      let updatedUser = await userService.updateUserByQuery(updateObj, query);
      if (!updatedUser) {
         responseData.msg = 'failed to verify user';
         return responseHelper.error(res, responseData, 201);
      }
      let tokenData = {
         sub: userData.user_id,
         id: userData.user_id,
         mobile: userData.mobile
      };
      //generate jwt token with the token obj
      let jwtToken
      // if(userData.token){
      //     jwtToken = userData.token;
      // }else{
      jwtToken = generateUserToken(tokenData);
      let updateToken = {
         last_login: new Date(),
         token: jwtToken,
      };
      let updatedToken = await userService.updateUserByQuery(updateToken, query);
      //}
      //setUserToken(userData.id, jwtToken);
      console.log('access_token', jwtToken);
      if (type == 1) {
         let loginLogs = {
            user_id: userData.user_id,
            device_token: device_token,
            device_type: device_type,
            mac_address: mac_address,
            os_version: os_version,
            app_version: app_version,
            ip: ''
         }
         await userService.createLoginLog(loginLogs);
      }
      userData.token = jwtToken;
      userData.mobile = await decryptData(userData.mobile);
      responseData.type = type;
      responseData.msg = 'Your account has been successfully verified!';

      responseData.data = userData;


      return responseHelper.successWithType(res, responseData);
   } catch (error) {
      responseData.msg = error.message;
      return responseHelper.error(res, responseData, 500);
   }
}

const forgotPassword = async (req, res) => {
   let reqObj = req.body;
   let responseData = {};
   let mobile = await encryptData(reqObj.mobile);
   console.log(mobile);
   try {
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
      let otp = '123456';
     // let otp = OTP();
      //await sendSms(reqObj.mobile, otp)
      console.log('otp', otp);
      let resendCount;
      if (userData.check_resend_otp_count == 0) {
         resendCount = 3
      } else if (userData.check_resend_otp_count == 1) {
         resendCount = 2
      } else if (userData.check_resend_otp_count == 2) {
         resendCount = 1
      } else if (userData.check_resend_otp_count == 3) {
         resendCount = 0
      } else {
         resendCount = 2
      }
      await userService.updateUserByQuery({otp: otp}, query);
      responseData.msg = 'OTP has been sent successfully to your registered mobile number!!!';
      responseData.data = {resendCount: resendCount, otp: otp}
      return responseHelper.success(res, responseData);
   } catch (error) {
      responseData.msg = error.message;
      return responseHelper.error(res, responseData, 201);
   }
}

const resendOtp = async (req, res) => {
   var now = new Date().getTime()
   let time = Math.floor(now / 1000);
   let reqObj = req.body;
   let responseData = {};
   let mobile = await encryptData(reqObj.mobile);
   try {
      let type = reqObj.type;
      let userData;
      let query;

      userData = await userService.getUserDetailsById({mobile: mobile});
      let timeDifference = Math.round((time - userData.resend_otp_time_for_register) / 60);
      let timeDifference1 = Math.round((time - userData.resend_otp_time) / 60);
      console.log(timeDifference);
      query = {
         mobile: mobile
      }
      if (!userData) {
         responseData.msg = "no user found";
         return responseHelper.error(res, responseData, 201);
      }
      let otp = '123456';
     // let otp = OTP();
      let resendCount;
      if (type == 1) {
         let remainingMinutes = 30 - timeDifference;
         if (remainingMinutes == 1) {
            var minLabel = 'minute';
         } else {
            var minLabel = 'minutes';
         }
         console.log(type);
         if (userData.check_resend_otp_count_register == 3 && timeDifference < 30) {
            console.log('ff', 1);
            await userService.updateUserByQuery({
               otp: null
            }, query);
            resendCount = 0;
            responseData.data = {resendCount: resendCount};
            responseData.msg = "You have cross OTP send limit.Please try after " + remainingMinutes + " " + minLabel;
            responseData.type = type;
            return responseHelper.errorType(res, responseData, 201);
         } else if (userData.check_resend_otp_count_register == 3 && timeDifference > 30) {
           // await sendSms(reqObj.mobile, otp)
            console.log('ff', 2);
            let otpCount = 1;
            await userService.updateUserByQuery({
               otp: otp,
               check_resend_otp_count_register: otpCount,
               resend_otp_time_for_register: time
            }, query);
            if (otpCount == 1) {
               resendCount = 2
            } else if (otpCount == 2) {
               resendCount = 1
            } else if (otpCount == 3) {
               resendCount = 0
            } else {
               resendCount = 2
            }
         } else {
           // await sendSms(reqObj.mobile, otp)
            console.log('ff', 3);
            let otpCount = +(userData.check_resend_otp_count_register) + 1;
            await userService.updateUserByQuery({
               otp: otp,
               check_resend_otp_count_register: otpCount,
               resend_otp_time_for_register: time
            }, query);
            if (otpCount == 1) {
               resendCount = 2
            } else if (otpCount == 2) {
               resendCount = 1
            } else if (otpCount == 3) {
               resendCount = 0
            } else {
               resendCount = 2
            }
         }
      }
      if(type==2){
         let remainingMinutes = 30 - timeDifference;
         if (remainingMinutes == 1) {
            var minLabel = 'minute';
         } else {
            var minLabel = 'minutes';
         }
         console.log(type);
         if (userData.check_resend_otp_count_login == 3 && timeDifference < 30) {
            console.log('ff', 1);
            await userService.updateUserByQuery({
               otp: null
            }, query);
            resendCount = 0;
            responseData.data = {resendCount: resendCount};
            responseData.msg = "You have cross OTP send limit.Please try after " + remainingMinutes + " " + minLabel;
            responseData.type = type;
            return responseHelper.errorType(res, responseData, 201);
         } else if (userData.check_resend_otp_count_login == 3 && timeDifference > 30) {
          //  await sendSms(reqObj.mobile, otp)
            console.log('ff', 2);
            let otpCount = 1;
            await userService.updateUserByQuery({
               otp: otp,
               check_resend_otp_count_login: otpCount,
               resend_otp_time_for_login: time
            }, query);
            if (otpCount == 1) {
               resendCount = 2
            } else if (otpCount == 2) {
               resendCount = 1
            } else if (otpCount == 3) {
               resendCount = 0
            } else {
               resendCount = 2
            }
         } else {
            //await sendSms(reqObj.mobile, otp)
            console.log('ff', 3);
            let otpCount = +(userData.check_resend_otp_count_login) + 1;
            await userService.updateUserByQuery({
               otp: otp,
               check_resend_otp_count_login: otpCount,
               resend_otp_time_for_login: time
            }, query);
            if (otpCount == 1) {
               resendCount = 2
            } else if (otpCount == 2) {
               resendCount = 1
            } else if (otpCount == 3) {
               resendCount = 0
            } else {
               resendCount = 2
            }
         }
      }
      if (type == 3) {
         let remainingMinutes1 = 30 - timeDifference1;
         if (remainingMinutes1 == 1) {
            var minLabel1 = 'minute';
         } else {
            var minLabel1 = 'minutes';
         }

         if (userData.check_resend_otp_count == 3 && timeDifference1 < 30) {
            await userService.updateUserByQuery({
               otp: null
            }, query);
            resendCount = 0;
            responseData.data = {resendCount: resendCount};
            responseData.msg = "You have cross OTP send limit.Please try after " + remainingMinutes1 + " " + minLabel1;
            responseData.type = type;
            return responseHelper.errorType(res, responseData, 201);
         } else if (userData.check_resend_otp_count == 3 && timeDifference1 >= 30) {

           // await sendSms(reqObj.mobile, otp)
            let otpCount = 1;
            await userService.updateUserByQuery({
               otp: otp,
               check_resend_otp_count: otpCount,
               resend_otp_time: time
            }, query);
            if (otpCount == 1) {
               resendCount = 2
            } else if (otpCount == 2) {
               resendCount = 1
            } else if (otpCount == 3) {
               resendCount = 0
            } else {
               resendCount = 2
            }
         } else {

           // await sendSms(reqObj.mobile, otp)
            let otpCount = +(userData.check_resend_otp_count) + 1;
            await userService.updateUserByQuery({
               otp: otp,
               check_resend_otp_count: otpCount,
               resend_otp_time: time
            }, query);
            if (otpCount == 1) {
               resendCount = 2
            } else if (otpCount == 2) {
               resendCount = 1
            } else if (otpCount == 3) {
               resendCount = 0
            } else {
               resendCount = 2
            }
         }
      }
      //let otp = OTP();


      responseData.msg = "Otp Send Successfully";
      responseData.type = type;
      responseData.data = {resendCount: resendCount, otp: otp};
      return responseHelper.successWithType(res, responseData);
   } catch (error) {
      responseData.msg = error.message;
      return responseHelper.error(res, responseData, 500);
   }
}

const verifyOtpForForgotPassword = async (req, res) => {
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
         otp: null,
         check_resend_otp_count: 0
      };
      query = {
         mobile: mobile
      }

      if (!userData) {
         responseData.msg = "no user found";
         return responseHelper.error(res, responseData, 201);
      }

      if (userData.otp != otp) {
         responseData.msg = "Invalid OTP";
         return responseHelper.error(res, responseData, 201);
      }

      let updatedUser = await userService.updateUserByQuery(updateObj, query);
      if (!updatedUser) {
         responseData.msg = 'failed to verify user';
         return responseHelper.error(res, responseData, 201);
      }
      responseData.msg = 'Your account has been successfully verified!!!';
      return responseHelper.success(res, responseData);
   } catch (error) {
      responseData.msg = error.message;
      return responseHelper.error(res, responseData, 500);
   }
}

const resetPassword = async (req, res) => {
   let mobile = req.body.mobile;
   mobile = await encryptData(mobile);
   let type = req.body.type;
   let newPassword = req.body.password;
   let responseData = {};
   try {
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
      let encryptedPassword = await encryptPassword(newPassword);
      let updateUserQuery = {
         password: encryptedPassword,
      };

      let updatedUser = await userService.updateUserByQuery(updateUserQuery, query)
      if (!updatedUser) {
         responseData.msg = "failed to reset password";
         return responseHelper.error(res, responseData, 201);
      }

      responseData.msg = "Password updated successfully! Please Login to continue";
      responseData.type = type;
      return responseHelper.successWithType(res, responseData);
   } catch (error) {
      responseData.msg = error.message;
      return responseHelper.error(res, responseData, 500);
   }
}
const guestLogin = async (req, res) => {
   let reqObj = req.body;
   let responseData = {};
   try {
      //check if user email is present in the database, then reject the signup request
      let device_token = reqObj.device_token;
      let device_id = reqObj.device_id;
      console.log("device_token is =============>", device_token);
      if(!device_id) throw new Error ("device_id is required !!")
      let user = await userService.getUserDetailsByDeviceToken({device_id: device_id});
      // console.log("user--->",user);
      // if(user){
      //    user = user.dataValues;
      // }
      if(user) {
         const getUserWallet = await userService.getUserWalletDetailsById({user_id: user.user_id})
         if(user.device_token != device_token){ 
            let query = {
               user_id: user.user_id
            }
            let userD = {
               device_token: device_token,
            }
            let updateUser = await userService.updateUserByQuery(userD, query)
         }
         if (!getUserWallet) {
            let walletData = {
               user_id: user.user_id,
               real_amount: 100000000,
               locked_amount: 0
            }
            let savewalet = await userService.createUserWallet(walletData);
         }
      }
      if(!user) {
        // let referCode = makeString(4).toUpperCase() + mobile1.substr(mobile1.length - 4)
         reqObj.username = makeString(5).toUpperCase();
       //  reqObj.referral_code = referCode;
         reqObj.device_id = device_id;
         reqObj.device_token = device_token;
         reqObj.device_type = 'Android';
         //create a new user in the database
          user = await userService.createUser(reqObj);
         let userLog = {
            user_id: user.user_id,
            activity_type: 'New Registration',
            old_value: '',
            new_value: JSON.stringify(reqObj)
         }
         let updateLog = await userService.addUserLog(userLog);
         let walletData = {
            user_id: user.user_id,
            real_amount: 100000000
         }
         let savewalet = await userService.createUserWallet(walletData);
      }
      let tokenData = {
         sub: user.user_id,
         id: user.user_id,
         device_token: user.device_token
      };

      let jwtToken = generateUserToken(tokenData);      
      let query = {
         user_id: user.user_id
      }
      let userD = {
         last_login: new Date(),
         token: jwtToken,
         device_token: device_token,
         device_type: 'Android',
      }
      let updateUser = await userService.updateUserByQuery(userD, query)
      let device_type = 'Android';
      let mac_address = reqObj.mac_address;
      let os_version = reqObj.os_version;
      let app_version = reqObj.app_version;
      let loginLogs = {
         user_id: user.user_id,
         device_token: device_token,
         device_type: device_type,
         mac_address: mac_address,
         os_version: os_version,
         app_version: app_version,
         ip: ''
      }
      await userService.createLoginLog(loginLogs);
      user.token = jwtToken;
      responseData.msg = 'You are login successfully';
      responseData.data = user;
      return responseHelper.success(res, responseData);
   } catch (error) {
      console.log("error in gueslogin", error)
      responseData.msg = error.message;
      return responseHelper.error(res, responseData, 500);
   }
}
module.exports = {
   userSignup,
   userLogin,
   forgotPassword,
   resendOtp,
   verifyOtp,
   resetPassword,
   verifyOtpForForgotPassword,
   guestLogin
};
