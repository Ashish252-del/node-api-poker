const { body, validationResult } = require("express-validator");
const CONSTANT = require("../../../utils/constant");

//const allowedRoles = CONSTANT.USER_ROLES.filter((v) => v != userRole.ADMIN);
const postLogin = () => {
    return [
        body("email", "please enter email")
            .exists()
            .trim()
            .notEmpty(),
        body("password", "password is not to be empty")
            .exists()
            .notEmpty(),
        body("password", "password length must be minimum 6 characters")
            .exists()
            .isLength({ min: 6 }),
    ]
};

const forgot = () => {
    return [
        body("email", "please enter email")
            .exists()
            .trim()
            .notEmpty()
    ]
};

const postIcon = () => {
    return [
        body("unicode_text", "please enter emojis unicode")
            .exists()
            .trim()
            .notEmpty()
    ]
};

const verifyOtp = () => {
    return [
        body("email", "please enter email")
            .exists()
            .trim()
            .notEmpty(),
        body("otp", "please enter otp")
            .exists()
            .trim()
            .notEmpty()
    ]
};

const resetPassword = () => {
    return [
        body("email", "please enter email")
            .exists()
            .trim()
            .notEmpty(),
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

const postGame = () => {
    return [
        body("name", "Please enter name")
            .exists()
            .notEmpty(),
        body("bet_amount", "Please enter bet amount")
            .exists()
            .notEmpty(),
        body("percentage", "Please enter percentage")
            .exists()
            .notEmpty(),
        body("table_type", "Please enter table type")
            .exists()
            .notEmpty()
    ]
}

const postTournament = () => {
    return [
        body("name", "Please enter tournament name")
            .exists()
            .notEmpty(),
        body("bet_amount", "Please enter bet amount")
            .exists()
            .notEmpty(),
        body("prize", "Please enter prize")
            .exists()
            .notEmpty(),
        body("starting_time", "Please enter starting time")
            .exists()
            .notEmpty(),
        body("ending_time", "Please enter ending time")
            .exists()
            .notEmpty()
    ]
}

const postCategory = () => {
    return [
        body("title", "Please enter Title")
            .exists()
            .notEmpty()
    ]
}

const postGameType = () => {
    return [
        body("game_category_id", "Please choose game type")
            .exists()
            .notEmpty(),
        body("title", "Please enter Title")
            .exists()
            .notEmpty()
    ]
}

const postEditCategory = () => {
    return [
        body("new_title", "Please enter Title")
            .exists()
            .notEmpty()
    ]
}

const postEditGameType = () => {
    return [
        body("new_title", "Please enter Title")
            .exists()
            .notEmpty()
    ]
}

const postRole = () => {
    return [
        body("role_name", "please enter role name")
            .exists()
            .notEmpty()
    ]
}

const validate = (req, res, next) => {
    const errors = validationResult(req)
    if (errors.isEmpty()) {
        return next()
    }
    return res.status(400).json({
        statusCode: 400,
        status: false,
        message: errors.errors[0].msg,
    })
}

const validate201 = (req, res, next) => {
    const errors = validationResult(req)
    if (errors.isEmpty()) {
        return next()
    }
    return res.status(201).json({
        statusCode: 201,
        status: false,
        message: errors.errors[0].msg,
    })
}

const changePassword = () => {
    return [
        body("old_password", "Please enter old password")
            .exists()
            .notEmpty(),
        body("old_password", "Old Password length should be minimum 6 characters")
            .exists()
            .isLength({ min: 6 }),
        body("new_password", "Please enter new password")
            .exists()
            .notEmpty(),
        body("new_password", "New Password length should be minimum 6 characters")
            .exists()
            .isLength({ min: 6 }),
    ]
};

const postAgent = () => {
    return [
        body("name", "Please enter name")
            .exists()
            .trim()
            .notEmpty(),
        body("email", "Please enter email")
            .exists()
            .trim()
            .notEmpty(),
        body("email", "Please enter valid email")
            .exists()
            .matches(CONSTANT.REGX.Email),
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
            .isLength({ min: 10, max: 10 }),
        body("password", "Please enter password")
            .exists()
            .notEmpty(),
        body("password", "Password length should be minimum 8 characters")
            .exists()
            .isLength({ min: 8 }),
        body("password", "Must Contain at least 8 Characters, One Uppercase, One Lowercase, One Number and One Special Case Character")
            .exists()
            .matches(CONSTANT.REGX.checkPassword),
        body("role_id", "Please select role")
            .exists()
            .trim()
            .notEmpty()
    ]
}

const postInfluencer = () => {
    return [
        body("username", "Please enter username")
            .exists()
            .trim()
            .notEmpty(),
        body("full_name", "Please enter name")
            .exists()
            .trim()
            .notEmpty(),

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
            .isLength({ min: 10, max: 10 }),
        body("email", "Please enter email")
            .exists()
            .trim()
            .notEmpty(),
        body("email", "Please enter valid email")
            .exists()
            .matches(CONSTANT.REGX.Email),
        body("gender", "Please select gender")
            .exists()
            .trim()
            .notEmpty(),
        body("dob", "Please choose date of birth")
            .exists()
            .trim()
            .notEmpty(),

    ]
}

const postMission = () => {
    return [
        body("game_category", "Please select Game Category")
            .exists()
            .notEmpty(),
        body("mission_type", "Please enter mission type")
            .exists()
            .notEmpty(),
        body("mission_name", "Please enter mission name")
            .exists()
            .notEmpty(),
        body("mission_count", "Please enter mission count")
            .exists()
            .notEmpty(),
        body("mission_start_date", "Please enter mission start date")
            .exists()
            .notEmpty(),
        body("mission_end_date", "Please enter mission end date")
            .exists()
            .notEmpty()
    ]
}

const postCoupon = () => {
    return [
        body("promocode_type", "Please select promocode type")
            .exists()
            .notEmpty(),
        body("coupon_code", "Please enter coupon code")
            .exists()
            .notEmpty(),
        body("amount_type", "Please select amount type")
            .exists()
            .notEmpty(),
        body("amount", "Please enter value")
            .exists()
            .notEmpty(),
        body("start_date", "Please enter start date")
            .exists()
            .notEmpty(),
        body("end_date", "Please enter end date")
            .exists()
            .notEmpty(),
        body("no_of_usage_user", "Please enter number of usage user")
            .exists()
            .notEmpty(),
        body("min_usage", "Please enter minimum usage")
            .exists()
            .notEmpty(),
        body("max_usage", "Please enter maximum usage")
            .exists()
            .notEmpty()
    ]
}

module.exports = {
    validate,
    postLogin,
    postGame,
    postRole,
    changePassword,
    postCategory,
    postGameType,
    validate201,
    postAgent,
    postEditCategory,
    postEditGameType,
    postMission,
    postCoupon,
    forgot,
    resetPassword,
    postInfluencer,
    verifyOtp,
    postTournament,
    postIcon
};
