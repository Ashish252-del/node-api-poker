const confg = require("../config/config.json");
const axios = require('axios');
const crypto = require('crypto');
const { encryptEas } = require('./../components/encryptEas');
const { decryptEas } = require('./../components/decryptEas');
const authentication = async () => {
    var FormData = require('form-data');
    var data = new FormData();
    data.append('clientKey', 'isjdnbdhkdnnd');
    data.append('clientSecret', 'iejdndbhdinbdb');

    var config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: process.env.WORLDPAYURL+'generateToken',
        headers: {
            ...data.getHeaders()
        },
        data: data
    };

    const response = await axios.request(config);
    let data1 = JSON.parse(JSON.stringify(response.data));
    console.log("Auth:", response.data);
    return data1.data.access_token;
}
const payIn = async (reqData) => {
    try {
        //let token = await authentication(); // Ensure authentication function works correctly
        // console.log('authToken:', token);
        //
        // if (!token) {
        //     throw new Error("Authentication failed. No token received.");
        // }

        const axios = require('axios');
        let data = JSON.stringify({
            "token": "xxxxxxxxxx",
            "amount": reqData.amount,
            "clientOrderId": reqData.transaction_id,
            "returnUrl": "https://example.com",
            "firstname": reqData.firstname,
            "lastname": reqData.lastname,
            "email": reqData.email,
            "mobile": reqData.mobile
        });

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://ubi.kwicpay.com/api/upi/generateQr',
            headers: {
                'Content-Type': 'application/json'
            },
            data : data
        };

        const response = await axios.request(config);
        console.log("payIn:", response.data);

        return response.data; // Return the response data for further use
    } catch (error) {
        console.error("Error in payment request:", error.response?.data || error.message);
        return {status: 400, data: {message: error.response?.data.message || error.message}};
    }

}

const payInStatus = async (reqData) => {
    try {
        //let token = await authentication(); // Ensure authentication function works correctly
        // console.log('authToken:', token);
        //
        // if (!token) {
        //     throw new Error("Authentication failed. No token received.");
        // }

        const axios = require('axios');
        let data = JSON.stringify({
            "token":"xxxxxxxxx",
            "clientOrderId":reqData.transaction_id
        });

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://ubi.kwicpay.com/api/upi/statusCheck',
            headers: {
                'Content-Type': 'application/json'
            },
            data : data
        };

        const response = await axios.request(config);
        console.log("payIn:", response.data);

        return response.data; // Return the response data for further use
    } catch (error) {
        console.error("Error in payment request:", error.response?.data || error.message);
        return {status: 400, data: {message: error.response?.data.message || error.message}};
    }

}
const payOut = async (reqData) => {
    try {
        let token = await authentication();
        console.log(data);
        //return false;
        var data = new FormData();
        data.append('amount', reqData.amount);
        data.append('reference', reqData.reference);
        data.append('trans_mode', 'imps');
        data.append('account', reqData.account_number);
        data.append('ifsc', reqData.ifsc_code);
        data.append('name', reqData.name);
        data.append('email', reqData.email);
        data.append('mobile', reqData.mobile);
        data.append('address', reqData.address);

        var config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: process.env.WORLDPAYURL+'payoutTransaction',
            headers: {
                ...data.getHeaders()
            },
            data: data
        };

        const response = await axios.request(config);
        console.log("payOut:", response.data);
        return response.data; // Return the response data for further use
    } catch (error) {
        console.error("Error in payment request:", error.response?.data || error.message);
        return {status: 400, data: {message: error.response?.data.message || error.message}};
    }

}

