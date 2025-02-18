const confg = require("../config/config.json");
const axios = require('axios');
const crypto = require('crypto');
const authentication = async () => {
    var FormData = require('form-data');
    var data = new FormData();
    data.append('clientKey', '');
    data.append('clientSecret', '');

    var config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api.worldpayme.com/api/v1.1/generateToken',
        headers: {
            ...data.getHeaders()
        },
        data : data
    };

    axios(config)
        .then(function (response) {
            console.log('auth',JSON.stringify(response.data));
            let data = JSON.parse(JSON.stringify(response.data));
            return data.data.token;
        })
        .catch(function (error) {
            console.log(error);
        });
}
const verifyToken = async () => {
    let token = await authentication();
    console.log('authToken',token);
    var FormData = require('form-data');
    var data = new FormData();
    data.append('amount', '');
    data.append('reference', '');
    data.append('name', '');
    data.append('mobile', '');
    data.append('email', '');

    var config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api.worldpayme.com/api/v1.1/createUpiIntent',
        headers: {
            'token': token,
        },
        data : data
    };

    axios(config)
        .then(function (response) {
            console.log(JSON.stringify(response.data));
        })
        .catch(function (error) {
            console.log(error);
        });

}
const addBeneficiary = async (data) => {
    let token  = await verifyToken();
    console.log('verifyToken',token);
    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: confg.CASHFREE_PAYOUT_URL+'payout/v1/addBeneficiary',
        headers: {
            'Authorization': 'Bearer '+token,
            'Content-Type': 'text/plain'
        },
        data : data
    };

    return axios.request(config)
        .then((response) => {
            console.log('add',JSON.stringify(response.data));
            return JSON.parse(JSON.stringify(response.data));
        })
        .catch((error) => {
            return error
        });

}

const getBeneficiaryId = async (bankAccount, ifscCode) => {
    let token  = await verifyToken();
    console.log('verifyToken',token);
    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: confg.CASHFREE_PAYOUT_URL+'payout/v1/getBeneId?bankAccount='+bankAccount+'&ifsc='+ifscCode,
        headers: {
            'Authorization': 'Bearer '+token,
            'Content-Type': 'text/plain'
        }
    };

    return axios.request(config)
        .then((response) => {
            console.log('add',JSON.stringify(response.data));
            return JSON.parse(JSON.stringify(response.data));
        })
        .catch((error) => {
            return error
        });

}

const bankDetailsVerify = async (data) => {
    let token  = await verifyToken();
    console.log('verifyToken',token);
    console.log(confg.CASHFREE_PAYOUT_URL+'payout/v1/asyncValidation/bankDetails?name='+data.name+'&phone='+data.phone+'&bankAccount='+data.account_no+'&ifsc='+data.ifsc_code);
    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: confg.CASHFREE_PAYOUT_URL+'payout/v1/asyncValidation/bankDetails?name='+data.name+'&phone='+data.phone+'&bankAccount='+data.account_no+'&ifsc='+data.ifsc_code,
        headers: {
            'Authorization': 'Bearer '+token
        }
    };

    return axios.request(config)
        .then((response) => {
            console.log(JSON.stringify(response.data));
            return JSON.parse(JSON.stringify(response.data));
        })
        .catch((error) => {
            console.log(error);
            return error;
        });
}

const bankWithdraw = async (data) => {
    let token  = await verifyToken();
    console.log(data);
    //return false;
    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: confg.CASHFREE_PAYOUT_URL+'payout/v1/requestTransfer',
        headers: {
            'Authorization': 'Bearer '+token
        },
        data : JSON.stringify(data)
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

const createOrder = (requestData) => {
    let data = JSON.stringify({
        "customer_details": {
            "customer_id": requestData.customer_id,
            "customer_email": requestData.email,
            "customer_phone": requestData.mobile
        },
        "order_meta": {
            "return_url": confg.APPURL+'api/v1/auth/return?order_id={order_id}',
            "notify_url": "https://webhook.site/0578a7fd-a0c0-4d47-956c-d02a061e36d3"
        },
        "order_id": requestData.order_id,
        "order_amount": requestData.amount,
        "order_currency": "INR"
    });

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: confg.CASHFREE_URL+'/orders',
        headers: {
            'Accept': 'application/json',
            'x-api-version': '2022-01-01',
            'Content-Type': 'application/json',
            'x-client-id': confg.CASHFREE_CLIENT_ID,
            'x-client-secret': confg.CASHFREE_CLIENT_SECRET
        },
        data : data
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
        url: confg.CASHFREE_URL+'/orders/'+orderId+'/payments',
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

const verifyPanCard = async(data) => {
    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://sandbox.cashfree.com/verification/pan',
        headers: {
            'x-client-id': 'CF27CA1LS11CEA0J94UQNL1G',
            'x-client-secret': '2bb51ba4ff0e2f85ece487da187ecd6565351fa7'
        },
        data : data
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

const getTransferStatus = async(referId, transferId) => {
    let token  = await verifyToken();
    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: confg.CASHFREE_PAYOUT_URL+'payout/v1/getTransferStatus?referenceId='+referId+'&transferId='+transferId,
        headers: {
            'Authorization': 'Bearer '+token
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

module.exports = {
    createOrder,
    orderDetail,
    addBeneficiary,
    verifyToken,
    authentication,
    bankWithdraw,
    bankDetailsVerify,
    verifyPanCard,
    getTransferStatus,
    getBeneficiaryId,
    encodeRequest,
    signRequest
}
