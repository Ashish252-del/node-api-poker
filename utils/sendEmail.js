const nodemailer = require("nodemailer");
const smtpTransport = require("nodemailer-smtp-transport");
const confg = require("../config/config.json");
const sendEmail = async (email, subject, body) => {
    try {
        const transporter = nodemailer.createTransport(
            smtpTransport({
                host: confg.EMAIL_HOST,
                port: 465,
                secure: true, // use TLS
                auth: {
                    user: confg.EMAIL_USERNAME,
                    pass: confg.EMAIL_PASSWORD,
                },
            })
        );

        await transporter.sendMail({
            from: confg.EMAIL_USERNAME,
            to: email,
            subject: subject,
            html: body,
        });

        console.log("email sent sucessfully");
    } catch (error) {
        console.log(error, "email not sent");
    }
};

module.exports = sendEmail;
