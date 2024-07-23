var firebase = require("firebase-admin");
//
var serviceAccount = require("../firebase/firebase.json");
// console.log(serviceAccount)
firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: "https://poker-time-3528e.firebaseio.com",
});


const sendPushNotification = (message) => {
    const firebaseToken = message.device_token;
    const payload = {
        notification: {
            title: message.title,
            body: message.body,
            imageUrl: message.body
        }
    };

    const options = {
        priority: 'high',
        timeToLive: 60 * 60 * 24, // 1 day
    };

    return firebase.messaging().sendToDevice(firebaseToken, payload, options);
}


module.exports = {
    sendPushNotification
}
