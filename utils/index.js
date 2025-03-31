const config = require("../config/config.json");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const axios = require('axios');
const moment = require('moment');
// const redisClient = require('../utils/redis');
const key = crypto
    .createHash('sha512')
    .update(config.SECRET_KEY)
    .digest('hex')
    .substring(0, 32)
const encryptionIV = crypto
    .createHash('sha512')
    .update(config.SECRET_IV)
    .digest('hex')
    .substring(0, 16)

// Encrypt data
const encryptData = (data) => {
    const cipher = crypto.createCipheriv(config.ECNRYPTION_METHOD, key, encryptionIV)
    return Buffer.from(
        cipher.update(data, 'utf8', 'hex') + cipher.final('hex')
    ).toString('base64') // Encrypts data and converts to hex and base64
}

// Decrypt data
const decryptData = (encryptedData)  => {
    const buff = Buffer.from(encryptedData, 'base64')
    const decipher = crypto.createDecipheriv(config.ECNRYPTION_METHOD, key, encryptionIV)
    return (
        decipher.update(buff.toString('utf8'), 'hex', 'utf8') +
        decipher.final('utf8')
    ) // Decrypts data and converts to utf8
}

const makeString = (length) => {
    let result = "";
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};

const OTP = () => {
    let digits = '0123456789';
    let otp = '';
    for (let i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
    //return '123456';
}


let encryptPassword = (password) => {
    let salt = config.bcrypt.saltValue;
    // generate a salt
    return new Promise((resolve, reject) => {
        bcrypt.genSalt(salt, function (err, salt) {
            if (err) reject(err);
            // hash the password with new salt
            bcrypt.hash(password, salt, function (err, hash) {
                if (err) reject(err);
                // override the plain password with the hashed one
                resolve(hash);
            });
        });
    });
};
let createJwtAuthenticationToken = (tokenData) => {
    return jwt.sign(
        tokenData,
        config.jwtTokenInfo.secretKey,
        {
            algorithm: config.jwtTokenInfo.algorithm,
            expiresIn: config.jwtTokenInfo.expiresIn,
            issuer: config.jwtTokenInfo.issuer,
            audience: config.jwtTokenInfo.audience
        });
}
let generateUserToken = (tokenData) => {
    //create a new instance for jwt service
    let token =  createJwtAuthenticationToken(tokenData);
    return token;
};

let comparePassword = (reqPassword, userPassword) => {
    return new Promise((resolve, reject) => {
        //compare password with bcrypt method, password and hashed password both are required
        bcrypt.compare(reqPassword, userPassword, function (err, isMatch) {
            if (err) reject(err);
            resolve(isMatch);
        });
    });
};

let randomPasswordGenerator = (len)  =>
{
    var length = (len)?(len):(10);
    var string = "abcdefghijklmnopqrstuvwxyz"; //to upper
    var numeric = '0123456789';
    var punctuation = '!@#$%^&*()_+~`|}{[]\:;?><,./-=';
    var password = "";
    var character = "";
    var crunch = true;
    while( password.length<length ) {
        entity1 = Math.ceil(string.length * Math.random()*Math.random());
        entity2 = Math.ceil(numeric.length * Math.random()*Math.random());
        entity3 = Math.ceil(punctuation.length * Math.random()*Math.random());
        hold = string.charAt( entity1 );
        hold = (password.length%2==0)?(hold.toUpperCase()):(hold);
        character += hold;
        character += numeric.charAt( entity2 );
        character += punctuation.charAt( entity3 );
        password = character;
    }
    password=password.split('').sort(function(){return 0.5-Math.random()}).join('');
    return password.substr(0,len);
}

let getIPFromAmazon = () => {
    var requestOptions = {
        method: 'GET',
        redirect: 'follow'
    };

    return fetch("https://checkip.amazonaws.com/", requestOptions)
        .then(response => response.text())
        .then(result => result)
        .catch(error => console.log('error', error));
}

// let setUserToken = (user_id, token) => {
//     redisClient.get(user_id.toString(), (err, data) => {
//         if(err) throw err;
//
//         redisClient.set(user_id.toString(), JSON.stringify({token: token}));
//     })
// }

const last7Days = (d) => {
    d = +(d || new Date()), days = [], i=7;
    while (i--) {
        days.push(formatUSDate(new Date(d-=8.64e7)));
    }
    return days;
}

// Return date string in mm/dd/y format
const formatUSDate = (d) => {
    function z(n){return (n<10?'0':'')+ +n;}
    return z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear();
}

const sendSms = async (mobile, otp) => {
    try {
        let msg = `Dear user, Your OTP for login is ${otp}. Do not share with anyone -Finunique Small Pvt. Ltd.`;

        let data = JSON.stringify({
            "route": "q",
            "sender_id": process.env.FAST2SMS_SENDER_ID,
            "message": msg,
            "language": "english",
            "numbers": mobile
        });

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://www.fast2sms.com/dev/bulkV2',
            headers: {
                'Authorization': process.env.FAST2SMS_API_KEY, // Use API key from .env
                'Content-Type': 'application/json'
            },
            data: data
        };

        const response = await axios.request(config);
        console.log("SMS Response:", response.data);
        return JSON.stringify(response.data);
    } catch (error) {
        console.error("SMS Error:", error.response?.data || error.message);
        return { success: false, error: error.message };
    }
};

