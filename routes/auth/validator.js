const { body, validationResult  } =  require("express-validator");
const  CONSTANT  =  require("../../utils/constant");

//const allowedRoles = CONSTANT.USER_ROLES.filter((v) => v != userRole.ADMIN);
const postLogin = () => {
    return[
        body("mobile", "Please enter mobile")
            .exists()
            .trim()
            .notEmpty(),
        body("mobile", "Please enter only number")
            .exists()
            .matches(CONSTANT.REGX.Number),
        body("mobile", "Mobile number should be 10 digits")
            .exists()
            .trim()
            .isLength({min: 10, max: 10})
    ]
};

const postSignup = () => {
    return[
        body("mobile", "Please enter mobile")
            .exists()
            .trim()
            .notEmpty(),
        body("mobile", "Please enter only number")
            .exists()
            .matches(CONSTANT.REGX.Number),
        body("mobile", "Mobile number should be 10 digits")
            .exists()
            .trim()
            .isLength({min: 10, max: 10}),
    ]
};

const forgot = () => {
    return[
        body("mobile", "Please enter mobile")
            .exists()
            .trim()
            .notEmpty(),
        body("mobile", "Please enter only number")
            .exists()
            .matches(CONSTANT.REGX.Number),
        body("mobile", "Mobile number should be 10 digits")
            .exists()
            .trim()
            .isLength({min: 10, max: 10}),
    ]
};

const resetPassword = () => {
    return[
        body("mobile", "please enter mobile")
            .exists()
            .trim()
            .notEmpty(),
        body("mobile", "Please enter only number")
            .exists()
            .matches(CONSTANT.REGX.Number),
        body("mobile", "Mobile number should be 10 digits")
            .exists()
            .trim()
            .isLength({min: 10, max: 10}),
        body("password", "Please enter password")
            .exists()
            .notEmpty(),
        body("password", "Password length should be minimum 8 characters")
            .exists()
            .isLength({ min: 8 }),
        body("password", "Must Contain at least 8 Characters, One Uppercase, One Lowercase, One Number and One Special Case Character")
            .exists()
            .matches(CONSTANT.REGX.checkPassword)
    ]
};

const changePassword = () => {
    return[
        body("old_password", "Please enter old password")
            .exists()
            .notEmpty(),
        body("old_password", "Old Password length should be minimum 8 characters")
            .exists()
            .isLength({ min: 8 }),
        body("new_password", "Please enter new password")
            .exists()
            .notEmpty(),
        body("new_password", "New Password length should be minimum 8 characters")
            .exists()
            .isLength({ min: 8 }),
        body("new_password", "Must Contain at least 8 Characters, One Uppercase, One Lowercase, One Number and One Special Case Character")
            .exists()
            .matches(CONSTANT.REGX.checkPassword)
    ]
};

const updateProfile = () => {
    return[
        body("user_name", "Please enter username")
            .exists()
            .notEmpty(),
    ]
};

const postKyc = () => {
    return[
        body("id_type", "Please enter Id Type")
            .exists()
            .notEmpty(),
        body("id_number", "Please enter Id Number")
            .exists()
            .notEmpty(),
    ]
};

const postBank = () => {
    return[
        body("bank_name", "Please enter bank name")
            .exists()
            .notEmpty(),
        body("account_holder_name", "Please enter account holder name")
            .exists()
            .notEmpty(),
        body("ifsc_code", "Please enter ifsc code")
            .exists()
            .notEmpty(),
    ]
};

const postClub = ()=> {
    return[
        body("club_name", "Please enter club name")
            .exists()
            .notEmpty()
    ]
}

const postUnion = ()=> {
    return[
        body("union_name", "Please enter union name")
            .exists()
            .notEmpty()
    ]
}

const validate = (req, res, next) => {
    const errors = validationResult(req)
    if (errors.isEmpty()) {
        return next()
    }
    return res.status(201).json({
        statusCode:201,
        status:false,
        message: errors.errors[0].msg,
    })
}

module.exports = {
    validate,
    postLogin,
    postSignup,
    forgot,
    resetPassword,
    changePassword,
    postKyc,
    postBank,
    postClub,
    postUnion,
    updateProfile
};
