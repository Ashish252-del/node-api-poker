const {default: axios} = require("axios");
const {
    successResponse,
    errorResponse,
    getMD5Hased,
} = require("../../helpers");
const {user, transaction, user_wallet} = require("../../models");
const querystring = require("querystring");
const {TRANSACTION_TYPE} = require("../../helpers/constants");
const {v4: uuidv4} = require("uuid");
const {signRequest, encodeRequest} = require("../../utils/payment");
require("dotenv").config();
const process = require('process');
const { Op  } = require("sequelize");
module.exports.getWallet = async (req, res) => {
    try {
        const userData = await user.findOne({
            where: {id: req.user.id},
        });

        const parameters = `msisdn=${userData.mobile}${process.env.HELLO_PAY_SECRECT}`;
        const hashed = getMD5Hased(parameters);

        const result = await axios.post(
            `${process.env.HELLO_PAY_BASE_URL}/api/wallet`,
            querystring.stringify({
                msisdn: userData.mobile,
                hash: hashed,
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        return successResponse(req, res, result.data);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.placeBet = async (req, res) => {
    const {amount} = req.body;
    const reference = uuidv4();
    const timestamp = Date.now();
    try {
        const userData = await user.findOne({
            where: {id: req.user.id},
        });

        const parameters = `amount=${amount}&msisdn=${userData.mobile}&reference=${reference}&timestamp=${timestamp}${process.env.HELLO_PAY_SECRECT}`;
        const hashed = getMD5Hased(parameters);

        const result = await axios.post(
            `${process.env.HELLO_PAY_BASE_URL}/api/bet`,
            querystring.stringify({
                msisdn: userData.mobile,
                hash: hashed,
                amount,
                reference,
                timestamp,
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );
        const info = {
            transactionId: result.data.transactionId,
            currency: result.data.currency,
            cash: result.data.cash,
            bonus: result.data.bonus,
            reference: reference,
            userId: req.user.id,
            type: TRANSACTION_TYPE.BET,
        };

        await transaction.create(info);
        result.data.reference = reference;
        return successResponse(req, res, result.data);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.payout = async (req, res) => {
    const {amount} = req.body;
    const reference = uuidv4();
    const timestamp = Date.now();
    try {
        const userData = await user.findOne({
            where: {id: req.user.id},
        });

        const parameters = `amount=${amount}&msisdn=${userData.mobile}&reference=${reference}&timestamp=${timestamp}${process.env.HELLO_PAY_SECRECT}`;
        const hashed = getMD5Hased(parameters);

        const result = await axios.post(
            `${process.env.HELLO_PAY_BASE_URL}/api/payout`,
            querystring.stringify({
                msisdn: userData.mobile,
                hash: hashed,
                amount,
                reference,
                timestamp,
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        const info = {
            transactionId: result.data.transactionId,
            currency: result.data.currency,
            cash: result.data.cash,
            bonus: result.data.bonus,
            reference: reference,
            userId: req.user.id,
            type: TRANSACTION_TYPE.DEPOSIT,
        };

        await transaction.create(info);
        result.data.reference = reference;

        return successResponse(req, res, result.data);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.refund = async (req, res) => {
    const {reference} = req.body;
    const timestamp = Date.now();
    try {
        const userData = await user.findOne({
            where: {id: req.user.id},
        });

        const parameters = `msisdn=${userData.mobile}&reference=${reference}&timestamp=${timestamp}${process.env.HELLO_PAY_SECRECT}`;
        const hashed = getMD5Hased(parameters);

        const result = await axios.post(
            `${process.env.HELLO_PAY_BASE_URL}/api/refund`,
            querystring.stringify({
                msisdn: userData.mobile,
                hash: hashed,
                reference,
                timestamp,
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );
        const info = {
            transactionId: result.data.transactionId,
            currency: result.data.currency,
            cash: result.data.cash,
            bonus: result.data.bonus,
            reference: reference,
            userId: req.user.id,
            type: TRANSACTION_TYPE.REFUND,
        };

        await transaction.create(info);
        return successResponse(req, res, result.data);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

module.exports.allTransactions = async (req, res) => {
    try {
        const walletData = await transaction.findAll({});

        return successResponse(req, res, walletData);
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

// module.exports.addAmount = async (req, res) => {
//     //console.log('d');
//     let amount = req.body.amount;
//     let mobile = req.body.mobile;
//     let userId = req.user.id;

//     let userd = await user.findOne({where:{id:userId}})

//     // if(userd && userd.kyc=='No'){
//     //     return errorResponse(req, res, 'Please update kyc details');
//     // }

//     let transactionId = "MT" + Date.now();
//     let walletD = {
//         transactionId: transactionId,
//         userId: userId,
//         currency: 'INR',
//         cash: amount,
//         type: 'DEPOSIT',
//         payment_status: 'Pending',
//         reference: 'Deposit'
//     }
//     await transaction.create(walletD);
//     var data = {
//         "merchantId": process.env.PHONEPE_MERCHANTID,
//         "merchantTransactionId": transactionId,
//         "merchantUserId": "MUID" + Date.now(),
//         "amount": amount + '00',
//         "redirectUrl": process.env.APPURL + '/api/payment-status',
//         "redirectMode": "POST",
//         "callbackUrl": process.env.APPURL + '/api/callback-url',
//         "mobileNumber": mobile,
//         "paymentInstrument": {
//             "type": "PAY_PAGE"
//         }
//     };

//     const base64 = encodeRequest(data);
//     console.log('base64',base64);
//     const sign = base64 + '/pg/v1/pay' + process.env.PHONEPE_SALT_KEY;
//     const X_VERIFY = signRequest(sign) + "###1";
//     console.log('X_VERIFY',X_VERIFY);
//     const options = {
//         method: 'POST',
//         url: process.env.PHONEPE_URL+'/pg/v1/pay',
//         headers: {
//             accept: 'application/json',
//             'Content-Type': 'application/json',
//             'X-VERIFY': X_VERIFY
//         },
//         data: {
//             request: base64
//         }
//     };

//     axios
//         .request(options)
//         .then(function (response) {
//             //console.log(JSON.stringify(response.data));
//             let returnData = JSON.parse(JSON.stringify(response.data));
//             if(returnData.success == true){
//                 let payLink = {
//                     payment_link: returnData.data.instrumentResponse.redirectInfo.url
//                 }
//                 return successResponse(req, res, payLink);
//             }else{
//                 return errorResponse(req, res, 'Something went wrong!!!');
//             }

//         })
//         .catch(function (error) {
//             return errorResponse(req, res, error.message);
//         });
// }


module.exports.updatePaymentStatus = async (transactionId) => {
    try {
        const sign = '/pg/v1/status/'+process.env.PHONEPE_MERCHANTID+'/'+transactionId + process.env.PHONEPE_SALT_KEY;
        const X_VERIFY = signRequest(sign) + "###1";
        // console.log(X_VERIFY);
        // console.log(process.env.PHONEPE_URL+'/pg/v1/status/'+process.env.PHONEPE_MERCHANTID+'/'+transactionId);
        const options = {
            method: 'GET',
            url: process.env.PHONEPE_URL+'/pg/v1/status/'+process.env.PHONEPE_MERCHANTID+'/'+transactionId,
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                'X-VERIFY': X_VERIFY,
                'X-MERCHANT-ID': process.env.PHONEPE_MERCHANTID
            }
        };
        const response = await axios.request(options);
        let responseData = response.data;
        console.log(responseData);
        const walletData = await transaction.findOne({where:{transactionId:transactionId, payment_status:{[Op.ne]: 'SUCCESS'}}});
        if(walletData){
            await transaction.update({payment_status:responseData.data.responseCode}, {where:{transactionId:transactionId}})
            if(responseData.data.responseCode=='SUCCESS'){
                const getUserWallet = await user_wallet.findOne({
                    where: { userId: walletData.userId},
                })

                if(!getUserWallet){
                    const walletInfo = {
                        userId: walletData.userId,
                        mainBalance: walletData.cash
                    }
                    await user_wallet.create(walletInfo);
                }else{
                    const mainBal = parseFloat(getUserWallet.mainBalance) + parseFloat(walletData.cash);
                    await user_wallet.update({ mainBalance: mainBal }, { where: { id: getUserWallet.id } });
                }
            }
        }
        //console.log('ssss',responseData);
        return {status:true, code:responseData.code};
    } catch (error) {
        return {status:false, code:'PAYMENT_ERROR'};
    }
}

module.exports.addAmount = async (req, res) => {
    try {
      let amount = req.body.amount;
      let userId = req.user.id;
  
      if(amount<200){
        return errorResponse(req, res, 'minimun reacharge of 200');
      }
      // Find the user by userId
      let userd = await user.findOne({ where: { id: userId } });
      console.log("userIds",userId);
  
      // Check if user exists and if KYC is required
      if (!userd) {
        return errorResponse(req, res, 'User not found');
      }
  
      // Generate a unique transaction ID
      let transactionId = Date.now().toString();
      console.log("transactionId", transactionId);
  
      // Create a wallet transaction record
      let walletD = {
        transactionId,
        userId: userId,
        currency: 'INR',
        cash: amount,
        type: 'DEPOSIT',
        payment_status: 'Pending',
        reference: 'Deposit'
      };
   
        await transaction.create(walletD);
      // Send a success response
      return res.status(200).json({
        message: 'Amount added successfully',
        transactionId: transactionId,
        amount: amount
      });
  
    } catch (error) {
     
      return errorResponse(req, res, error.message);
    }
  };

module.exports.getPendingTransactions = async (req, res) => {
    try {
      // Find all transactions with status 'Pending' and reference 'Deposit'
      let pendingTransactions = await transaction.findAll({
        where: {
          payment_status: 'Pending',
          reference: 'Deposit'
        }
      });
  
      // Check if there are any pending transactions
      if (pendingTransactions.length === 0) {
        return res.status(404).json({ message: 'No pending transactions found' });
      }
  
  // Send a success response with the pending transactions
  return successResponse(req, res, pendingTransactions);
  
    } catch (error) {
      // Handle errors and send error response
      return errorResponse(req, res, error.message);
    }
  };

  module.exports.acceptDepositRequest = async (req, res) => {
    const { transactionId, action } = req.body;
  
    try {
      // Find the transaction by transactionId
      let txn = await transaction.findOne({ where: { transactionId } });
  
      if (!txn) {
        return errorResponse(req, res, 'Transaction not found', 404);
      }
  
      // Check if the transaction is pending
      if (txn.payment_status !== 'Pending') {
        return errorResponse(req, res, 'Transaction is not pending', 400);
      }
  
      if (action === 'accept') {
        // Find the user's wallet by userId
        let userWallet = await user_wallet.findOne({ where: { userId: txn.userId } });
  
        if (!userWallet) {
          return errorResponse(req, res, 'User wallet not found', 404);
        }
   // Ensure amount is a valid number
   const parsedAmount = parseFloat(txn.cash);
        
        // Update mainBalance
    userWallet.mainBalance = (parseFloat(userWallet.mainBalance) + parsedAmount).toFixed(2); // Ensure toFixed(2) for two decimal places
    await userWallet.save();
  
        // Update the transaction status to 'Success'
        txn.payment_status = 'SUCCESS';
        await txn.save();
  
        return successResponse(req, res, 'Transaction accepted and amount added to user\'s wallet');
      } else if (action === 'reject') {
        // Update the transaction status to 'Rejected'
        txn.payment_status = 'REJECTED';
        await txn.save();
  
        return successResponse(req, res, 'Transaction rejected');
      } else {
        return errorResponse(req, res, 'Invalid action', 400);
      }
    } catch (error) {
      return errorResponse(req, res, error.message);
    }
  }; 