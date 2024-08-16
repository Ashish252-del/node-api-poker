const nodemailer = require('nodemailer');
const SibApiSDK = require('sib-api-v3-sdk')
const confg = require("../config/config.json");

// instantiate new SendinBlue API client
const SibClient = SibApiSDK.ApiClient.instance;

// Authentication
SibClient.authentications['api-key'].apiKey = confg.SENDIN_BLU_API_KEY


const transactionEmailApi = new SibApiSDK.TransactionalEmailsApi();

let smtpMailData = new SibApiSDK.SendSmtpEmail();

const sender = {
    email: 'mail.hitrr@gmail.com', // your email address
    name: 'Hittr',
};

const SendWaitlistEmail = async (userData,bodyHtml,subject) => {
    try {
        smtpMailData.sender = sender;

        smtpMailData.to = [{
            email: 'amit@yopmail.com',
            name: userData.full_name
        }];

        smtpMailData.subject = subject;

        smtpMailData.params = {
            'name': userData.full_name
        };

        smtpMailData.htmlContent = bodyHtml;

        // send email
        await transactionEmailApi.sendTransacEmail(smtpMailData)
            .then((data) => {
                console.log(data) // log the email id
            })
            .catch((error) => {
                console.error(error)
                throw new Error(error) // handle errors
            })
    } catch (error) {
        console.log('An error occured...')
        console.error(error)
        throw new Error(error) // handle errors
    }
}
module.exports = {
    SendWaitlistEmail
}

