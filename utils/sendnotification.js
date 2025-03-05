const admin = require("firebase-admin");
const serviceAccount = require("../firebase/firebase.json");

// Ensure Firebase is initialized only once
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://poker-time-3528e.firebaseio.com",
    });
}

const sendPushNotification = async (message) => {
    const firebaseToken = message.device_token;

    if (!firebaseToken) {
        throw new Error("Device token is required for sending push notifications");
    }

    const payload = {
        token: firebaseToken,
        notification: {
            title: message.title,
            body: String(message.message),
        },
        android: {
            priority: "high",
            ttl: 60 * 60 * 24 * 1000, // 1 day in milliseconds
        },
        apns: {
            payload: {
                aps: {
                    sound: "default",
                },
            },
        },
    };

    try {
        const response = await admin.messaging().send(payload);
        console.log("Successfully sent message:", response);
        return response;
    } catch (error) {
        console.error("Error sending message:", error);
        return null;
    }
};

module.exports = { sendPushNotification };
