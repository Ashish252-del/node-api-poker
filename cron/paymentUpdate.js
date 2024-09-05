const cron = require('node-cron');
const {sequelize} = require('../models/index')
const {Op} = require("sequelize");
const userService = require('../services/userService')
const process = require('process');
const dotenv = require("dotenv");
dotenv.config();
const {encodeRequest, signRequest} = require("../utils/payment");
const axios = require('axios');
module.exports = cron.schedule("*/2 * * * *", async () => {
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
                let data = JSON.stringify({
                    "operatortype": results[i].operator_type,
                    "invoiceNo": results[i].order_id
                });

                let options = {
                    method: 'post',
                    maxBodyLength: Infinity,
                    url: process.env.EZIPAYURL+'collectstatus',
                    headers: {
                        'API-KEY': process.env.EZIPAYAPIKEY,
                        'Content-Type': 'application/json'
                    },
                    data : data
                };

                let response = await axios.request(options);
                response = JSON.parse(JSON.stringify(response.data));
                //console.log(responseData);

                let status = response.message;
                await userService.updateTransaction({transaction_status: status}, {order_id: transactionId})
                if (status == 'Successful' || status == 'SUCCESSFUL') {
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
