const cron = require('node-cron');
const {sequelize} = require('../models/index')
const {Op} = require("sequelize");
const userService = require('../services/userService')
const process = require('process');
const dotenv = require("dotenv");
dotenv.config();
const {encodeRequest, signRequest} = require("../utils/payment");
const axios = require('axios');
module.exports = cron.schedule("*/15 * * * *", async () => {
    console.log("---------------------");
    console.log("running a task every 15 Minutes");
    let d = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
    var date =  d.getFullYear() + "-" + ("0"+(d.getMonth()+1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2)+ " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
    console.log(date);
    try {
        let results = await userService.getTransactionData({transaction_status: 'TXN_PENDING',is_deposit:1});
        if (results.length) {
            for (let i = 0; i < results.length; i++) {
                let transactionId = results[i].order_id;
                let userId = results[i].user_id;
                let amount = results[i].amount;
                const sign = '/pg/v1/status/' + process.env.PHONEPE_MERCHANTID + '/' + transactionId + process.env.PHONEPE_SALT_KEY;
                const X_VERIFY = signRequest(sign) + "###1";
                // console.log(X_VERIFY);
                // console.log(process.env.PHONEPE_URL+'/pg/v1/status/'+process.env.PHONEPE_MERCHANTID+'/'+transactionId);
                const options = {
                    method: 'GET',
                    url: process.env.PHONEPE_URL + '/pg/v1/status/' + process.env.PHONEPE_MERCHANTID + '/' + transactionId,
                    headers: {
                        accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-VERIFY': X_VERIFY,
                        'X-MERCHANT-ID': process.env.PHONEPE_MERCHANTID
                    }
                };
                const response = await axios.request(options);
                let responseData = response.data;
                //console.log(responseData);

                let status;
                if(responseData.code == 'TXN_AUTO_FAILED' || responseData.code=='PAYMENT_ERROR' || responseData.code=='PAYMENT_DECLINED'){
                    status = 'FAILED';
                }else if(responseData.code == 'PAYMENT_SUCCESS'){
                    status = 'SUCCESS';
                }else if(responseData.code == 'PAYMENT_PENDING'){
                    status = 'TXN_PENDING';
                }else{
                    status = 'FAILED';
                }
                await userService.updateTransaction({transaction_status: status}, {order_id: transactionId})
                if (responseData.data.responseCode == 'SUCCESS') {
                    const getUserWallet = await userService.getUserWalletDetailsById({
                        user_id: userId
                    })
                    if (!getUserWallet) {
                        const walletInfo = {
                            user_id: userId,
                            deposit: amount
                        }
                        await userService.createUserWallet(walletInfo);
                    } else {
                        const mainBal = +(getUserWallet.deposit) + (+amount);
                        await userService.updateUserWallet({deposit: mainBal}, {user_wallet_id: getUserWallet.user_wallet_id});
                    }
                }
            }
        }
    } catch (error) {
        console.log(error);
    }
});
