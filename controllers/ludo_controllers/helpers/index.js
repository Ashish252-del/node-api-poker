const crypto = require("crypto");
module.exports.successResponse = (req, res, data, code = 200) =>
    res.send({
        code,
        success: true,
        data,
    });

module.exports.errorResponse = (
    req,
    res,
    errorMessage = "Something went wrong",
    code = 500,
    error = {}
) =>
    res.status(500).json({
        code,
        errorMessage,
        error,
        data: null,
        success: false,
    });

module.exports.validateEmail = (email) => {
    const re =
        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
};
module.exports.validateMobile = (mobile) => {
    const re = /^[0-9]{10}$/;
    return re.test(mobile);
};
module.exports.validateStrongPassword = (password) => {
    const re =
        /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])(?!.*\s).{8,15}$/;
    return re.test(password);
};

module.exports.validateFields = (object, fields) => {
    const errors = [];
    fields.forEach((f) => {
        if (!(object && object[f])) {
            errors.push(f);
        }
    });
    return errors.length ? `${errors.join(", ")} are required fields.` : "";
};

module.exports.uniqueId = (length = 13) => {
    let result = "";
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};

module.exports.getMD5Hased = (key) => {
    return crypto.createHash("md5").update(key).digest("hex");
};
