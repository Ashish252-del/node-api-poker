const { validate, ValidationError, Joi } = require("express-validation");

module.exports.getOtherUserProfile = {
  body: Joi.object({
    userId: Joi.number().required(),
  }),
};

module.exports.changePassword = {
  body: Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().required(),
  }),
};
module.exports.forgotPassword = {
  body: Joi.object({
    mobile: Joi.string()
      .trim()
      .required()
      .pattern(new RegExp(/^[0-9]{10}$/))
      .messages({
        "string.pattern.base": "Invalid mobile number",
      }),
    newPassword: Joi.string()
      .trim()
      .required()
      .pattern(
        new RegExp(
          /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{8,15}$/
        )
      )
      .messages({
        "string.pattern.base":
          "Password should be at least 8 characters in length, alpha numeric, 1 upper case and 1 special character.",
      }),
  }),
};

module.exports.register = {
  body: Joi.object({
    mobile: Joi.string()
      .trim()
      .required()
      .pattern(new RegExp(/^[0-9]{10}$/))
      .messages({
        "string.pattern.base": "Invalid mobile number",
      }),
    password: Joi.string()
      .trim()
      .length(8)
      .required()
  }),
};
module.exports.updateUser = {
  body: Joi.object({
    mobile: Joi.string()
      .trim()
      .optional()
      .pattern(new RegExp(/^[0-9]{10}$/))
      .messages({
        "string.pattern.base": "Invalid mobile number",
      }),
    email: Joi.string()
      .email()
      .optional()
      .pattern(
        new RegExp(
          /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        )
      )
      .messages({
        "string.pattern.base": "Invalid email",
      }),
    username: Joi.string().optional(),
    name: Joi.string().optional(),
    profilePic: Joi.string().optional(),
  }),
};
module.exports.registerAdmin = {
  body: Joi.object({
    username: Joi.string().trim().required(),
    mobile: Joi.string()
      .trim()
      .required()
      .pattern(new RegExp(/^[0-9]{10}$/))
      .messages({
        "string.pattern.base": "Invalid mobile number",
      }),
    email: Joi.string()
      .email()
      .required()
      .pattern(
        new RegExp(
          /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        )
      )
      .messages({
        "string.pattern.base": "Invalid email",
      }),
    password: Joi.string()
      .trim()
      .length(8)
      .required()
  }),
};

module.exports.login = {
  body: Joi.object({
    password: Joi.string().required(),
    macAddress: Joi.string().required(),
    device_token:Joi.string().optional(),
    mobile: Joi.string()
      .trim()
      .required()
      .pattern(new RegExp(/^[0-9]{10}$/))
      .messages({
        "string.pattern.base": "Invalid mobile number",
      }),
  }),
};
module.exports.login_with_gmail = {
  body: Joi.object({
    name: Joi.string().required(),
    id:Joi.string().required(),
    image_url: Joi.string().allow('').optional(),
    macAddress: Joi.string().required(),
    device_token:Joi.string().optional(),
    email: Joi.string()
    .email()
    .pattern(
      new RegExp(
        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      )
    )
    .messages({
      "string.pattern.base": "Invalid email",
    }),
  }),
};
module.exports.loginAdmin = {
  body: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
  }),
};

module.exports.sendOTP = {
  params: Joi.object({
    mobile: Joi.string()
      .trim()
      .required()
      .pattern(new RegExp(/^[0-9]{10}$/))
      .messages({
        "string.pattern.base": "Invalid mobile number",
      }),
  }),
};
module.exports.sendEmailOTP = {
  params: Joi.object({
    email: Joi.string()
      .email()
      .optional()
      .pattern(
        new RegExp(
          /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        )
      )
      .messages({
        "string.pattern.base": "Invalid email",
      }),
  }),
};
module.exports.verifySignup = {
  body: Joi.object({
    otp: Joi.string().required(),
    macAddress: Joi.string().required(),
    device_token:Joi.string().required(),
    mobile: Joi.string()
      .trim()
      .required()
      .pattern(new RegExp(/^[0-9]{10}$/))
      .messages({
        "string.pattern.base": "Invalid mobile number",
      }),
    password: Joi.string()
      .trim()
      .required()
  }),
};
module.exports.verifyOTP = {
  body: Joi.object({
    otp: Joi.string().required(),
    macAddress: Joi.string().required(),
    mobile: Joi.string()
      .trim()
      .required()
      .pattern(new RegExp(/^[0-9]{10}$/))
      .messages({
        "string.pattern.base": "Invalid mobile number",
      }),
  }),
};
module.exports.verifyEmailOTP = {
  body: Joi.object({
    otp: Joi.string().required(),
    email: Joi.string()
      .email()
      .required()
      .pattern(
        new RegExp(
          /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        )
      )
      .messages({
        "string.pattern.base": "Invalid email",
      }),
  }),
};
module.exports.checkUserExists = {
  params: Joi.object({
    mobile: Joi.string()
      .trim()
      .required()
      .pattern(new RegExp(/^[0-9]{10}$/))
      .messages({
        "string.pattern.base": "Invalid mobile number",
      }),
  }),
};
module.exports.gameType = {
  body: Joi.object({
    name: Joi.string().required(),
  }),
};

module.exports.buy_shop={
  body:Joi.object({
    user_id:Joi.number().required(),
    goods_id:Joi.number().required(),
    category:Joi.number().required(),
  })
}

module.exports.selected_avatar={
  body:Joi.object({
    user_id:Joi.number().required(),
    avatarId:Joi.number().required(),
  })
}