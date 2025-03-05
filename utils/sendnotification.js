var firebase = require("firebase-admin");
//
var serviceAccount = require("../firebase/firebase.json");
// console.log(serviceAccount)
firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: "https://poker-time-3528e.firebaseio.com",
});


const sendPushNotification = async (message) => {
    const firebaseToken = message.device_token;
  
    // Ensure the token is valid and not empty
    if (!firebaseToken) {
      throw new Error('Device token is required for sending push notifications');
    }
  
    const payload = {
      token: firebaseToken, // Set token field correctly
      notification: {
        title: message.title,
        body: String(message.message),
      },
      android: {
        priority: 'high',
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };
  
    try {
      const response = await firebase.messaging().send(payload);
      console.log('Successfully sent message:', response);
      return response;
    } catch (error) {
      console.error('Error sending message:', error);
      //throw error;
    }
  };
  
  


module.exports = {
    sendPushNotification
}
