const paymentStatus = require('./paymentUpdate'); // commented by mysekf
// const deactivateTournament = require('./deactivateTournament'); // commented by myself 
const unlockBalance = require('./userWalletCrons');
paymentStatus.start();
//deactivateTournament.start();


//require('./profile-level').start();