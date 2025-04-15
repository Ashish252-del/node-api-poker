const adminService = require("../../services/adminService");
const userService = require("../../services/userService");
const responseHelper = require('../../helpers/customResponse');
const { SendWaitlistEmail } = require('../../helpers/sendEmail');
const {
    makeString,
    OTP,
    generateUserToken,
    comparePassword,
    encryptPassword,
    randomPasswordGenerator,
    decryptData,
    last7Days,
    encryptData,
    getIPFromAmazon,
    encodeRequest,
    signRequest,
    getDates
} = require("../../utils");
const { Op, fn, col } = require("sequelize");
const { Sequelize } = require('sequelize');
const { sequelize } = require('../../models/index')
const moment = require('moment');
const config = require("../../config/config.json");
const { sendPushNotification } = require('../../utils/sendnotification');
const getEmitter = require("../../helpers/redis");
const { getRedisClient } = require("../../helpers/redis");
const { bankWithdraw } = require("../../utils/payment");
const tournamentService = require("../../services/poolTournamentServices");

const getPagination = (page) => {
    page = page - 1;
    const limit = 15;
    const offset = page ? page * limit : 0;
    return { limit, offset };
};

const adminLogin = async (req, res) => {
    let responseData = {};
    let reqObj = req.body;
    try {
        let emailMobile = reqObj.email;
       
        let mac_address = req.body.mac_address;
        let os_version = req.body.os_version;
        let app_version = req.body.app_version;
        let userData = await adminService.geAdminDetailsById({ email: emailMobile, admin_status: '1' });

        //console.log('========', userData);
        //return false;
        //if no user found, return error
        // if(!userData && (await decryptData(getUser.email) != reqObj.email))
        if (!userData ) {
            responseData.msg = 'Email Id doesn\'t exists';
            return responseHelper.error(res, responseData, 201);
        }
        //Role CHeck
        let checkRole = await adminService.geAdminDetailsById({ admin_id: userData.admin_id });
        if (!checkRole) {
            responseData.msg = 'role not exits exists';
            return responseHelper.error(res, responseData, 201);
        }

        let reqPassword = reqObj.password;
        let userPassword = userData.password;

        //compare req body password and user password,
        let isPasswordMatch = await comparePassword(reqPassword, userPassword);
        console.log(isPasswordMatch);
        //if password does not match, return error
        if (!isPasswordMatch) {
            responseData.msg = 'Credential does not match';
            return responseHelper.error(res, responseData, 201);
        }
        let tokenData = {
            id: userData.admin_id,
            email: userData.email
        };
        //generate jwt token with the token obj
        let jwtToken = generateUserToken(tokenData);
        let loginLogs = {
            admin_id: userData.user_id,
            mac_address: mac_address,
            os_version: os_version,
            app_version: app_version,
            ip: ''
        }
        let getModules = await adminService.getModules();
        getModules = getModules.map(async (element, i) => {
            let getAssignData = await adminService.getPermissionQuery({
                role_id: userData.role_id,
                permission_module_id: element.module_id
            });
            element.dataValues.module_access = (getAssignData) ? getAssignData.module_access : '';
            element.dataValues.add_access = (getAssignData) ? getAssignData.add_access : false;
            element.dataValues.edit_access = (getAssignData) ? getAssignData.edit_access : false;
            element.dataValues.view_access = (getAssignData) ? getAssignData.view_access : false;
            element.dataValues.delete_access = (getAssignData) ? getAssignData.delete_access : false;
            return element;
        })
        getModules = await Promise.all(getModules);
        let getRoles = await adminService.getRoleByQuery({ role_id: userData.role_id });
        //await adminService.createLoginLog(loginLogs);
        responseData.msg = 'You are login successfully';
        responseData.data = {
            id: userData.user_id,
            full_name: userData.full_name,
            email: userData.email,
            mobile: userData.mobile,
            role_id: userData.role_id,
            role_name: (getRoles) ? getRoles.roles : '',
            token: jwtToken,
            permissions: (getModules) ? getModules : ''
        };
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const getProfile = async (req, res) => {
    let responseData = {};
    try {
        let admin_id = req.user.admin_id;
        let getList = await adminService.geAdminDetailsById({ admin_id: admin_id });
        if (getList.length == 0) {
            responseData.msg = 'No Data found';
            return responseHelper.error(res, responseData, 201);
        }
        let getModules = await adminService.getModules();
        getModules = getModules.map(async (element, i) => {
            let getAssignData = await adminService.getPermissionQuery({
                role_id: getList.role_id,
                permission_module_id: element.module_id
            });
            element.dataValues.module_access = (getAssignData) ? getAssignData.module_access : '';
            element.dataValues.add_access = (getAssignData) ? getAssignData.add_access : false;
            element.dataValues.edit_access = (getAssignData) ? getAssignData.edit_access : false;
            element.dataValues.view_access = (getAssignData) ? getAssignData.view_access : false;
            element.dataValues.delete_access = (getAssignData) ? getAssignData.delete_access : false;
            return element;
        })
        getModules = await Promise.all(getModules);
        getList.dataValues.permissions = (getModules) ? getModules : '';
        responseData.msg = 'Admin Profile';
        responseData.data = getList;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const adminActivity = async (req, res) => {
    let responseData = {};
    try {
        let user_id = req.params.id;
        let getList = await adminService.getAdminUserActivityLogs({ admin_activity_log_id: user_id });
        if (getList.length == 0) {
            responseData.msg = 'No Data found';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'Admin Activity Log Details';
        responseData.data = getList;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const addRole = async (req, res) => {
    let responseData = {};
    try {
        const { title } = req.body;
        let checkRole = await adminService.getRoleByQuery({ roles: title, role_status: { [Op.ne]: '2' } });
        if (checkRole) {
            responseData.msg = 'Already Added';
            return responseHelper.error(res, responseData, 201);
        }
        let roleObj = {
            roles: title,
            added_by: req.user.admin_id
        }
        await adminService.createRole(roleObj);
        responseData.msg = 'Role Added Done';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const roleList = async (req, res) => {
    let responseData = {};
    try {
        let getRoles = await adminService.getAllRoles({ role_status: { [Op.ne]: '2' } });
        if (getRoles.length == 0) {
            responseData.msg = 'Roles not found';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'Roles List';
        responseData.data = getRoles;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const activeRoleList = async (req, res) => {
    let responseData = {};
    try {
        let getRoles = await adminService.getAllRoles({ role_status: '1' });
        if (getRoles.length == 0) {
            responseData.msg = 'Roles not found';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'Roles List';
        responseData.data = getRoles;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const changeRoleStatus = async (req, res) => {
    let responseData = {};
    try {
        const { id, status } = req.body;
        let checkRole = await adminService.getRoleByQuery({ role_id: id });
        if (!checkRole) {
            responseData.msg = 'Role not found';
            return responseHelper.error(res, responseData, 201);
        }
        let roleObj = {
            role_status: status,
            updated_by: req.user.admin_id
        }
        await adminService.updateRole(roleObj, { role_id: id });
        responseData.msg = 'Role Status Updated';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const roleById = async (req, res) => {
    let responseData = {};
    try {
        let getRoles = await adminService.getRoleByQuery({ role_id: req.params.id });
        if (!getRoles) {
            responseData.msg = 'Role not found';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'Roles List';
        responseData.data = getRoles;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const updateRoleById = async (req, res) => {
    let responseData = {};
    try {
        const { id, title } = req.body;
        let checkRole = await adminService.getRoleByQuery({ roles: title, role_status: { [Op.ne]: '2' } });
        if (checkRole) {
            responseData.msg = 'Already Added';
            return responseHelper.error(res, responseData, 201);
        }
        let roleObj = {
            roles: title,
            updated_by: req.user.admin_id
        }
        await adminService.updateRole(roleObj, { role_id: id });
        responseData.msg = 'Role Updated Done';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const addGameCategory = async (req, res) => {
    let responseData = {};
    try {
        const { title } = req.body;
        let checkRole = await adminService.getGameCategoryByQuery({ name: title, game_category_status: { [Op.ne]: '2' } });
        if (checkRole) {
            responseData.msg = 'Already Added';
            return responseHelper.error(res, responseData, 201);
        }
        let roleObj = {
            name: title,
            type: title.toLowerCase(),
            added_by: req.user.admin_id
        }
        await adminService.addGameCategory(roleObj);
        responseData.msg = 'Game Type Added Done';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const gameCategoryList = async (req, res) => {
    let responseData = {};
    try {
        let getRoles = await adminService.getAllGameCategory();
        if (getRoles.length == 0) {
            responseData.msg = 'Game Type found';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'Game Type List';
        responseData.data = getRoles;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const gameCategoryById = async (req, res) => {
    let responseData = {};
    try {
        let getCatgeory = await adminService.getGameCategoryByQuery({ game_category_id: req.params.id });
        if (!getCatgeory) {
            responseData.msg = 'Type not found';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'Type List';
        responseData.data = getCatgeory;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const updategameCategoryById = async (req, res) => {
    let responseData = {};
    try {
        const { id, new_title } = req.body;
        let checkCategory = await adminService.getGameCategoryByQuery({
            name: new_title,
            game_category_status: { [Op.ne]: '2' }
        });
        if (checkCategory) {
            responseData.msg = 'Already Added';
            return responseHelper.error(res, responseData, 201);
        }
        let catObj = {
            name: new_title,
            updated_by: req.user.admin_id
        }
        await adminService.updateGameCategory(catObj, { game_category_id: id });
        responseData.msg = 'Game type Updated Done';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const changeGameCategoryStatus = async (req, res) => {
    let responseData = {};
    try {
        const { id, status } = req.body;
        let checkRole = await adminService.getGameCategoryByQuery({ game_category_id: id });
        if (!checkRole) {
            responseData.msg = 'Game type not found';
            return responseHelper.error(res, responseData, 201);
        }
        let roleObj = {
            game_category_status: status,
            updated_by: req.user.admin_id
        }
        await adminService.updateGameCategory(roleObj, { game_category_id: id });
        responseData.msg = 'Status Updated';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const getActiveGameCategoryList = async (req, res) => {
    let responseData = {};
    try {
        let getResult = await adminService.getAllGameCategory({ game_category_status: '1' });
        if (getResult.length == 0) {
            responseData.msg = 'Game Type Data not found';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'Game List';
        responseData.data = getResult;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const changeGameTypeStatus = async (req, res) => {
    let responseData = {};
    try {
        const { id, status } = req.body;
        let checkRole = await adminService.getGameTypeByQuery({ game_type_id: id });
        if (!checkRole) {
            responseData.msg = 'Game Type not found';
            return responseHelper.error(res, responseData, 201);
        }
        let roleObj = {
            game_type_status: status,
            updated_by: req.user.admin_id
        }
        await adminService.updateGameType(roleObj, { game_type_id: id });
        responseData.msg = 'Status Updated';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const changeGameStatus = async (req, res) => {
    let responseData = {};
    try {
        const { id, status } = req.body;

        // Validate input
        if (!id || !status) {
            responseData.msg = 'Invalid input';
            return responseHelper.error(res, responseData, 400);
        }

        // Check if game exists
        let checkRole = await adminService.getGameByQuery({ game_id: id });
        if (!checkRole) {
            responseData.msg = 'Game not found';
            return responseHelper.error(res, responseData, 404);
        }

        // Update game status
        let roleObj = {
            game_status: status,
            updated_by: req.user.admin_id
        };
        console.log("roleObj-->",roleObj);

        const data=await adminService.updateGameById(roleObj, { game_id: id });

        responseData.msg = 'Status Updated';
        responseData.data=data;
        return responseHelper.success(res, responseData);
    } catch (error) {
        console.error('Error updating game status:', error); // Log the error
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};


const addGameType = async (req, res) => {
    let responseData = {};
    try {
        const { game_category_id, title } = req.body;
        let checkRole = await adminService.getGameTypeByQuery({
            name: title,
            game_category_id: game_category_id,
            game_type_status: { [Op.ne]: '2' }
        });
        if (checkRole) {
            responseData.msg = 'Already Added';
            return responseHelper.error(res, responseData, 201);
        }
        let gameFieldJsondata = req.body.game_fields_json_data
        let gameField = [];
        if (gameFieldJsondata.length > 0) {
            for (var i = 0; i < gameFieldJsondata.length; i++) {
                let slug = gameFieldJsondata[i].field_name.toLowerCase();
                let splitSlug = slug.split(" ");
                let joinSlug = splitSlug.join("_");
                let datas = {
                    field_name: gameFieldJsondata[i].field_name,
                    field_type: gameFieldJsondata[i].field_type,
                    field_key: joinSlug,
                    is_required: gameFieldJsondata[i].field_required,
                }
                gameField.push(datas);
            }
        }
        let roleObj = {
            name: title,
            game_category_id: game_category_id,
            game_fields_json_data: JSON.stringify(gameField),
            added_by: req.user.admin_id
        }
        let save = await adminService.addGameType(roleObj);
        responseData.msg = 'Game Category Added Done';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const gameTypeList = async (req, res) => {
    let responseData = {};
    try {
        let categoryId = req.query.category_id;
        let getTypes;
        if (categoryId) {
            getTypes = await adminService.getAllGameType({ game_category_id: categoryId, game_type_status: '1' });
        } else {
            getTypes = await adminService.getAllGameType({ game_type_status: { [Op.ne]: '2' } });
        }

        if (getTypes.length == 0) {
            responseData.msg = 'Game Category not found';
            return responseHelper.error(res, responseData, 201);
        }
        getTypes = getTypes.map(async (element, i) => {
            let getCategoryData = await adminService.getGameCategoryByQuery({ game_category_id: element.game_category_id });
            element.dataValues.game_fields_json_data = JSON.parse(element.game_fields_json_data);
            element.dataValues.game_category_id = (getCategoryData) ? getCategoryData.name : '';
            return element;
        })
        getTypes = await Promise.all(getTypes);
        responseData.msg = 'Game Category List';
        responseData.data = getTypes;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const gameTypeById = async (req, res) => {
    let responseData = {};
    try {
        let getData = await adminService.getGameTypeByQuery({ game_type_id: req.params.id });
        if (!getData) {
            responseData.msg = 'Game Type not found';
            return responseHelper.error(res, responseData, 201);
        }
        getData.dataValues.game_fields_json_data = JSON.parse(getData.game_fields_json_data);
        responseData.msg = 'Game Type List';
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const updategameTypeById = async (req, res) => {
    let responseData = {};
    try {
        const { id, new_title } = req.body;
        let checkGameType = await adminService.getGameTypeByQuery({ name: new_title, game_type_id: { [Op.ne]: id }, game_type_status: { [Op.ne]: '2' } });
        if (checkGameType) {
            responseData.msg = 'Already Added';
            return responseHelper.error(res, responseData, 201);
        }
        let gameFieldJsondata = req.body.game_fields_json_data
        let gameField = [];
        if (gameFieldJsondata.length > 0) {
            for (var i = 0; i < gameFieldJsondata.length; i++) {
                let slug = gameFieldJsondata[i].field_name.toLowerCase();
                let splitSlug = slug.split(" ");
                let joinSlug = splitSlug.join("_");
                let datas = {
                    field_name: gameFieldJsondata[i].field_name,
                    field_type: gameFieldJsondata[i].field_type,
                    field_key: joinSlug,
                    is_required: gameFieldJsondata[i].field_required,
                }
                gameField.push(datas);
            }
        }
        let roleObj = {
            name: new_title,
            game_fields_json_data: JSON.stringify(gameField),
            updated_by: req.user.admin_id
        }
        let update = await adminService.updateGameType(roleObj, { game_type_id: id });

        responseData.msg = 'Game Category Updated Done';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}


const createGame = async (req, res) => {
    let responseData = {};
    try {
        let { name, bet_amount, percentage, table_type } = req.body;
        let winAmt = 2 * bet_amount;
        let winAmount = winAmt - (winAmt * percentage) / 100;
        let gameField = { name, bet_amount, percentage, table_type, win_amount: winAmount };
        gameField.added_by = req.user.admin_id;
        let save = await adminService.createGame(gameField);
        responseData.msg = 'Game Added Done';
        return responseHelper.success(res, responseData);
    } catch (error) {
        console.log(error);
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const gameList = async (req, res) => {
    let responseData = {};
    try {
        let getData = await adminService.getAllGameList({ game_status: { [Op.ne]: '2' } });
        if (!getData) {
            responseData.msg = 'Game List not found';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'Game List';
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const gameDetail = async (req, res) => {
    let responseData = {};
    try {
        let gameId = req.params.id;
        let getData = await adminService.getGameByQuery({ game_id: gameId });
        if (!getData) {
            responseData.msg = 'Game Data not found';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'Game Detail';
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const updateGame = async (req, res) => {
    let responseData = {};
    try {
        let { game_id, name, bet_amount, percentage, table_type, win_amount } = req.body;
        let gameField = { name, bet_amount, percentage, table_type, win_amount };
        let getData = await adminService.getGameByQuery({ game_id: game_id });
        if (!getData) {
            responseData.msg = 'Game Data not found';
            return responseHelper.error(res, responseData, 201);
        }
        gameField.updated_by = req.user.admin_id;
        let updateData = await adminService.updateGameById(gameField, { game_id: game_id });
        responseData.msg = 'Game Update Successfully';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const changePassword = async (req, res) => {
    let responseData = {};
    try {
        let reqObj = req.body;
        let user = req.user;
        console.log(user);
        let id = user.admin_id;
        let query = { admin_id: id }
        let getUser = await adminService.geAdminDetailsById(query);
        if (!getUser) {
            responseData.msg = 'No User Found';
            return responseHelper.error(res, responseData, 201);
        }
        console.log(1);
        let comparePasswrd = await comparePassword(reqObj.old_password, getUser.password);
        console.log(4);
        if (!comparePasswrd) {
            console.log(3);
            responseData.msg = `Invalid old password !!!`;
            return responseHelper.error(res, responseData, 201);
        }
        console.log(2);
        let compareNewAndOld = await comparePassword(reqObj.new_password, getUser.password);
        if (compareNewAndOld) {
            responseData.msg = `New password must be different from old password !!!`;
            return responseHelper.error(res, responseData, 201);
        }
        let newPassword = await encryptPassword(reqObj.new_password);
        let updatedObj = {
            password: newPassword
        }

        let updateProfile = await adminService.updateAdminByQuery(updatedObj, query);
        responseData.msg = `Password updated successfully !!!`;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const forgotPassword = async (req, res) => {
    let reqObj = req.body;
    let responseData = {};
    let email = reqObj.email;
    try {
        let userData;
        let query;

        userData = await adminService.geAdminDetailsById({ email: email });
        query = {
            email: email
        }
        if (!userData) {
            responseData.msg = "no user found";
            return responseHelper.error(res, responseData, 201);
        }
        let otp = '123456';
        //let otp = OTP();
        let htmlB = "<html><body><p>Hello , "
            + "This is your one time password (" + otp + ") for forgot password. Please don't share to anyone.</p></body></html>";
        let subject = 'Forgot Password OTP'
        //await SendWaitlistEmail(userData, htmlB, subject)
        console.log('otp', otp);

        await adminService.updateAdminByQuery({ otp: otp, is_verify: '0' }, query);
        responseData.msg = 'OTP has been sent successfully to your email id!!!';
        responseData.data = { otp: otp }
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 201);
    }
}

const verifyOtpForForgotPassword = async (req, res) => {
    let email = req.body.email;
    let otp = req.body.otp;
    let responseData = {};
    try {
        let userData;
        let updateObj;
        let query;
        userData = await adminService.geAdminDetailsById({ email: email });
        updateObj = {
            otp: null,
            is_verify: '1'
        };
        if (!userData) {
            responseData.msg = "no user found";
            return responseHelper.error(res, responseData, 201);
        }

        if (userData.otp != otp) {
            responseData.msg = "Invalid Otp";
            return responseHelper.error(res, responseData, 201);
        }

        let updatedUser = await adminService.updateAdminByQuery(updateObj, { email: email });
        if (!updatedUser) {
            responseData.msg = 'failed to verify user';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'Your account has been successfully verified!!!';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const resetPassword = async (req, res) => {
    let email = req.body.email;
    let newPassword = req.body.password;
    let responseData = {};
    try {
        let userData;
        let query;

        userData = await adminService.geAdminDetailsById({ email: email });
        query = {
            email: email
        }
        if (!userData) {
            responseData.msg = "no user found";
            return responseHelper.error(res, responseData, 201);
        }

        if (userData.is_verify == '0') {
            responseData.msg = "Please verify your otp";
            return responseHelper.error(res, responseData, 201);
        }
        let encryptedPassword = await encryptPassword(newPassword);
        let updateUserQuery = {
            password: encryptedPassword,
        };

        let updatedUser = await adminService.updateAdminByQuery(updateUserQuery, query)
        if (!updatedUser) {
            responseData.msg = "failed to reset password";
            return responseHelper.error(res, responseData, 201);
        }

        responseData.msg = "Password updated successfully! Please Login to continue";
        return responseHelper.successWithType(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const addEmojis = async (req, res) => {
    let responseData = {};
    try {
        let unicodeText = req.body.unicode_text;
        unicodeText = unicodeText.split('U+');
        if (unicodeText[1]) {
            unicodeText = unicodeText[1];
        } else {
            unicodeText = unicodeText[0];
        }

        console.log(unicodeText);
        let Check = await adminService.getEmojisByName({ unicode_text: unicodeText });
        if (Check) {
            responseData.msg = "Emojis already added";
            return responseHelper.error(res, responseData, 201);
        }
        // const unicode = ["1f47f", "1f601", "1f60b", "1f62c", "1f9d0", "1f47f", "1f600", "1f601", "1f602", "1f603", "1f604", "1f605", "1f606", "1f607", "1f608", "1f609", "1f60a", "1f60b", "1f60c", "1f60d", "1f60e", "1f60f", "1f610", "1f611", "1f612", "1f613", "1f614", "1f615", "1f616", "1f617", "1f618", "1f619", "1f61a", "1f61b", "1f61c", "1f61d", "1f61e", "1f61f", "1f620", "1f621", "1f622", "1f623", "1f624", "1f625", "1f626", "1f627", "1f628", "1f629", "1f62a", "1f62b", "1f62c", "1f62d", "1f62e", "1f62f", "1f630", "1f631", "1f632", "1f633", "1f634", "1f635", "1f636", "1f637", "1f641", "1f642", "1f643", "1f644", "1f910", "1f911", "1f912", "1f913", "1f914", "1f915", "1f917", "1f922", "1f923", "1f924", "1f925", "1f927", "1f928", "1f929", "1f92a", "1f92b", "1f92c", "1f92d", "1f92e", "1f92f", "1f970", "1f973", "1f974", "1f975", "1f976", "1f97a", "2639", "263a"]
        // unicode.forEach(async(val) => {
        //     var icons = String.fromCodePoint(parseInt(val, 16))
        //     await adminService.addEmojisData({unicode_text:val,emojis:icons,added_by:req.user.admin_id});
        // });

        var icons = String.fromCodePoint(parseInt(unicodeText, 16))
        await adminService.addEmojisData({ unicode_text: unicodeText, emojis: icons, added_by: req.user.admin_id });
        responseData.msg = "Icon Saved";
        return responseHelper.successWithType(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const getEmojis = async (req, res) => {
    let responseData = {};
    try {

        let emojis = await adminService.getEmojisData();
        if (emojis.length == 0) {
            responseData.msg = "emojis not found";
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = "Emojis List";
        responseData.data = emojis;
        return responseHelper.successWithType(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const deleteEmojis = async (req, res) => {
    let responseData = {};
    try {
        let id = req.params.id;
        let Check = await adminService.getEmojisByName({ id: id });
        if (!Check) {
            responseData.msg = "Emojis not found";
            return responseHelper.error(res, responseData, 201);
        }

        let emojis = await adminService.deleteEmojis({ id: id });
        responseData.msg = "Emojis Deleted";
        return responseHelper.successWithType(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}


const userList = async (req, res) => {
    let responseData = {};
    try {
        const { page, search_key, from_date, end_date } = req.query;
        const { limit, offset } = getPagination(page);
        // let query = {
        //     order: [["user_id", "DESC"]],
        //     limit, offset
        // }
        let response, responseTotalCount;
        let query = `user_status!='2' AND is_influencer='0'`;
        if (from_date && end_date) {
            console.log('d');
            let fromDate = moment(from_date).format('YYYY-MM-DD');
            let endDate = moment(end_date).format('YYYY-MM-DD');
            query += ` AND DATE(createdAt) BETWEEN '${fromDate}' AND '${endDate}'`;
        }
        if (search_key) {
            query += ` AND (username like '%${search_key}%' OR referral_code like '%${search_key}%' OR full_name like '%${search_key}%')`;
        }
        query += ` order by user_id DESC`;
        response = await sequelize.query(`Select *  from users where ${query} LIMIT ${offset}, ${limit}`, { type: sequelize.QueryTypes.SELECT });
        responseTotalCount = await sequelize.query(`Select *  from users where ${query}`, { type: sequelize.QueryTypes.SELECT });
        let totalCount = responseTotalCount.length;
        console.log(response);
        if (response.length == 0) {
            responseData.msg = 'No users found';
            return responseHelper.error(res, responseData, 201);
        }
        response = response.map(async (element, i) => {
            let getWithDrawAmt = await adminService.getWithdrawl({ user_id: element.user_id });
            let getDepositAmt = await adminService.getDeposit({ user_id: element.user_id });
            let withdrawAmt = (getWithDrawAmt && getWithDrawAmt[0].redeem_amount != null) ? getWithDrawAmt[0].redeem_amount : 0;
            let depositAmt = (getDepositAmt && getDepositAmt[0].redeem_amount != null) ? getDepositAmt[0].amount : 0;
            element.withdraw_amount = withdrawAmt;
            element.deposit_amount = depositAmt;
            element.mobile = await decryptData(element.mobile);
            element.user_level = 10;
            return element;
        })

        response = await Promise.all(response);
        return res.status(200).send({
            message: 'User List',
            statusCode: 200,
            status: true,
            count: totalCount,
            data: response
        });
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const userDetail = async (req, res) => {
    let responseData = {};
    try {
        let user_id = req.params.id;
        let getList = await userService.getUserDetailsById({ user_id: user_id });
        if (!getList) {
            responseData.msg = 'No users found';
            return responseHelper.error(res, responseData, 201);
        }
        let getWithDrawAmt = await adminService.getWithdrawl({ user_id: getList.user_id });
        let getWallet = await userService.getUserWalletDetailsById({ user_id: getList.user_id });
        let withdrawAmt = getWithDrawAmt[0].redeem_amount;
        if (getWithDrawAmt[0].redeem_amount == null) {
            withdrawAmt = 0;
        }

        let depositAmt = getWallet.real_amount;
        let getUserLevel = await adminService.getGameHistoryCountByUserId({ user_id: getList.user_id });
        let getUserWinGame = await adminService.getGameHistoryCountByUserId({ user_id: getList.user_id, is_win: '1' });
        let getUserLoseGame = await adminService.getGameHistoryCountByUserId({ user_id: getList.user_id, is_win: '0' });
        console.log('usr_lvl', getUserLevel);
        getList.dataValues.mobile = await decryptData(getList.dataValues.mobile);
        getList.dataValues.email = (getList.dataValues.email) ? await decryptData(getList.dataValues.email) : '';
        getList.dataValues.total_games = getUserLevel;
        getList.dataValues.is_email_verified = (getList.is_email_verified == 1) ? 'Yes' : 'No';
        getList.dataValues.is_mobile_verified = (getList.is_mobile_verified == 1) ? 'Yes' : 'No';
        getList.dataValues.is_kyc_done = (getList.is_kyc_done == 1) ? 'Yes' : 'No';
        getList.dataValues.game_win = getUserWinGame;
        getList.dataValues.game_lose = getUserLoseGame;
        getList.dataValues.win_wallet = (getWallet && getWallet.win_amount) ? getWallet.win_amount : 0;
        getList.dataValues.withdraw_amount = withdrawAmt;
        getList.dataValues.deposit_amount = depositAmt;
        getList.dataValues.wallet_amount = (getWallet && getWallet.real_amount) ? parseFloat(getWallet.real_amount) + parseFloat(getWallet.win_amount) : 0;
        getList.dataValues.bonus_amount = (getWallet && getWallet.bonus_amount) ? getWallet.bonus_amount : 0;
        getList.dataValues.signup_bonus = 0;
        let level = 0;
        if (getUserLevel > 0 && getUserLevel < 100) {
            level = 1;
        } else if (getUserLevel > 101 && getUserLevel < 500) {
            level = 2;
        } else if (getUserLevel > 501 && getUserLevel < 1000) {
            level = 3;
        } else if (getUserLevel > 1001 && getUserLevel < 3000) {
            level = 4;
        } else if (getUserLevel > 3001) {
            level = 5;
        }
        getList.dataValues.user_level = 'Level ' + level;
        responseData.msg = 'User Detail';
        responseData.data = getList;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const userKycDetail = async (req, res) => {
    let responseData = {};
    try {
        let user_id = req.params.userid;
        let getList = await userService.getUserKycDetailsById({ user_id: user_id });
        if (!getList) {
            responseData.msg = 'No Data found';
            return responseHelper.error(res, responseData, 201);
        }
        getList.id_number = await decryptData(getList.id_number);
        getList.id_document = req.protocol + '://' + req.headers.host + '/user/' + getList.id_document;
        responseData.msg = 'User Kyc Details';
        responseData.data = getList;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const userBankAccount = async (req, res) => {
    let responseData = {};
    try {
        let user_id = req.params.userid;
        let getData = await userService.getUserBankByQuery({ user_id: user_id });
        if (getData.length == 0) {
            responseData.msg = 'No Data found';
            return responseHelper.error(res, responseData, 201);
        }
        getData = getData.map(async (element, i) => {
            element.ifsc_code = await decryptData(element.ifsc_code);
            element.account_no = await decryptData(element.account_no);
            element.upi_no = (element.upi_no) ? await decryptData(element.upi_no) : '';
            return element;
        });
        getData = await Promise.all(getData);
        responseData.msg = 'User Bank Account List';
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const userActivity = async (req, res) => {
    let responseData = {};
    try {
        let user_id = req.params.id;
        let getList = await userService.getUserActivityDetailsById({ user_id: user_id });
        if (getList.length == 0) {
            responseData.msg = 'No Data found';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'User Activity Log Details';
        responseData.data = getList;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const userLoginActivity = async (req, res) => {
    let responseData = {};
    try {
        let user_id = req.params.id;
        let getList = await userService.getUserLoginDetailsById({ user_id: user_id });
        if (getList.length == 0) {
            responseData.msg = 'No Data found';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'User Login Log Details';
        responseData.data = getList;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const updateUserProfile = async (req, res) => {
    let responseData = {};
    try {
        let reqObj = req.body;
        let id = req.body.id;
        let query = { user_id: id }
        let getUser = await userService.getUserDetailsById(query);
        if (!getUser) {
            responseData.msg = 'No User Found';
            return responseHelper.error(res, responseData, 201);
        }
        let fullName, emailId, dobs, gendar, mobileNo;
        if (typeof reqObj.full_name == 'undefined') {
            fullName = getUser.full_name;
        } else if (reqObj.full_name == '') {
            fullName = getUser.full_name;
        } else {
            fullName = reqObj.full_name;
        }

        if (typeof reqObj.email == 'undefined') {
            emailId = getUser.email;
        } else if (reqObj.email == '') {
            emailId = getUser.email;
        } else {
            emailId = reqObj.email;
        }

        if (typeof reqObj.mobile == 'undefined') {
            mobileNo = getUser.mobile;
        } else if (reqObj.mobile == '') {
            mobileNo = getUser.mobile;
        } else {
            mobileNo = reqObj.mobile;
        }

        if (typeof reqObj.gender == 'undefined') {
            gendar = getUser.gender;
        } else if (reqObj.gender == '') {
            gendar = getUser.gender;
        } else {
            gendar = reqObj.gender;
        }

        if (typeof reqObj.dob == 'undefined') {
            dobs = getUser.dob;
        } else if (reqObj.dob == '') {
            dobs = getUser.dob;
        } else {
            dobs = reqObj.dob;
        }

        let userData = {
            full_name: fullName,
            gender: gendar,
            dob: dobs,
            email: emailId,
            mobile: mobileNo
        }

        let userLog = {
            user_id: id,
            device_token: getUser.device_token,
            type: 'update profile by admin',
            old_value: JSON.stringify(getUser),
            new_value: JSON.stringify(userData)
        }
        let updateUser = await userService.updateUserByQuery(userData, query);
        let updateLog = await userService.addUserLog(userLog);
        responseData.msg = 'User Updated successfully!!!';
        responseData.data = {};
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const activeUserList = async (req, res) => {
    let responseData = {};
    try {
        let query = {
            where:
            {
                user_status: '1'
            }
        }
        let newdate = moment(new Date(), 'DD/MM/YYYY').format('YYYY-MM-DD')
        let response = await sequelize.query(`Select users.*,game_histories.updatedAt  from game_histories join users on game_histories.user_id = users.user_id where DATE(game_histories.createdAt)='${newdate}' group by game_histories.user_id`, { type: sequelize.QueryTypes.SELECT });
        if (response.length == 0) {
            responseData.msg = 'No users found';
            return responseHelper.error(res, responseData, 201);
        }
        response = response.map(async (element, i) => {
            // let getWithDrawAmt = await adminService.getWithdrawl({user_id: element.user_id});
            // let getDepositAmt = await adminService.getDeposit({user_id: element.user_id});
            // let withdrawAmt = (getWithDrawAmt && getWithDrawAmt[0].redeem_amount != null) ? getWithDrawAmt[0].redeem_amount : 0;
            // let depositAmt = (getDepositAmt && getDepositAm`t[0].redeem_amount != null) ? getDepositAmt[0].amount : 0;
            // element.dataValues.withdraw_amount = withdrawAmt;
            // element.dataValues.deposit_amount = depositAmt;
            element.mobile = await decryptData(element.mobile);
            // element.dataValues.user_level = 10;
            return element;
        })
        response = await Promise.all(response);
        responseData.msg = 'User List';
        responseData.data = response;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const todayUserList = async (req, res) => {
    let responseData = {};
    try {
        let date = new Date().toISOString().split('T')[0]
        let query = {
            where: {
                createdAt: {
                    [Op.gte]: date
                }
            }
        };
        let getList = await adminService.getUserList(query);
        console.log(getList);
        if (getList.length == 0) {
            responseData.msg = 'No users found';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'User List';
        responseData.data = getList;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const pendingWithdrawal = async (req, res) => {
    let responseData = {};
    try {
        let query = { redemption_status: { [Op.ne]: 'Withdraw' } };
        let getUserData = await adminService.getWithdrawal(query);
        if (getUserData.length == 0) {
            responseData.msg = 'Data not found';
            return responseHelper.error(res, responseData, 201);
        }
        getUserData = getUserData.map(async (element, i) => {
            console.log(element.user_id);
            let getUserD = await adminService.getUserDetailsById({ user_id: element.user_id });
            console.log('getUserD', getUserD.display_name);
            element.dataValues.user_id = (getUserD && getUserD.display_name != null) ? getUserD.display_name : '';
            return element;
        })
        getUserData = await Promise.all(getUserData);
        responseData.msg = 'Pending Withdrawal List!!!';
        responseData.data = getUserData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const todayWithdrawal = async (req, res) => {
    let responseData = {};
    try {
        let date = new Date().toISOString().split('T')[0]
        let query = { redemption_status: 'Withdraw' };
        let getUserData = await adminService.getWithdrawal(query);
        if (getUserData.length == 0) {
            responseData.msg = 'Data not found';
            return responseHelper.error(res, responseData, 201);
        }
        getUserData = getUserData.map(async (element, i) => {
            console.log(element.user_id);
            let getUserD = await adminService.getUserDetailsById({ user_id: element.user_id });
            console.log('getUserD', getUserD.display_name);
            element.dataValues.user_id = (getUserD && getUserD.display_name != null) ? getUserD.display_name : '';
            return element;
        })
        getUserData = await Promise.all(getUserData);
        responseData.msg = 'Total Withdrawal List!!!';
        responseData.data = getUserData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const changeWithDrawlStatus = async (req, res) => {
    let responseData = {};
    try {
        let requestId = req.body.request_id;
        let requestStatus = req.body.status;
        let redemeptionData = await adminService.getWithdrawlRequestById({ redemption_id: requestId });

        if (!redemeptionData) {
            responseData.msg = 'No Data Found';
            return responseHelper.error(res, responseData, 201);
        }
        let data = {
            redemption_status: requestStatus
        }

        let userId = redemeptionData.user_id;
        let userD = await userService.getUserDetailsById({ user_id: userId });
        let userWallet = await userService.getUserWalletDetailsById({ user_id: userId });

        let orderId = 'order_' + new Date().getTime();
        let redemAmount = redemeptionData.redeem_amount;
        if (requestStatus != 'Withdraw') {
            await adminService.updateRedemption({ redemption_status: requestStatus }, { redemption_id: requestId })
            responseData.msg = 'Status changed';
            return responseHelper.success(res, responseData);
        }
        let getBankDetails = await userService.getUserBankDetailsById({ user_id: userId });
        if (!getBankDetails) {
            responseData.msg = 'Bank Details not found.Please contact to user';
            return responseHelper.error(res, responseData, 201);
        }
        if (userWallet && (parseInt(userWallet.win_amount) < parseInt(redemAmount))) {
            responseData.msg = 'Winning amount is low';
            return responseHelper.error(res, responseData, 201);
        }


        /*TDS Calculation Start*/
        // var todayDate = new Date();
        // let fiscalyear;
        // if ((todayDate.getMonth() + 1) <= 3) {
        //     fiscalyear = (todayDate.getFullYear() - 1) + "-04-01";
        // } else {
        //     fiscalyear = todayDate.getFullYear() + "-04-01";
        // }
        // let getTdsSetting = await adminService.getTdsSetting();
        // let fromDate = (userWallet.last_withdraw_date) ? userWallet.last_withdraw_date : fiscalyear;
        // let toDate = moment(todayDate).format('YYYY-MM-DD');
        // let totalDeposit = await sequelize.query(`Select SUM(amount) as totaldeposit from transactions where user_id=${userId} AND other_type= 'Deposit' AND DATE(transactions.createdAt) BETWEEN '${fromDate}' AND '${toDate}'`, {type: sequelize.QueryTypes.SELECT});
        // console.log('totalDeposit', totalDeposit[0].totaldeposit);
        // let totalWinningAmount = await sequelize.query(`Select SUM(win_amount) as totalwinning from game_histories where user_id=${userId} AND DATE(game_histories.createdAt) BETWEEN '${fromDate}' AND '${toDate}'`, {type: sequelize.QueryTypes.SELECT});
        // console.log('totalWinningAmount', totalWinningAmount[0].totalwinning);
        //
        // if ((+totalWinningAmount[0].totalwinning) > (+totalDeposit[0].totaldeposit)) {
        //     totalWinningAmount = (+totalWinningAmount[0].totalwinning) - (+totalDeposit[0].totaldeposit);
        // }
        // console.log(totalWinningAmount);
        // let tdsAmount = 0.00;
        // let isTds = false;
        // if (getTdsSetting && ((+totalWinningAmount) >= (+getTdsSetting.tds_amount_limit))) {
        //     isTds = true;
        //     tdsAmount = parseFloat(totalWinningAmount * (getTdsSetting.tds_percentage / 100)).toFixed(2);
        // }
        // console.log('1',redemAmount);
        // console.log('2',parseFloat(tdsAmount));
        // let closingBalance = (+userWallet.win_amount) - (+redemAmount);
        // if(parseFloat(redemAmount) > parseFloat(tdsAmount)){
        //     redemAmount = redemAmount - parseFloat(tdsAmount);
        // }
        // console.log('3',redemAmount);
        //

        console.log('Real', userWallet.real_amount);
        let winAmountUpdate = (+userWallet.real_amount) - (+redemAmount);

        let transferD = {
            beneId: getBankDetails.beneficiary_id,
            amount: redemAmount + '.00',
            transferId: orderId,
        }

        let withdrawStatus = await bankWithdraw(transferD);
        //return false;
        let openingBalnace = userWallet.real_amount;


        let walletData = {
            real_amount: winAmountUpdate,
        }
        let savewalet = await userService.updateUserWallet(walletData, { user_wallet_id: userWallet.user_wallet_id });

        let dataTransactions = {
            user_id: userId,
            order_id: orderId,
            closing_balance: openingBalnace,
            opening_balance: openingBalnace,
            type: 'DR',
            other_type: 'Withdraw',
            amount: redemAmount,
            transaction_status: 'SUCCESS'
        }
        console.log(dataTransactions);


        let redemData = {
            user_id: userId,
            account_id: getBankDetails.user_account_id,
            redeem_amount: redemAmount,
            redemption_status: 'Withdraw',
            bank_reference_id: withdrawStatus.data.referenceId,
            transaction_id: orderId
        }
        let userLog = {
            user_id: userId,
            device_token: userD.device_token,
            activity_type: 'redeem',
            old_value: '',
            new_value: JSON.stringify(redemData)
        }
        let save = await adminService.updateRedemption(redemData, { redemption_id: requestId });
        let saveTransactions = await userService.createTransaction(dataTransactions);


        // await adminService.updateRedemption(data, {redemption_id: requestId})
        responseData.msg = 'Status changed';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const todayDeposit = async (req, res) => {
    let responseData = {};
    try {
        let date = new Date().toISOString().split('T')[0]
        let query = { other_type: 'Deposit' };
        let getUserData = await adminService.getTodayDeposit(query);
        if (getUserData.length == 0) {
            responseData.msg = 'Data not found';
            return responseHelper.error(res, responseData, 201);
        }
        getUserData = getUserData.map(async (element, i) => {
            console.log(element.user_id);
            let getUserD = await adminService.getUserDetailsById({ user_id: element.user_id });
            console.log('getUserD', getUserD.display_name);
            element.dataValues.user_id = (getUserD && getUserD.display_name != null) ? getUserD.display_name : '';
            return element;
        })
        getUserData = await Promise.all(getUserData);
        responseData.msg = 'Total Deposit List!!!';
        responseData.data = getUserData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const cashTransaction = async (req, res) => {
    let responseData = {};
    try {
        let game_type = req.query.game_type;
        let getUserData;
        if (game_type) {
            getUserData = await adminService.getCashTransaction({ other_type: { [Op.ne]: 'Coin' }, category: game_type });
        } else {
            getUserData = await adminService.getCashTransaction({ other_type: { [Op.ne]: 'Coin' } });
        }
        if (getUserData.length == 0) {
            responseData.msg = 'Data not found';
            return responseHelper.error(res, responseData, 201);
        }
        getUserData = getUserData.map(async (element, i) => {
            console.log(element.user_id);
            let getUserD = await adminService.getUserDetailsById({ user_id: element.user_id });
            console.log('getUserD', getUserD.username);
            element.dataValues.user_id = (getUserD && getUserD.username != null) ? getUserD.username : '';
            return element;
        })
        getUserData = await Promise.all(getUserData);
        responseData.msg = 'Cash Transaction List!!!';
        responseData.data = getUserData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const sendNotification = async (req, res) => {
    let responseData = {};
    try {
        let reqData = req.body;
        let userId = reqData.user_id.split(',');
        for (let i = 0; i < userId.length; i++) {
            let userIDS = userId[i]
            console.log(userIDS);
            let checkUser = await adminService.getUserDetailsById({ user_id: userIDS });
            if (!checkUser) {
                responseData.msg = 'User not found';
                return responseHelper.error(res, responseData, 201);
            }
            let data = {
                sender_user_id: req.user.admin_id,
                receiver_user_id: userIDS,
                title: reqData.title,
                message: reqData.message,
                link: reqData.link,
                image: (req.file) ? req.file.filename : ''
            }

            await adminService.sendNotification(data);

            let pushData = {
                title: reqData.title,
                message: reqData.message,
                link: reqData.link,
                image: (req.file) ? req.file.filename : '',
                device_token: checkUser.device_token
            }
            //await sendPushNotification(pushData);
        }

        responseData.msg = 'Notification send successfully!!!';
        responseData.data = {};
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const blockUser = async (req, res) => {
    let responseData = {};
    try {
        let userId = req.body.user_id;
        //let gameId = req.body.game_id;
        let status = req.body.status;
        let type = req.body.type;
        let blockTime = req.body.block_time;
        let blockTimeInt = blockTime.replace(/[^\d.]/g, ' ');
        var now = new Date().getTime()
        let time = Math.floor(now / 1000);
        let min;
        let checkUser = await adminService.getUserDetailsById({ user_id: userId });
        if (!checkUser) {
            responseData.msg = 'User Not found!!!';
            return responseHelper.error(res, responseData, 201);
        }
        if (type == 2) {
            await userService.updateUserByQuery({ user_status: '0' }, { user_id: userId })
            responseData.msg = 'User Blocked successfully!!!';
            return responseHelper.success(res, responseData);
        }
        if (blockTimeInt == 24) {
            min = 86400;
        } else {
            min = 1800;
        }

        let blockTimeStamp = parseInt(time) + parseInt(min);
        let data = {
            user_id: userId,
            type: type,
            block_time: blockTime,
            block_timestamp: blockTimeStamp,
            user_game_status: status,
            update_at: new Date()
        }

        let check = await adminService.getUserStatus({ user_id: userId });
        if (check && parseInt(check.block_timestamp) > parseInt(time)) {
            responseData.msg = 'User Already Blocked!!!';
            return responseHelper.error(res, responseData, 201);
        } else if (check && parseInt(check.block_timestamp) < parseInt(time)) {
            await adminService.updateUserStatus(data, { user_game_status_id: check.user_game_status_id })
            responseData.msg = 'User Blocked successfully!!!';
            return responseHelper.success(res, responseData);
        } else {
            await adminService.addUserStatus(data)
            responseData.msg = 'User Blocked successfully!!!';
            return responseHelper.success(res, responseData);
        }


    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const bonusUpdate = async (req, res) => {
    let responseData = {};
    try {
        const { welcome_bonus, referral_bonus, deposit_bonus, registration_bonus, bet_bonus_amount } = req.body;
        let info = req.body
        const checkBonus = await adminService.getReferralBonus();
        if (!checkBonus) {
            info.added_by = req.user.admin_id
            console.log(info);
            await adminService.createBonusSetting(info);
        } else {
            console.log(info);
            info.updated_by = req.user.admin_id
            console.log(info);
            await adminService.updateBonusSetting(info, { refer_bonus_id: checkBonus.refer_bonus_id });
        }
        responseData.msg = 'Bonus Setting Update';
        responseData.data = {};
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const getBonusData = async (req, res) => {
    let responseData = {};
    try {
        const checkBonus = await adminService.getReferralBonus();
        if (!checkBonus) {
            responseData.msg = 'Data not found';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'Bonus Data';
        responseData.data = checkBonus;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const createTournament = async (req, res) => {
    let responseData = {};
    try {
        const tournamentObj = req.body;
        await tournamentService.addTournament(tournamentObj);
        responseData.msg = 'Tournament Added Done';
        return responseHelper.success(res, responseData);
    } catch (error) {
        console.log(error);
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const tournamentList = async (req, res) => {
    let responseData = {};
    try {
        let getData = await tournamentService.getAllTournamentList({ tournament_status: { [Op.ne]: '3' } });
        if (!getData) {
            responseData.msg = 'Tournament List not found';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'Tournament List';
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const tournamentDetail = async (req, res) => {
    let responseData = {};
    try {
        let id = req.params.id;
        let getData = await tournamentService.getTournamentDetailsById({ tournament_id: id });
        if (!getData) {
            responseData.msg = 'Tournament Data not found';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'Tournament Detail';
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const updateTournament = async (req, res) => {
    let responseData = {};
    try {
        const tournamentObj = req.body;
        const id = req.body.id;
        let getData = await tournamentService.getTournamentDetailsById({ tournament_id: id });
        if (!getData) {
            responseData.msg = 'Tournament Data not found';
            return responseHelper.error(res, responseData, 201);
        }
        await tournamentService.updateTournament(tournamentObj, { tournament_id: id });
        responseData.msg = 'Tournament Update Successfully';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const changeTournamentStatus = async (req, res) => {
    let responseData = {};
    try {
        const { tournament_id, status } = req.body;
        let checkTournament = await tournamentService.getTournamentDetailsById({ tournament_id: tournament_id });
        if (!checkTournament) {
            responseData.msg = 'Tournament not found';
            return responseHelper.error(res, responseData, 201);
        }
        let dataObj;
        if (status == '3') {
            dataObj = {
                is_cancel: '1',
                updated_by: req.user.admin_id,
                tournament_status: status
            }
        } else {
            dataObj = {
                tournament_status: status,
                updated_by: req.user.admin_id
            }
        }

        await tournamentService.updateTournament(dataObj, { tournament_id: tournament_id });
        responseData.msg = 'Status Updated';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const getAllPoolTables=async(req,res)=>{
    let responseData={}
    try {
        let allPoolTables=await adminService.getAllPoolTables({});
        if(!allPoolTables || allPoolTables.length==0){
            responseData.msg = 'pool tables not found';
            return responseHelper.error(res, responseData, 201);
        }

      responseData.msg = 'pool tables';
        responseData.data = allPoolTables;
        return responseHelper.success(res, responseData);
        
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
module.exports = {
    adminLogin,
    changePassword,
    createGame,
    gameList,
    gameDetail,
    updateGame,
    adminActivity,
    changeGameCategoryStatus,
    changeGameTypeStatus,
    changeGameStatus,
    getActiveGameCategoryList,
    getProfile,
    resetPassword,
    forgotPassword,
    verifyOtpForForgotPassword,
    addEmojis,
    getEmojis,
    deleteEmojis,

    userList,
    userDetail,
    userKycDetail,
    userBankAccount,
    userActivity,
    userLoginActivity,
    updateUserProfile,
    activeUserList,
    todayUserList,

    pendingWithdrawal,
    todayWithdrawal,
    changeWithDrawlStatus,
    todayDeposit,
    cashTransaction,

    sendNotification,
    blockUser,

    bonusUpdate,
    getBonusData,

    createTournament,
    tournamentList,
    tournamentDetail,
    updateTournament,
    changeTournamentStatus,
    getAllPoolTables
}
