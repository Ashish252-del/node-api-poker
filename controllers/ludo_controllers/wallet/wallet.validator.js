const { validate, ValidationError, Joi } = require("express-validation");

module.exports.placeBet = {
  body: Joi.object({
    amount: Joi.number().required(),
  }),
};
module.exports.payout = {
  body: Joi.object({
    amount: Joi.number().required(),
  }),
};
module.exports.refund = {
  body: Joi.object({
    reference: Joi.string().required(),
  }),
};

module.exports.addAmount = {
  body: Joi.object({
    amount: Joi.number().required(),
  }),
};
module.exports.acceptDepositRequest = {
  body: Joi.object({
    transactionId: Joi.string().required(),
    action: Joi.string().required(),

  }),
};