const createOrder = (requestData) => {
    let data = JSON.stringify({
        "customer_details": {
            "customer_id": requestData.customer_id,
            "customer_email": requestData.email,
            "customer_phone": requestData.mobile
        },
        "order_meta": {
            "return_url": confg.APPURL + 'api/v1/auth/return?order_id={order_id}',
            "notify_url": "https://webhook.site/0578a7fd-a0c0-4d47-956c-d02a061e36d3"
        },
        "order_id": requestData.order_id,
        "order_amount": requestData.amount,
        "order_currency": "INR"
    });

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: confg.CASHFREE_URL + '/orders',
        headers: {
            'Accept': 'application/json',
            'x-api-version': '2022-01-01',
            'Content-Type': 'application/json',
            'x-client-id': confg.CASHFREE_CLIENT_ID,
            'x-client-secret': confg.CASHFREE_CLIENT_SECRET
        },
        data: data
    };

    return axios.request(config)
        .then((response) => {
            console.log(JSON.stringify(response.data));
            return JSON.stringify(response.data);
        })
        .catch((error) => {
            return error;
        });

}

const orderDetail = (orderId) => {
    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: confg.CASHFREE_URL + '/orders/' + orderId + '/payments',
        headers: {
            'Accept': 'application/json',
            'x-api-version': '2022-01-01',
            'Content-Type': 'application/json',
            'x-client-id': confg.CASHFREE_CLIENT_ID,
            'x-client-secret': confg.CASHFREE_CLIENT_SECRET
        },
    };

    return axios.request(config)
        .then((response) => {
            console.log(JSON.stringify(response.data));
            return JSON.stringify(response.data);
        })
        .catch((error) => {
            return error;
        });

}

const verifyPanCard = async (data) => {
    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://sandbox.cashfree.com/verification/pan',
        headers: {
            'x-client-id': 'CF27CA1LS11CEA0J94UQNL1G',
            'x-client-secret': '2bb51ba4ff0e2f85ece487da187ecd6565351fa7'
        },
        data: data
    };

    return axios.request(config)
        .then((response) => {
            console.log(JSON.stringify(response.data));
            return JSON.stringify(response.data);
        })
        .catch((error) => {
            console.log(error);
        });

}

const getTransferStatus = async (referId, transferId) => {
    let token = await verifyToken();
    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: confg.CASHFREE_PAYOUT_URL + 'payout/v1/getTransferStatus?referenceId=' + referId + '&transferId=' + transferId,
        headers: {
            'Authorization': 'Bearer ' + token
        }
    };

    return axios.request(config)
        .then((response) => {
            console.log(JSON.stringify(response.data));
            return JSON.parse(JSON.stringify(response.data));
        })
        .catch((error) => {
            console.log(error);
        });

}

const encodeRequest = (payload) => {
    return Buffer.from(JSON.stringify(payload)).toString("base64");
}

const signRequest = (payload) => {
    return crypto
        .createHash("sha256")
        .update(payload)
        .digest("hex");
}

const getepayPortal = (data) => {
    return new Promise((resolve, reject) => {
        const JsonData = JSON.stringify(data);
        var ciphertext = encryptEas(
            JsonData,
            process.env.GetepayKey,
            process.env.GetepayIV
        );
        var newCipher = ciphertext.toUpperCase();
        var myHeaders = {
            "Content-Type": "application/json"
        };
        var raw = JSON.stringify({
            mid: data.mid,
            terminalId: data.terminalId,
            req: newCipher,
        });

        // Make the POST request using axios
        axios.post(`${process.env.GetepayUrl}generateInvoice`, raw, { headers: myHeaders })
            .then((response) => {
                var resultobj = response.data; // Axios returns response as `data`
                var responseurl = resultobj.response;
                var dataitem = decryptEas(
                    responseurl,
                    process.env.GetepayKey,
                    process.env.GetepayIV
                );
                const parsedData = JSON.parse(dataitem);
                console.log('dd', parsedData);
                const paymentUrl = parsedData.paymentUrl;
                const paymentId = parsedData.paymentId;
                resolve({ paymentUrl, paymentId });
            })
            .catch((error) => {
                reject(error);
            });
    });
};

module.exports = {
    createOrder,
    orderDetail,
    payOut,
    payIn,
    payInStatus,
    authentication,
    verifyPanCard,
    getTransferStatus,
    encodeRequest,
    signRequest,
    getepayPortal
}