const encodeRequest = (payload) => {
    return Buffer.from(JSON.stringify(payload)).toString("base64");
}

const signRequest = (payload) => {
    return crypto
        .createHash("sha256")
        .update(payload)
        .digest("hex");
}

const getDates = function(start, end) {
    for(var arr=[],dt=new Date(start); dt<=new Date(end); dt.setDate(dt.getDate()+1)){
        let newD = moment(dt).format('DD/MM/YYYY')
        console.log(newD);
        arr.push(newD);
    }
    return arr;
};

function getRandomAlphanumeric(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
        result += characters[Math.floor(Math.random() * characters.length)];
    }

    return result;
}

const panVerify = async (requestData) => {
    const axios = require('axios');
    const qs = require('qs');
    let data = qs.stringify({
        'requestData': `{"member_id":"7354159939","api_password":"82280","api_pin":"92097","pan_number":"${requestData.pan_number}"}`
    });

    console.log('data',data);
    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://developer.satmatgroup.com/Verification_api/Authenticate/pan_verify',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': 'ci_session=912cd50fdb73abb6e8a91ee45b2972ad0a01c3b7'
        },
        data : data
    };

    return axios.request(config)
        .then((response) => {
            console.log(JSON.stringify(response.data));
            return JSON.parse(JSON.stringify(response.data))
        })
        .catch((error) => {
            return error.response.data;
        });
}

const adhaarVerify = async (requestData) => {
    const axios = require('axios');
    const qs = require('qs');
    let data = qs.stringify({
        'requestData': `{"member_id":"7354159939","api_password":"82280","api_pin":"92097","aadhar_number":"${requestData.adhaar_number}"}`
    });

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://developer.satmatgroup.com/Verification_api/Authenticate/aadhar_otp_generate',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': 'ci_session=3074c1ab2c5b8797f6c070f3e15a1e63e7da595c'
        },
        data : data
    };

    return axios.request(config)
        .then((response) => {
            console.log(JSON.stringify(response.data));
            return JSON.parse(JSON.stringify(response.data))
        })
        .catch((error) => {
            return error.response.data;
        });
}

const verifyAdhaarOtp = async (requestData) => {
    const axios = require('axios');
    const qs = require('qs');
    let data = qs.stringify({
        'requestData': `{"member_id":"7354159939","api_password":"82280","api_pin":"92097","otp":"${requestData.otp}","refid":"${requestData.transaction_id}"}`
    });

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://developer.satmatgroup.com/Verification_api/Authenticate/aadhar_otp_verify',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': 'ci_session=3074c1ab2c5b8797f6c070f3e15a1e63e7da595c'
        },
        data : data
    };

    return axios.request(config)
        .then((response) => {
            console.log(JSON.stringify(response.data));
            return JSON.parse(JSON.stringify(response.data))
        })
        .catch((error) => {
            return error.response.data;
        });
}

module.exports = {
    makeString,
    OTP,
    encryptPassword,
    comparePassword,
    generateUserToken,
    randomPasswordGenerator,
    getIPFromAmazon,
    encryptData,
    decryptData,
    last7Days,
    sendSms,
    encodeRequest,
    signRequest,
    getDates,
    getRandomAlphanumeric,
    panVerify,
    adhaarVerify,
    verifyAdhaarOtp,
    // setUserToken
};
