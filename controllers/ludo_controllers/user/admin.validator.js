const { validate, ValidationError, Joi } = require("express-validation");
module.exports.forgotPassword = {
    body: Joi.object({
      username: Joi.string()
        .trim()
        .required()
        ,
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
