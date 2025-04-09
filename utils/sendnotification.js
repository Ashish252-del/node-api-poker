const admin = require("firebase-admin");
const serviceAccount = require("../firebase/firebase.json");

// Ensure Firebase is initialized only once
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://poker-time-3528e.firebaseio.com",
    });
}

const sendPushNotification = (message) => {
    const firebaseToken = message.device_token;
    const payload = {
        token: firebaseToken,
        notification: {
            title: message.title,
            body: message.message,

        }
    };

    return firebase.messaging().send(payload);
}

module.exports = { sendPushNotification };
