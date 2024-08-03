const express = require("express");
const { validate } = require("express-validation");

// no work has been done in wallet because it will be central 
const userWallet = require("../controllers/wallet/wallet.controller");
const walletValidator = require("../controllers/wallet/wallet.validator");

const router = express.Router();

//= ===============================
// API routes
//= ===============================
router.get("/testone", (req, res) => {
  res.send("ok");
});
router.post("/add-amount",validate(walletValidator.addAmount), userWallet.addAmount)
router.get("/get-deposit-request",userWallet.getPendingTransactions)
router.post("/approve-deposit-request", validate(walletValidator.acceptDepositRequest),userWallet.acceptDepositRequest)

router.get("/", userWallet.getWallet);
router.post("/bet", validate(walletValidator.placeBet), userWallet.placeBet);
router.post("/payout", validate(walletValidator.payout), userWallet.payout);
router.post("/refund", validate(walletValidator.refund), userWallet.refund);
router.get("/transactions", userWallet.allTransactions);

module.exports = router;
