const CONSTANT = {
    REGX: {
        Email: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        AlphaWithSpecial: /^[a-zA-Z._^%$&#!~@, -]*$/,
        Alphabets: /^[a-zA-Z ]*$/,
        AlphabetsWithDots: /^[a-zA-Z. ]*$/,
        AlphabetsWithComma: /^[a-zA-Z, ]*$/,
        AlphabetsWithSlash: /^[a-zA-Z0-9/.& ]*$/,
        Password:
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[|)(@\<{}>[\]/$!%*?:;.,=&_#~"'`^+-])[A-Za-z\d|)(@\<{}>[\]/$!%*?:;.,=&_#~"'`^+-]{8,}$/,
        checkPassword:  /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
        Pincode: /^[1-9][0-9]{5}$/,
        Alphanumeric: /^[a-zA-Z0-9]*$/,
        PositiveInt: /^\d*$/,
        IFSC: /^([A-Za-z]{4}0[A-Za-z0-9]{6})$/,
        Number: '^[0-9]*$'
    }
}
module.exports = CONSTANT;
