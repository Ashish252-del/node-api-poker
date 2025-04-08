const cron = require('node-cron');
const {sequelize} = require('../models/index')
const {Op} = require("sequelize");
const userService = require('../services/userService')
const process = require('process');
const dotenv = require("dotenv");
dotenv.config();
const {encodeRequest, signRequest} = require("../utils/payment");
const axios = require('axios');
const {encryptEas} = require("../components/encryptEas");
const {decryptEas} = require("../components/decryptEas");
module.exports = cron.schedule("* * * * *", async () => {
    console.log("---------------------");
    console.log("running a task every 1 Minutes");
    let d = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
    var date =  d.getFullYear() + "-" + ("0"+(d.getMonth()+1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2)+ " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
    console.log(date);
    try {
        let results = await userService.getTransactionData({transaction_status: 'PENDING',is_deposit:1});
        if (results.length) {
            for (let i = 0; i < results.length; i++) {
                let paymentId = results[i].payment_id;
                let userId = results[i].user_id;
                let amount = results[i].amount;
                let JsonData = JSON.stringify({
                    "mid": process.env.GetepayMid,
                    "paymentId": paymentId,
                    "referenceNo": "",
                    "status": "",
                    "terminalId": process.env.GeepayTerminalId
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
                    url: `${process.env.GetepayUrl}invoiceStatus`,
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': 'JSESSIONID=D436C0E66CEA81127963E742F1C21014'
                    },
                    data : data
                };

                let response = await axios.request(config);
                let response1 = JSON.parse(JSON.stringify(response.data));
                var dataitem = decryptEas(
                    response1.response,
                    process.env.GetepayKey,
                    process.env.GetepayIV
                );
                const parsedData = JSON.parse(dataitem);

                let status = parsedData.txnStatus;
                await userService.updateTransaction({transaction_status: status}, {payment_id:  paymentId})
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
            }
        }
    } catch (error) {
        console.log(error);
    }
});
