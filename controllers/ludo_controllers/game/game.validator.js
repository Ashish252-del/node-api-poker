const { validate, ValidationError, Joi } = require("express-validation");

module.exports.gameType = {
  body: Joi.object({
    name: Joi.string().required(),
    gameTypeId: Joi.number().required().label("Game Type"),
    varientId: Joi.number().required().label("Varient Type"),
    commision: Joi.number().optional().label("Commission for game"),
    cap: Joi.number().optional().label("Cap Amount"),
  }),
};
module.exports.game = {
  body: Joi.object({
    name: Joi.string().required(),
    gameTypeId: Joi.number().required().label("Game Type"),
    varientId: Joi.number().required().label("Varient Type"),
    commision: Joi.number().optional().label("Commission for game"),
    cap: Joi.number().optional().label("Cap Amount"),
  }),
};
module.exports.getGame = {
  query: Joi.object({
    type: Joi.number().required().label("Game Type"),
    varient: Joi.number().required().label("Varient Type"),
    player_type:Joi.number().required().label("Player Type"),
  }),
};

module.exports.create_gametype = {
  body: Joi.object({
    name: Joi.string().required(),
    status: Joi.number().required(),
    icon: Joi.string().optional(),
    description: Joi.string().optional(),
  }),
};
module.exports.create_gameVarient = {
  body: Joi.object({
    name: Joi.string().required(),
    value: Joi.number().required()
  }),
};
module.exports.update_status = {
  params: Joi.object({
    id: Joi.number().required(),
  }),
  body: Joi.object({
    status: Joi.number().required(),
  }),
};

module.exports.create_game = {
  body: Joi.object({
    cap: Joi.string().optional(),
    comission: Joi.number().required(),
    status: Joi.number().required(),
    varient_id: Joi.number().required(),
    type_id: Joi.number().required(),
    player_type:Joi.string().required()
    
  }),
};

module.exports.update_game = {
  body: Joi.object ({
    commission:Joi.number().required(),
    name:Joi.string().required()
  })
}
module.exports.create_tournament = {
  body : Joi.object ({
    gameTypeId:Joi.number().required(),
    playerSize:Joi.number().required(),
    winningAmount:Joi.number().required(),
    entryFee:Joi.number().required(),
    scheduledDate:Joi.required(),
    title:Joi.string().required(),
   playerType:Joi.number().required()
  })
}

module.exports.create_shop = {
  body: Joi.object({
    shop_name: Joi.string().required(),
  }),
};
module.exports.update_shop = {
  body: Joi.object({
    id: Joi.number().required(),
    shop_name: Joi.string().required(),
    // image:Joi.string().optional(),
  }),
};

module.exports.goods = {
  body: Joi.object({
    category: Joi.number().required(),
    goods_title:Joi.string().required(),
    price:Joi.number().required(),
  }),
};
module.exports.update_goods = {
  body: Joi.object({
    id:Joi.number().required(),
    category: Joi.number().required(),
    goods_title:Joi.string().required(),
    price:Joi.number().required(),
    image:Joi.string().optional(),
  }),
};
module.exports.add_avatar = {
  body: Joi.object({
    image:Joi.string().optional(),
  }),
};
module.exports.add_web_url = {
  body: Joi.object({
    name:Joi.string().required(),
    web_url:Joi.string().required(),
    is_payment_url:Joi.number().optional(),
  }),
};
module.exports.update_web_url = {
  body: Joi.object({
    id:Joi.number().required(),
    new_web_url:Joi.string().required(),
  }),
};
module.exports.create_reward={
  body: Joi.object({
    rewardName:Joi.string().required(),
    rewardCoins:Joi.number().required(),
    day:Joi.number().required(),
  }),
}

module.exports.update_reward={
  body: Joi.object({
    id:Joi.number().required(),
    rewardName:Joi.string().required(),
    rewardCoins:Joi.number().required(),
    day:Joi.number().required(),
  }),
}

module.exports.addBankDetails={
  body: Joi.object({
    bankName:Joi.string().required(),
    bankAccountNumber:Joi.number().required(),
    fullName:Joi.string().required(),
  }),
}
module.exports.updateBankDetails={
  body: Joi.object({
    id:Joi.number().required(),
    bankName:Joi.string().required(),
    bankAccountNumber:Joi.number().required(),
    fullName:Joi.string().required(),
  }),
}

module.exports.add_withdrawls_fee={
  body: Joi.object({
    withdrawl_rate:Joi.number().required(),
    min_withdrawl:Joi.number().required(),
    max_withdrawl:Joi.number().required(),
  }),
}
module.exports.updateWithdrawlsFee={
  body: Joi.object({
    id:Joi.number().required(),
    withdrawl_rate:Joi.number().required(),
    min_withdrawl:Joi.number().required(),
    max_withdrawl:Joi.number().required(),
  }),
}





