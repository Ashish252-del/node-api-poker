const userService = require("../services/userService");
const adminService = require("../services/adminService");
const pokerService = require("../services/pokerService");
const responseHelper = require("../helpers/customResponse");
const {sendPushNotification} = require('../utils/sendnotification')
const axios = require('axios');
const {
    makeString,
    generateUserToken,
    comparePassword,
    encryptPassword,
    decryptData,
    last7Days,
    encryptData,
    encodeRequest,
    signRequest,
    getDates,
} = require("../utils");
const {Op, fn, col} = require("sequelize");
const {Sequelize} = require("sequelize");
const {sequelize} = require("../models/index");
const moment = require("moment");
const config = require("../config/dbconfig");
const {getRedisClient} = require("../helpers/redis");
const {bankWithdraw} = require("../utils/payment");
const {QueryTypes} = require("sequelize");
const adminLogin = async (req, res) => {
    let responseData = {};
    let reqObj = req.body;
    try {
        console.log("hello from login");
        let mac_address = req.body.mac_address;
        let os_version = req.body.os_version;
        let app_version = req.body.app_version;
        let emailMobile = await encryptData(reqObj.email);
        let userData = await adminService.geAdminDetailsById({
            email: emailMobile,
            admin_status: "1",
        });

        // If not found, search by encrypted mobile
        if (!userData) {
            userData = await adminService.geAdminDetailsById({
                mobile: emailMobile,
                admin_status: "1",
            });
        }

        if (!userData) {
            responseData.msg = "User doesn't exist";
            return responseHelper.error(res, responseData, 201);
        }

        let reqPassword = reqObj.password;
        console.log("reqPassword--->", reqPassword);
        let userPassword = userData.password;
        // Compare request body password and user password
        let isPasswordMatch = await comparePassword(reqPassword, userPassword);
        if (!isPasswordMatch) {
            responseData.msg = "Credential does not match";
            return responseHelper.error(res, responseData, 201);
        }

        let tokenData = {
            id: userData.admin_id,
            email: userData.email,
        };
        // Generate JWT token with the token object
        let jwtToken = generateUserToken(tokenData);
        let loginLogs = {
            admin_id: userData.user_id,
            mac_address: mac_address,
            os_version: os_version,
            app_version: app_version,
            ip: "",
        };

        const adminId = userData.admin_id;
        console.log("adminId", adminId);

        // Get roles associated with the admin
        const getRoles = `
            SELECT roles.roles
            FROM admins
                     INNER JOIN user_roles ON user_roles.userId = admins.admin_id
                     INNER JOIN roles ON roles.role_id = user_roles.roleId
            WHERE admins.admin_id = :adminId;
        `;

        const allRoles = await sequelize.query(getRoles, {
            replacements: {adminId},
            type: QueryTypes.SELECT,
        });

        const formattedRoles = allRoles.map((roleObj) => roleObj.roles);

        if (!formattedRoles || formattedRoles.length === 0) {
            responseData.msg = `No roles assigned!!!`;
            return responseHelper.error(res, responseData, 201);
        }

        // Fetch modules associated with the admin's roles
        const modulesIds = `
            SELECT DISTINCT role_modules.moduleId
            FROM admins
                     INNER JOIN user_roles ON user_roles.userId = admins.admin_id
                     INNER JOIN roles ON roles.role_id = user_roles.roleId
                     INNER JOIN role_modules ON user_roles.roleId = role_modules.roleId
            WHERE admins.admin_id = ${adminId};
        `;

        const modulesIdsData = await sequelize.query(modulesIds, {
            type: QueryTypes.SELECT,
        });

        const formattedIds = modulesIdsData.map((roleObj) => roleObj.moduleId);
        const moduleIds = [...new Set(formattedIds)]; // Ensure no duplicates


        // Fetch the hierarchical module structure
        let recursiveQuery = `
            WITH RECURSIVE ModuleHierarchy AS (SELECT m.moduleId,
                                                      m.moduleName,
                                                      m.isSidebar,
                                                      m.apiMethod,
                                                      m.routes,
                                                      m.parentId,
                                                      m.icon
                                               FROM modules m
                                               WHERE m.moduleId IN (${moduleIds.join(", ")})

                                               UNION ALL

                                               SELECT m.moduleId,
                                                      m.moduleName,
                                                      m.isSidebar,
                                                      m.apiMethod,
                                                      m.routes,
                                                      m.parentId,
                                                      m.icon
                                               FROM ModuleHierarchy mh
                                                        INNER JOIN modules m ON m.parentId = mh.moduleId)
            SELECT DISTINCT mh.moduleId, -- Ensure unique results
                            mh.moduleName,
                            mh.isSidebar,
                            mh.apiMethod,
                            mh.routes,
                            mh.parentId,
                            mh.icon
            FROM ModuleHierarchy mh;
        `;

        const modulesHierarchyData = await sequelize.query(recursiveQuery, {
            type: QueryTypes.SELECT,
        });

        // Organize permissions and remove duplicates
        const organizedPermissions = organizePermissions(modulesHierarchyData);

        await adminService.createLoginLog(loginLogs);

        responseData.msg = "You are logged in successfully";
        responseData.data = {
            id: userData.user_id,
            full_name: userData.full_name,
            email: userData.email ? await decryptData(userData.email) : null,
            mobile: userData.mobile ? await decryptData(userData.mobile) : null,
            role_id: userData.role_id,
            role_assigned: formattedRoles || "",
            token: jwtToken,
            permissions: organizedPermissions,
        };

        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const organizePermissions = (permissions) => {
    // Create a map to store permissions by moduleId
    const permissionsMap = new Map();

    // Initialize children array for all permissions
    permissions.forEach((permission) => {
        permission.children = [];
        permissionsMap.set(permission.moduleId, permission);
    });

    // Iterate through permissions and add children to their respective parents
    permissions.forEach((permission) => {
        if (permission.parentId !== permission.moduleId) {
            const parentPermission = permissionsMap.get(permission.parentId);
            if (parentPermission) {
                parentPermission.children.push(permission);
            }
        }
    });

    // Filter out parent permissions and return them as an array
    const organizedPermissions = permissions.filter(
        (permission) => permission.parentId === 0
    );

    return organizedPermissions;
};

const getProfile = async (req, res) => {
    let responseData = {};
    try {
        let admin_id = req.user.admin_id;
        let getList = await adminService.geAdminDetailsById({admin_id: admin_id});
        if (getList.length == 0) {
            responseData.msg = "No Data found";
            return responseHelper.error(res, responseData, 201);
        }
        let getModules = await adminService.getModules();
        getModules = getModules.map(async (element, i) => {
            let getAssignData = await adminService.getPermissionQuery({
                role_id: getList.role_id,
                permission_module_id: element.module_id,
            });
            element.dataValues.module_access = getAssignData
                ? getAssignData.module_access
                : "";
            element.dataValues.add_access = getAssignData
                ? getAssignData.add_access
                : false;
            element.dataValues.edit_access = getAssignData
                ? getAssignData.edit_access
                : false;
            element.dataValues.view_access = getAssignData
                ? getAssignData.view_access
                : false;
            element.dataValues.delete_access = getAssignData
                ? getAssignData.delete_access
                : false;
            return element;
        });
        getModules = await Promise.all(getModules);
        getList.dataValues.permissions = getModules ? getModules : "";
        responseData.msg = "Admin Profile";
        responseData.data = getList;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const adminActivity = async (req, res) => {
    let responseData = {};
    try {
        let user_id = req.params.id;
        let getList = await adminService.getAdminUserActivityLogs({
            admin_activity_log_id: user_id,
        });
        if (getList.length == 0) {
            responseData.msg = "No Data found";
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = "Admin Activity Log Details";
        responseData.data = getList;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const addRole = async (req, res) => {
    let responseData = {};
    try {
        const {title} = req.body;
        let checkRole = await adminService.getRoleByQuery({
            roles: title,
        });
        console.log("checkRole", checkRole);
        if (checkRole) {
            responseData.msg = "Already Added";
            return responseHelper.error(res, responseData, 201);
        }
        let roleObj = {
            roles: title,
            added_by: req.user.admin_id,
        };
        console.log("roleObj", roleObj);
        await adminService.createRole(roleObj);
        responseData.msg = "Role Added Done";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const roleList = async (req, res) => {
    let responseData = {};
    try {
        let getRoles = await adminService.getAllRoles({
            role_status: {[Op.ne]: "2"},
        });
        if (getRoles.length == 0) {
            responseData.msg = "Roles not found";
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = "Roles List";
        responseData.data = getRoles;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const activeRoleList = async (req, res) => {
    let responseData = {};
    try {
        let getRoles = await adminService.getAllRoles({role_status: "1"});
        if (getRoles.length == 0) {
            responseData.msg = "Roles not found";
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = "Roles List";
        responseData.data = getRoles;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const changeRoleStatus = async (req, res) => {
    let responseData = {};
    try {
        const {id, status} = req.body;
        console.log("Role Status:", status);

        let checkRole = await adminService.getRoleByQuery({role_id: id});
        // console.log("checkRole-->",req.user);
        if (!checkRole) {
            responseData.msg = "Role not found";
            return responseHelper.error(res, responseData, 201);
        }
        if (status != 2) {
            let roleObj = {
                role_status: status,
                updated_by: req.user.admin_id,
            };

            await adminService.updateRole(roleObj, {role_id: id});
        } else {

            await adminService.deleteRole(id);
        }

        responseData.msg = "Role Status Updated";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const roleById = async (req, res) => {
    let responseData = {};
    try {
        const userId = req.query.user_id;
        let userData_admin = await adminService.geAdminDetailsById({user_id: userId});
        const allRolesQuery = `
            SELECT role_id, roles, role_status
            FROM roles
            WHERE role_status = '1'
        `;
        const allRoles = await sequelize.query(allRolesQuery, {
            type: QueryTypes.SELECT,
        });

        let adminRoles = [];

        if (userData_admin) {
            const user_id = userData_admin.admin_id;
            // Step 2: Fetch roles associated with the admin
            const adminRolesQuery = `
                SELECT roles.role_id
                FROM admins
                         INNER JOIN user_roles ON user_roles.userId = admins.admin_id
                         INNER JOIN roles ON roles.role_id = user_roles.roleId
                WHERE admins.admin_id = :user_id
            `;

            adminRoles = await sequelize.query(adminRolesQuery, {
                replacements: {user_id},
                type: QueryTypes.SELECT,
            });
            console.log("adminRoles-->", adminRoles);
        }

        // Step 3: Set isActive flag for each role
        const rolesWithIsActive = allRoles.map((role) => ({
            ...role,
            isActive: adminRoles.some(
                (adminRole) => adminRole.role_id === role.role_id
            ),
        }));

        responseData.msg = "Roles List";
        responseData.data = rolesWithIsActive;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const updateRoleById = async (req, res) => {
    let responseData = {};
    try {
        const {id, title} = req.body;
        let checkRole = await adminService.getRoleByQuery({
            roles: title,
            role_status: {[Op.ne]: "2"},
        });
        if (checkRole) {
            responseData.msg = "Already Added";
            return responseHelper.error(res, responseData, 201);
        }
        let roleObj = {
            roles: title,
            updated_by: req.user.admin_id,
        };
        await adminService.updateRole(roleObj, {role_id: id});
        responseData.msg = "Role Updated Done";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const addGameCategory = async (req, res) => {
    let responseData = {};
    try {
        const {title} = req.body;
        let checkRole = await adminService.getGameCategoryByQuery({
            name: title,
            game_category_status: {[Op.ne]: "2"},
        });
        if (checkRole) {
            responseData.msg = "Already Added";
            return responseHelper.error(res, responseData, 201);
        }
        let roleObj = {
            name: title,
            type: title.toLowerCase(),
            added_by: req.user.admin_id,
        };
        await adminService.addGameCategory(roleObj);
        responseData.msg = "Game Type Added Done";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const gameCategoryList = async (req, res) => {
    let responseData = {};
    try {
        let getRoles = await adminService.getAllGameCategory();
        if (getRoles.length == 0) {
            responseData.msg = "Game Type found";
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = "Game Type List";
        responseData.data = getRoles;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const gameCategoryById = async (req, res) => {
    let responseData = {};
    try {
        let getCatgeory = await adminService.getGameCategoryByQuery({
            game_category_id: req.params.id,
        });
        if (!getCatgeory) {
            responseData.msg = "Type not found";
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = "Type List";
        responseData.data = getCatgeory;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const updategameCategoryById = async (req, res) => {
    let responseData = {};
    try {
        const {id, new_title} = req.body;
        let checkCategory = await adminService.getGameCategoryByQuery({
            name: new_title,
            game_category_status: {[Op.ne]: "2"},
        });
        if (checkCategory) {
            responseData.msg = "Already Added";
            return responseHelper.error(res, responseData, 201);
        }
        let catObj = {
            name: new_title,
            updated_by: req.user.admin_id,
        };
        await adminService.updateGameCategory(catObj, {game_category_id: id});
        responseData.msg = "Game type Updated Done";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const changeGameCategoryStatus = async (req, res) => {
    let responseData = {};
    try {
        const {id, status} = req.body;
        let checkRole = await adminService.getGameCategoryByQuery({
            game_category_id: id,
        });
        if (!checkRole) {
            responseData.msg = "Game type not found";
            return responseHelper.error(res, responseData, 201);
        }
        let roleObj = {
            game_category_status: status,
            updated_by: req.user.admin_id,
        };
        await adminService.updateGameCategory(roleObj, {game_category_id: id});
        responseData.msg = "Status Updated";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const getActiveGameCategoryList = async (req, res) => {
    let responseData = {};
    try {
        let getResult = await adminService.getAllGameCategory({
            game_category_status: "1",
        });
        if (getResult.length == 0) {
            responseData.msg = "Game Type Data not found";
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = "Game List";
        responseData.data = getResult;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const changeGameTypeStatus = async (req, res) => {
    let responseData = {};
    try {
        const {id, status} = req.body;
        let checkRole = await adminService.getGameTypeByQuery({game_type_id: id});
        if (!checkRole) {
            responseData.msg = "Game Type not found";
            return responseHelper.error(res, responseData, 201);
        }
        let roleObj = {

            game_type_status: status,
            updated_by: req.user.admin_id,
        };
        await adminService.updateGameType(roleObj, {game_type_id: id});
        responseData.msg = "Status Updated";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const changeGameStatus = async (req, res) => {
    let responseData = {};
    try {
        const {id, status} = req.body;
        let checkRole = await adminService.getGameByQuery({game_id: id});
        if (!checkRole) {
            responseData.msg = 'Game not found';
            return responseHelper.error(res, responseData, 201);
        }
        if (checkRole.game_category_id == 2) await (await getRedisClient()).del("ROOM"); // for poker
        if (checkRole.game_category_id == 3 && await (await getRedisClient()).hExists("gameRules", "" + id)) {
            let currentGamesRules = JSON.parse(await (await getRedisClient()).hGet("gameRules", "" + id));
            let game = await (await getRedisClient()).hGet("games", "" + id)
            if (game) {
                game = JSON.parse(game);
                if (game.rooms.length > 0) {
                    currentGamesRules.isDeleted = 1;
                    await (await getRedisClient()).hSet("gameRules", "" + id, JSON.stringify(currentGamesRules));
                }
            } else {
                await (await getRedisClient()).hDel("gameRules", "" + id)
            }
        }
        let roleObj = {
            game_status: status,
            updated_by: req.user.admin_id
        }
        await adminService.updateGameById(roleObj, {game_id: id});
        responseData.msg = 'Status Updated';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const addGameType = async (req, res) => {
    let responseData = {};
    try {
        const {game_category_id, title, description} = req.body;
        let checkRole = await adminService.getGameTypeByQuery({
            name: title,
            game_category_id: game_category_id,
            game_type_status: {[Op.ne]: "2"},
        });
        if (checkRole) {
            responseData.msg = "Already Added";
            return responseHelper.error(res, responseData, 201);
        }
        // let gameFieldJsondata = req.body.game_fields_json_data
        // let gameField = [];
        // if (gameFieldJsondata.length > 0) {
        //     for (var i = 0; i < gameFieldJsondata.length; i++) {
        //         let slug = gameFieldJsondata[i].field_name.toLowerCase();
        //         let splitSlug = slug.split(" ");
        //         let joinSlug = splitSlug.join("_");
        //         let datas = {
        //             field_name: gameFieldJsondata[i].field_name,
        //             field_type: gameFieldJsondata[i].field_type,
        //             field_key: joinSlug,
        //             is_required: gameFieldJsondata[i].is_required,
        //         }
        //         gameField.push(datas);
        //     }
        // }
        let roleObj = {
            name: title,
            game_category_id: game_category_id,
            added_by: req.user.admin_id,
            description: description,
        };
        let save = await adminService.addGameType(roleObj);
        responseData.msg = "Game Category Added Done";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const gameTypeList = async (req, res) => {
    let responseData = {};
    try {
        let categoryId = req.query.category_id;
        let getTypes;
        if (categoryId) {
            getTypes = await adminService.getAllGameType({
                game_category_id: categoryId,
                game_type_status: "1",
                club_type: 0,
            });
        } else {
            getTypes = await adminService.getAllGameType({
                game_type_status: {[Op.ne]: "2"},
                club_type: 0,
            });
        }

        if (getTypes.length == 0) {
            responseData.msg = "Game Category not found";
            return responseHelper.error(res, responseData, 201);
        }

        getTypes = getTypes.map(async (element, i) => {
            let getCategoryData = await adminService.getGameCategoryByQuery({
                game_category_id: element.game_category_id,
            });
            element.dataValues.game_fields_json_data = JSON.parse(
                element.game_fields_json_data
            );
            element.dataValues.game_category_id = getCategoryData
                ? getCategoryData.game_category_id
                : "";
            element.dataValues.game_category_name = getCategoryData
                ? getCategoryData.name
                : "";
            return element;
        });

        getTypes = await Promise.all(getTypes);
        responseData.msg = "Game Category List";
        responseData.data = getTypes;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const gameTypeById = async (req, res) => {
    let responseData = {};
    try {
        let getData = await adminService.getGameTypeByQuery({
            game_type_id: req.params.id,
        });
        if (!getData) {
            responseData.msg = "Game Type not found";
            return responseHelper.error(res, responseData, 201);
        }
        getData.dataValues.game_fields_json_data = JSON.parse(
            getData.game_fields_json_data
        );
        responseData.msg = "Game Type List";
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const updategameTypeById = async (req, res) => {
    let responseData = {};
    try {
        const {id, new_title} = req.body;
        let checkGameType = await adminService.getGameTypeByQuery({
            name: new_title,
            game_type_id: {[Op.ne]: id},
            game_type_status: {[Op.ne]: "2"},
        });
        if (checkGameType) {
            responseData.msg = "Already Added";
            return responseHelper.error(res, responseData, 201);
        }
        let gameFieldJsondata = req.body.game_fields_json_data;
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
                    is_required: gameFieldJsondata[i].is_required,
                };
                gameField.push(datas);
            }
        }
        let roleObj = {
            name: new_title,
            game_fields_json_data: JSON.stringify(gameField),
            updated_by: req.user.admin_id,
        };
        let update = await adminService.updateGameType(roleObj, {
            game_type_id: id,
        });

        responseData.msg = "Game Category Updated Done";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

// game_category_id == 2 for poker,  game_category_id==3 for rummy
const createGame = async (req, res) => {
    let responseData = {};
    try {
        let {
            game_category_id,
            game_type_id,
            game_json_data,
            game_blind_structure_json_data,
            game_price_json_data,
        } = req.body;
        let name = '';
        let varient = null;
        if (game_category_id == 4) {
            name = game_json_data.Name
            varient = game_json_data.varient_id
        }
        if (game_category_id == 3) {
            name = game_json_data.Name
        }
        let data = {
            game_category_id: game_category_id,
            game_type_id: game_type_id,
            game_name: name + "",
            varient_id: varient,
            game_json_data: JSON.stringify(game_json_data),
            added_by: req.user.admin_id,
            club_id: 0,
            is_club_template: 0,
            game_blind_id: game_json_data.game_blind_id
                ? parseInt(game_json_data.game_blind_id)
                : null,
            game_prize_id: game_json_data.game_prize_id
                ? parseInt(game_json_data.game_prize_id)
                : null,
        };

        let game_type = await adminService.getGameTypeByQuery({
            game_type_id: game_type_id,
        });
        if (game_type && game_type.name === "SIT N GO") {
            data.is_single_table = true;
        }
        if (game_type && game_type.name.toLowerCase().includes("tournament")) {
            data.is_tournament = true;
        }

        let save = await adminService.createGame(data);

        responseData.msg = "Game Added Done";
        await (await getRedisClient()).del("ROOM");
        return responseHelper.success(res, responseData);
    } catch (error) {
        console.log(error);
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};
const gameList = async (req, res) => {
    let responseData = {};
    try {
        let game_category_id = req.query.game_category;
        let search_key = req.query.search_key || "";
        let page = parseInt(req.query.page, 10) || 1;
        let size = parseInt(req.query.rows_per_page, 10) || 10;
        let from_date = req.query.from_date || null;
        let end_date = req.query.end_date || null;

        const {limit, offset} = getPagination(page, size);

        console.log("game_category_id-->", game_category_id);

        let whereCondition = {game_status: {[Op.ne]: "3"}};

        if (req.query.is_tournament) {
            console.log("check 1");
            whereCondition.is_tournament = "1";
        } else if (game_category_id == game_category_id) {
            console.log("check 2");
            whereCondition.game_category_id = game_category_id;
            whereCondition.is_tournament = "0";
        } else {
            console.log("check 3");
            whereCondition.private_table_code = "0";
            whereCondition.is_tournament = {[Op.ne]: "1"};
        }

        // if (search_key) {
        //     whereCondition[Op.or] = [
        //         {game_name: {[Op.like]: `%${search_key}%`}},
        //         {
        //             game_json_data: {[Op.like]: `%"room_name":"%${search_key}%"%`} // Search inside JSON-like text
        //         }
        //     ];
        // }
        if (search_key) {
            if (game_category_id == 3) {
                whereCondition[Op.or] = [
                    { game_name: { [Op.like]: `%${search_key}%` } },
                    {
                        game_json_data: {
                            [Op.like]: `%"name":"%${search_key}%"%` // Use "name" for category 3
                        }
                    }
                ];
            } else {
                whereCondition[Op.or] = [
                    { game_name: { [Op.like]: `%${search_key}%` } },
                    {
                        game_json_data: {
                            [Op.like]: `%"room_name":"%${search_key}%"%` // Default: room_name
                        }
                    }
                ];
            }
        }
        
        // Date filters
        if (from_date || end_date) {
            whereCondition.createdAt = {};
            if (from_date) {
                whereCondition.createdAt[Op.gte] = new Date(from_date + " 00:00:00");
            }
            if (end_date) {
                whereCondition.createdAt[Op.lte] = new Date(end_date + " 23:59:59");
            }
        }
        console.log("whereCondition--->", whereCondition);

        let totalCount = await adminService.getGameCount(whereCondition);
        let totalPages = Math.ceil(totalCount / limit);

        // Fetch paginated data
        let getData = await adminService.getAllGameList(whereCondition, limit, offset);

        if (!getData || getData.length === 0) {
            responseData.msg = "Game List not found";
            return responseHelper.error(res, responseData, 201);
        }

        // Process each game asynchronously
        getData = await Promise.all(
            getData.map(async (element) => {
                let getCategoryData = await adminService.getGameCategoryByQuery({
                    game_category_id: element.game_category_id,
                });
                element.dataValues.game_category_name = getCategoryData ? getCategoryData.name : "";

                let getTypeData = await adminService.getGameTypeByQuery({
                    game_type_id: element.game_type_id,
                });
                element.dataValues.game_type_name = getTypeData ? getTypeData.name : "";

                let getUserD = await adminService.geAdminDetailsById({
                    admin_id: element.added_by,
                });
                element.dataValues.added_by = getUserD && getUserD.full_name ? getUserD.full_name : "";

                let getUserDD = await adminService.geAdminDetailsById({
                    admin_id: element.updated_by,
                });
                element.dataValues.updated_by = getUserDD && getUserDD.full_name ? getUserDD.full_name : "";

                let gameName;
                let str = JSON.parse(element.game_json_data || "{}");

                if (element.game_category_id == 2) {
                    gameName = str.room_name;
                } else if (element.game_category_id == 3) {
                    gameName = str.name || str.Name;
                } else if (element.game_category_id == 4) {
                    gameName = element.game_name;
                }

                console.log(gameName);
                element.dataValues.game_json_data = str;
                element.dataValues.game_name = gameName;
                element.dataValues.game_price_json_data = JSON.parse(element.game_price_json_data || "{}");
                element.dataValues.game_blind_structure_json_data = JSON.parse(
                    element.game_blind_structure_json_data || "{}"
                );

                return element;
            })
        );

        responseData.msg = "Game List fetched successfully";
        responseData.data = {
            totalCount,
            totalPages,
            currentPage: page,
            limit,
            games: getData,
        };
        return responseHelper.success(res, responseData);
    } catch (error) {
        console.error("Error fetching game list:", error);
        responseData.msg = error.message || "Something went wrong";
        return responseHelper.error(res, responseData, 500);
    }
};

// const gameList = async (req, res) => {
//   let responseData = {};
//   try {
//     let getData;
//     let game_category_id=req.query.game_category;
//     let search_key=req.query.search_key;
//     let page=req.query.page ||1;
//     let from_date = req.query.from_date || null;
//     let end_date = req.query.end_date || null;

//     const { limit, offset } = getPagination(page);

//     console.log("game_category_id-->",game_category_id);
//     if(req.query.is_tournament){
//       console.log("check 1");
//       getData = await adminService.getAllGameList({game_status: {[Op.ne]: '3'}, is_tournament:'1'});
//   }
//   else if(game_category_id=='2'){
//     getData = await adminService.getAllGameList({game_status: {[Op.ne]: '3'}, game_category_id:game_category_id,is_tournament:'0'});
//     console.log("check 2");
//   }
//   else{
//     console.log("check 3");
//       getData = await adminService.getAllGameList({game_status: {[Op.ne]: '3'}, private_table_code:'0', is_tournament:{[Op.ne]: '1'}});
//   }
//     if (!getData) {
//       responseData.msg = "Game List not found";
//       return responseHelper.error(res, responseData, 201);
//     }
//     getData = getData.map(async (element, i) => {
//       let getCategoryData = await adminService.getGameCategoryByQuery({
//         game_category_id: element.game_category_id,
//       });
//       element.dataValues.game_category_name = getCategoryData
//         ? getCategoryData.name
//         : "";
//       let getTypeData = await adminService.getGameTypeByQuery({
//         game_type_id: element.game_type_id,
//       });
//       element.dataValues.game_type_name = getTypeData ? getTypeData.name : "";
//       let getUserD = await adminService.geAdminDetailsById({
//         admin_id: element.added_by,
//       });
//       element.dataValues.added_by =
//         getUserD && getUserD.full_name != null ? getUserD.full_name : "";
//       let getUserDD = await adminService.geAdminDetailsById({
//         admin_id: element.updated_by,
//       });
//       element.dataValues.updated_by =
//         getUserDD && getUserDD.full_name != null ? getUserDD.full_name : "";
//       let gameName;
//       let str = JSON.parse(element.game_json_data, true);
//       if (element.game_category_id == 2) {
//         gameName = str.room_name;
//       } else if (element.game_category_id == 3) {
//         gameName = str.name ? str.name : str.Name;
//       } else if (element.game_category_id == 4) {
//         gameName = element.game_name;
//       }
//       console.log(gameName);
//       element.dataValues.game_json_data = str;
//       element.dataValues.game_name = gameName;
//       element.dataValues.game_price_json_data = JSON.parse(
//         element.game_price_json_data,
//         true
//       );
//       element.dataValues.game_blind_structure_json_data = JSON.parse(
//         element.game_blind_structure_json_data,
//         true
//       );
//       return element;
//     });
//     getData = await Promise.all(getData);
//     responseData.msg = "Game List";
//     responseData.data = getData;
//     return responseHelper.success(res, responseData);
//   } catch (error) {
//     responseData.msg = error.message;
//     return responseHelper.error(res, responseData, 500);
//   }
// };
const getGameTables = async (req, res) => {
    let responseData = {};
    try {
        const game_id = req.query.game_id;

        if (!game_id) {
            responseData.msg = "Game ID is required";
            return responseHelper.error(res, responseData, 400);
        }

        // Fetch tables related to the given game_id
        let tables = await adminService.getFilterTableData({game_id: game_id}, 1);

        if (!tables || tables.length === 0) {
            responseData.msg = "No tables found for this Game ID";
            return responseHelper.error(res, responseData, 404);
        }

        responseData.msg = "Tables fetched successfully";
        responseData.data = tables;

        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const getUserGames = async (req, res) => {
    let responseData = {};
    try {
        const user_id = req.query.user_id;

        let query = `SELECT DISTINCT table_id
                     FROM locked_balance_histories
                     WHERE user_id = :user_id`;
        const tableIds = await sequelize.query(query, {
            replacements: {user_id},
            type: sequelize.QueryTypes.SELECT,
        });
        const tableIdList = tableIds.map(item => item.table_id);
        console.log("tableIdList---->", tableIdList);

        if (tableIdList.length === 0) {
            responseData.msg = "No games found for this user";
            return responseHelper.error(res, responseData, 404);
        }

        // Step 2: Fetch game IDs using table IDs
        let query2 = `SELECT game_id
                      FROM game_tables
                      WHERE game_table_id IN (:tableIds)`;
        const gameIds = await sequelize.query(query2, {
            replacements: {tableIds: tableIdList},
            type: sequelize.QueryTypes.SELECT,
        });

        const gameIdList = gameIds.map(entry => entry.game_id);
      

        if (gameIdList.length === 0) {
            // throw new Error("No games found for this user");
            responseData.msg = "No games found for this user";
            return responseHelper.error(res, responseData, 404);

        }
        let query3 = `SELECT *
                      FROM games
                      WHERE game_id IN (:gameIds)`;
        // Step 3: Fetch game details from Game table using game IDs

        const gameData = await sequelize.query(query3, {
            replacements: {gameIds: gameIdList},
            type: sequelize.QueryTypes.SELECT,
        });
        console.log("gamedata-->",gameData);
        // Parse room_name from game_json_data and set as game_name
const games = gameData.map(game => {
    try {
        const gameData = JSON.parse(game.game_json_data || '{}');
        return {
            ...game,
            game_name: gameData.room_name || '', // Set game_name as room_name
        };
    } catch (e) {
        console.warn(`Invalid JSON for game_id ${game.game_id}`);
        return game; // Return as-is if JSON is malformed
    }
});

        responseData.msg = "User game list";
        responseData.data = games;

        return responseHelper.success(res, responseData);
    } catch (error) {
        console.log("Error in getUserGames:", error);
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};


const gameDetail = async (req, res) => {
    let responseData = {};
    try {
        let gameId = req.params.id;
        let getData = await adminService.getGameByQuery({game_id: gameId});
        if (!getData) {
            responseData.msg = "Game Data not found";
            return responseHelper.error(res, responseData, 201);
        }
        let str = getData.game_json_data;
        getData.game_json_data = JSON.parse(str, true);
        (getData.game_price_json_data = JSON.parse(
            getData.game_price_json_data,
            true
        )),
            (getData.game_blind_structure_json_data = JSON.parse(
                getData.game_blind_structure_json_data,
                true
            )),
            (responseData.msg = "Game Detail");
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const updateGame = async (req, res) => {
    let responseData = {};
    try {
        let {
            game_id,
            game_category_id,
            game_type_id,
            game_json_data,
            game_price_json_data,
            game_blind_structure_json_data
        } = req.body;
        let name = '';
        let varient = null;
        if (game_category_id == 4) {
            name = game_json_data.Name
            varient = game_json_data.varient_id
        }
        if (game_category_id == 3) name = game_json_data.Name
        let data = {
            game_category_id: game_category_id,
            game_type_id: game_type_id,
            game_name: name,
            varient_id: varient,
            game_json_data: JSON.stringify(game_json_data),
            // game_price_json_data: JSON.stringify(game_price_json_data),
            // game_blind_structure_json_data: JSON.stringify(game_blind_structure_json_data),
            updated_by: req.user.admin_id
        }

        if (game_category_id == 3) {
            let game = await (await getRedisClient()).hGet("games", "" + game_id)
            if (game) {
                game = JSON.parse(game);
                if (game.rooms.length > 0) {
                    throw new Error("Can't update now as tables of this game is running ")
                }
            }
        }
        let getData = await adminService.getGameByQuery({game_id: game_id});
        if (!getData) {
            responseData.msg = 'Game Data not found';
            console.error("---------------------Game Data not found -----------");
            return responseHelper.error(res, responseData, 201);
        }
        if (game_category_id == 2) await (await getRedisClient()).del("ROOM"); // For Poker
        if (game_category_id == 3) {
            if (!game_json_data.rummy_code || !game_json_data.maximum_player || !game_json_data.commission || !game_json_data.name) {
                throw new Error("Missing data in game_json_data");
            }
            let updatedGamerules = {};
            updatedGamerules.gameId = game_id;
            updatedGamerules.rummy_code = parseInt(game_json_data.rummy_code);
            updatedGamerules.Max_Player = parseInt(game_json_data.maximum_player);
            updatedGamerules.Comission = parseFloat(game_json_data.commission);
            updatedGamerules.Name = game_json_data.name;
            if (game_json_data.rummy_code == 1) {
                if (!game_json_data.point_value || !game_json_data.entry_fee || !game_json_data.is_practice) throw new Error("Missing data in game_json_data");
                updatedGamerules.Points = parseFloat(game_json_data.point_value);
                updatedGamerules.Min_Chips = parseFloat(game_json_data.entry_fee);
                if (game_json_data.is_practice) updatedGamerules.is_practice = parseInt(game_json_data.is_practice)
            }
            if (game_json_data.rummy_code == 2) {
                if (!game_json_data.pool_type || !game_json_data.entry_fee) throw new Error("Missing data in game_json_data");
                updatedGamerules.break_Score = parseInt(game_json_data.pool_type);
                updatedGamerules.Min_Chips = parseFloat(game_json_data.entry_fee);

            }
            if (game_json_data.rummy_code == 3) {
                if (!game_json_data.point_value || !game_json_data.entry_fee || !game_json_data.deal_type) throw new Error("Missing data in game_json_data");
                updatedGamerules.Points = parseFloat(game_json_data.point_value);
                updatedGamerules.Min_Chips = parseFloat(game_json_data.entry_fee);
                updatedGamerules.break_Round = parseInt(game_json_data.deal_type);
            }
            let updateData = await adminService.updateGameById(data, {game_id: game_id});
            responseData.msg = 'Game Update Successfully';
            await (await getRedisClient()).hSet("gameRules", "" + game_id, JSON.stringify(updatedGamerules));
            return responseHelper.success(res, responseData);
        }
        let updateData = await adminService.updateGameById(data, {game_id: game_id});
        responseData.msg = 'Game Update Successfully';
        return responseHelper.success(res, responseData);
    } catch (error) {
        console.error("error in updateGame ", error)
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const dashboard = async (req, res) => {
    let responseData = {};
    try {
        let gameType = req.query.game_type;
        let userCount = await adminService.getUserList(1);
        let gameCount = await adminService.getAllGameList();
        let data;
        if (gameType == "Poker" || gameType == "Pool" || gameType == "Rummy") {
            let date = new Date().toISOString().split("T")[0];
            let query = {
                createdAt: {
                    [Op.gte]: date,
                },
            };
            let getHandsHistory = await adminService.gameHistory({
                game_category: gameType,
            });
            let getRunningTable = await adminService.getRunningTableData({
                game_category: gameType,
                game_table_status: "Active",
            });
            let getTodayActiveTable = await adminService.getRunningTableData({
                game_category: gameType,
                game_table_status: "Active",
                createdAt: {
                    [Op.gte]: date,
                },
            });
            let totalVolume = 0;
            if (getHandsHistory.length > 0) {
                for (var i = 0; i < getHandsHistory.length; i++) {
                    console.log(getHandsHistory[i].bet_amount);
                    totalVolume += +getHandsHistory[i].bet_amount;
                }
            }
            data = {
                today_games: 10,
                total_player: 5,
                new_player: 0,
                total_rake: 10,
                total_volume_today: totalVolume,
                running_table: getRunningTable.length,
                today_active_table: getTodayActiveTable.length,
            };
        } else {
            data = {
                today_sales: 0,
                total_player: userCount.length,
                new_player: 0,
                total_sales: userCount.length,
            };
        }

        responseData.msg = "Dashboard Data";
        responseData.data = data;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const getPagination = (page, type = null) => {
    page = page - 1;
    let limit = 15;
    let offset = page ? page * limit : 0;
    if (type == 1) {
        limit = 5000
        offset = 0
    }

    return {limit, offset};
};

// const userList = async (req, res) => {
//     let responseData = {};
//     try {
//         const {page, search_key, from_date, end_date,amount} = req.query;
//         const {limit, offset} = getPagination(page);
//         // let query = {
//         //     order: [["user_id", "DESC"]],
//         //     limit, offset
//         // }
//         let response, responseTotalCount;
//         let query = `user_status!='2' AND is_influencer='0'`;
//         if (from_date && end_date) {
//             console.log("d");
//             let fromDate = moment(from_date).format("YYYY-MM-DD");
//             let endDate = moment(end_date).format("YYYY-MM-DD");
//             query += ` AND DATE(createdAt) BETWEEN '${fromDate}' AND '${endDate}'`;
//         }
//         if (search_key) {
//             query += ` AND (username like '%${search_key}%' OR referral_code like '%${search_key}%' OR full_name like '%${search_key}%')`;
//         }
//         query += ` order by user_id DESC`;
//         response = await sequelize.query(
//             `Select *
//              from users
//              where ${query} LIMIT ${offset}
//                  , ${limit}`,
//             {type: sequelize.QueryTypes.SELECT}
//         );
//         responseTotalCount = await sequelize.query(
//             `Select *
//              from users
//              where ${query}`,
//             {type: sequelize.QueryTypes.SELECT}
//         );
//         let totalCount = responseTotalCount.length;
//         // console.log(response);
//         if (response.length == 0) {
//             responseData.msg = "No users found";
//             return responseHelper.error(res, responseData, 201);
//         }
//         response = response.map(async (element, i) => {
//             let getWithDrawAmt = await adminService.getWithdrawl({
//                 user_id: element.user_id,
//             });
//             let getDepositAmt = await adminService.getDeposit({
//                 user_id: element.user_id,
//             });
//             let withdrawAmt =
//                 getWithDrawAmt && getWithDrawAmt[0].redeem_amount != null
//                     ? getWithDrawAmt[0].redeem_amount
//                     : 0;
//             let depositAmt =
//                 getDepositAmt && getDepositAmt[0].redeem_amount != null
//                     ? getDepositAmt[0].amount
//                     : 0;
//             element.withdraw_amount = withdrawAmt;
//             element.deposit_amount = depositAmt;

// // console.log("element--.>",element);
//             if (element.is_ludo_bot === 0) {
//                 try {
//                     element.mobile = element.mobile ? await decryptData(element.mobile) : null;
//                 } catch (err) {
//                     console.error("Error decrypting mobile:", err.message);
//                     element.mobile = null; // Set to null if decryption fails
//                 }
//             } else {
//                 // If is_ludo_bot is true, leave mobile encrypted
//                 element.mobile = element.mobile;
//             }
//             // element.mobile = element.mobile;
//             element.user_level = 10;
//             return element;
//         });

//         response = await Promise.all(response);
//         return res.status(200).send({
//             message: "User List",
//             statusCode: 200,
//             status: true,
//             count: totalCount,
//             data: response,
//         });
//     } catch (error) {
//         responseData.msg = error.message;
//         return responseHelper.error(res, responseData, 500);
//     }
// };
const userList = async (req, res) => {
    let responseData = {};
    try {
        const { page, search_key, from_date, end_date, amount } = req.query;
        const { limit, offset } = getPagination(page);
        let response, responseTotalCount;

        let query = `user_status!='2' AND is_influencer='0'`;

        // Date filter
        if (from_date && end_date) {
            let fromDate = moment(from_date).format("YYYY-MM-DD");
            let endDate = moment(end_date).format("YYYY-MM-DD");
            query += ` AND DATE(createdAt) BETWEEN '${fromDate}' AND '${endDate}'`;
        }

        // Search filter
        if (search_key) {
            query += ` AND (username like '%${search_key}%' OR referral_code like '%${search_key}%' OR full_name like '%${search_key}%')`;
        }

        // Amount filter - fetch user_ids from wallet table
        if (amount) {
            const lowWalletUsers = await sequelize.query(
                `SELECT user_id FROM user_wallets WHERE (real_amount + win_amount) <= ?`,
                {
                    replacements: [parseFloat(amount)],
                    type: sequelize.QueryTypes.SELECT
                }
            );

            const userIds = lowWalletUsers.map(user => user.user_id);
            if (userIds.length === 0) {
                return res.status(200).send({
                    message: "No users found with wallet <= amount",
                    statusCode: 200,
                    status: true,
                    count: 0,
                    data: []
                });
            }
            query += ` AND user_id IN (${userIds.join(",")})`;
        }

        // Final ordering
        query += ` ORDER BY user_id DESC`;

        // Fetch paginated users
        response = await sequelize.query(
            `SELECT * FROM users WHERE ${query} LIMIT ${offset}, ${limit}`,
            { type: sequelize.QueryTypes.SELECT }
        );

        // Total count
        responseTotalCount = await sequelize.query(
            `SELECT COUNT(*) AS total FROM users WHERE ${query}`,
            { type: sequelize.QueryTypes.SELECT }
        );

        let totalCount = responseTotalCount[0].total;

        if (response.length === 0) {
            return responseHelper.error(res, { msg: "No users found" }, 201);
        }

        // Enrich user data
        response = await Promise.all(response.map(async (element) => {
            let getWithDrawAmt = await adminService.getWithdrawl({ user_id: element.user_id });
            let getDepositAmt = await adminService.getDeposit({ user_id: element.user_id });

            element.withdraw_amount = getWithDrawAmt?.[0]?.redeem_amount ?? 0;
            element.deposit_amount = getDepositAmt?.[0]?.amount ?? 0;

            if (element.is_ludo_bot === 0) {
                try {
                    element.mobile = element.mobile ? await decryptData(element.mobile) : null;
                } catch (err) {
                    console.error("Error decrypting mobile:", err.message);
                    element.mobile = null;
                }
            }

            element.user_level = 10;
            return element;
        }));

        return res.status(200).send({
            message: "User List",
            statusCode: 200,
            status: true,
            count: totalCount,
            data: response,
        });
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const userDetail = async (req, res) => {
    let responseData = {};
    try {
        let user_id = req.params.id;
        console.log("user_id--->", user_id);

        // Fetch user details
        let getList = await userService.getUserDetailsById({user_id});
        console.log("getList-->", getList);

        // Check if user details exist
        if (!getList) {
            responseData.msg = "No users found";
            return responseHelper.error(res, responseData, 201);
        }

        // Fetch withdrawal amount
        let getWithDrawAmt = await adminService.getWithdrawl({user_id: getList.user_id});
        let withdrawAmt = getWithDrawAmt?.[0]?.redeem_amount || 0;

        // Fetch wallet details
        let getWallet = await userService.getUserWalletDetailsById({user_id: getList.user_id});
        let depositAmt = getWallet?.real_amount || 0;
        let winWalletAmt = getWallet?.win_amount || 0;
        let bonusAmt = getWallet?.bonus_amount || 0;

        // Fetch game history
        let getUserLevel = await adminService.getGameHistoryCountByUserId({user_id: getList.user_id});
        let getUserWinGame = await adminService.getGameHistoryCountByUserId({user_id: getList.user_id, is_win: "1"});
        let getUserLoseGame = await adminService.getGameHistoryCountByUserId({user_id: getList.user_id, is_win: "0"});

        console.log("usr_lvl", getUserLevel);

        // Decrypt sensitive data
        getList.mobile = getList.mobile ? await decryptData(getList.mobile) : "";
        getList.email = getList.email ? await decryptData(getList.email) : "";

        // Assign additional details to user
        getList.total_games = getUserLevel;
        getList.is_email_verified = getList.is_email_verified == 1 ? "Yes" : "No";
        getList.is_mobile_verified = getList.is_mobile_verified == 1 ? "Yes" : "No";
        getList.is_kyc_done = getList.is_kyc_done == 1 ? "Yes" : "No";
        getList.game_win = getUserWinGame;
        getList.game_lose = getUserLoseGame;
        getList.win_wallet = winWalletAmt;
        getList.withdraw_amount = withdrawAmt;
        getList.deposit_amount = depositAmt;
        getList.wallet_amount = parseFloat(depositAmt) + parseFloat(winWalletAmt);
        getList.bonus_amount = bonusAmt;

        let query = `redemption_status = 'Pending' AND user_id='${user_id}'`;
        let query1 = `redemption_status = 'Withdraw' AND user_id='${user_id}'`;
        let query2 = `other_type='Winning' AND user_id='${user_id}' AND amount > 0`;
        let query3 = `transaction_status = 'SUCCESS' AND other_type='Deposit' AND user_id='${user_id}'`;

        let pendingWithdraw = await sequelize.query(`Select SUM(redeem_amount) as totalPending
                                                     from redemptions
                                                     where ${query}`, {type: sequelize.QueryTypes.SELECT});

        let TotalWithdraw = await sequelize.query(`Select SUM(redeem_amount) as totalWithdraw,
                                                          SUM(tds_amount)    as totalTds
                                                   from redemptions
                                                   where ${query1}`, {type: sequelize.QueryTypes.SELECT});
        let TotalWinning = await sequelize.query(`Select SUM(amount) as totalWinning
                                                  from transactions
                                                  where ${query2}`, {type: sequelize.QueryTypes.SELECT});
        let TotalDeposit = await sequelize.query(`Select SUM(amount) as totalDeposit, SUM(gst_amount) as totalGst
                                                  from transactions
                                                  where ${query3}`, {type: sequelize.QueryTypes.SELECT});
        getList.total_deposit = (TotalDeposit[0].totalDeposit) ? parseFloat(TotalDeposit[0].totalDeposit) : 0.00;
        getList.total_win = (TotalWinning[0].totalWinning) ? parseFloat(TotalWinning[0].totalWinning) : 0.00;
        getList.total_withdraw = (TotalWithdraw[0].totalWithdraw) ? parseFloat(TotalWithdraw[0].totalWithdraw) : 0.00;
        getList.pending_withdraw = (pendingWithdraw[0].totalPending) ? parseFloat(pendingWithdraw[0].totalPending) : 0.00;

        // Determine user level
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
        getList.user_level = "Level " + level;


        let getLudoUserWinHistory = await adminService.getLudoGameHistoryByQuery({userId: user_id, isWin: '1',fee:{[Op.gt] : 0}});
        let getLudoUserLossHistory = await adminService.getLudoGameHistoryByQuery({userId: user_id, isWin: '0', fee:{[Op.gt] : 0}});
        let getPokerUserWinHistory = await userService.getGameHistory({user_id: user_id, is_win: '1', game_category:2, game_type: {
                [Op.ne]: 84  // Not equal to 2
            }});
        let getPokerUserLossHistory = await userService.getGameHistory({user_id: user_id, is_win: '0', game_category:2, game_type: {
                [Op.ne]: 84  // Not equal to 2
            }});
        let getRummyUserWinHistory = await userService.getGameHistory({user_id: user_id, is_win: '1', game_category:3});
        let getRummyUserLossHistory = await userService.getGameHistory({user_id: user_id, is_win: '0', game_category:3});

        let getPoolUserWinHistory = await userService.getPoolGameHistoryByQuery({user_id: user_id, is_win: '1'});
        let getPoolUserLossHistory = await userService.getPoolGameHistoryByQuery({user_id: user_id, is_win: '0'});
        // if (getList.length == 0) {
        //     responseData.msg = 'No Data found';
        //     return responseHelper.error(res, responseData, 201);
        // }
        const ludoWinSum = getLudoUserWinHistory.reduce((total, game) => total + (parseFloat(game.winAmount) || 0), 0);
        const pokerWinSum = getPokerUserWinHistory.reduce((total, game) => total + (parseFloat(game.win_amount) || 0), 0);
        const rummyWinSum = getRummyUserWinHistory.reduce((total, game) => total + (parseFloat(game.win_amount) || 0), 0);
        const poolWinSum = getPoolUserWinHistory.reduce((total, game) => total + (parseFloat(game.win_amount) || 0), 0);


        let config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: 'https://fantasymatch.europagaminggalaxy.com/api/v1/match/get-fantasy-history-by-userid?user_id=3875',
            headers: { }
        };

        const response = await axios.request(config);
        let data1 = response.data;
        getList.gameData = {
            username:(getList) ? getList.username : '',
            total_ludo_played: parseInt(getLudoUserWinHistory.length) + parseInt(getLudoUserLossHistory.length),
            ludo_win:getLudoUserWinHistory.length,
            ludo_win_sum: ludoWinSum,
            ludo_loss: getLudoUserLossHistory.length,
            total_poker_played: parseInt(getPokerUserWinHistory.length) + parseInt(getPokerUserLossHistory.length),
            poker_win: getPokerUserWinHistory.length,
            poker_win_sum: pokerWinSum,
            poker_loss: getPokerUserLossHistory.length,
            total_rummy_played: parseInt(getRummyUserWinHistory.length) + parseInt(getRummyUserLossHistory.length),
            rummy_win: getRummyUserWinHistory.length,
            rummy_win_sum: rummyWinSum,
            rummy_loss: getRummyUserLossHistory.length,
            total_pool_played: parseInt(getPoolUserWinHistory.length) + parseInt(getPoolUserLossHistory.length),
            pool_win: getPoolUserWinHistory.length,
            pool_win_sum: poolWinSum,
            pool_loss: getPoolUserLossHistory.length,
            total_fantasy_played: parseInt(data1.data.fantasy_win) + parseInt(data1.data.fantasy_loss),
            fantasy_win: data1.data.fantasy_win,
            fantasy_win_sum: data1.data.fantasy_win_sum,
            fantasy_loss: data1.data.fantasy_loss
        };
        responseData.msg = "User Detail";
        responseData.data = getList;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

// const userDetail = async (req, res) => {
//   let responseData = {};
//   try {
//     let user_id = req.params.id;
//     console.log("user_id--->",user_id);
//     let getList = await userService.getUserDetailsById({ user_id: user_id });
//     console.log("getList.dataValues-->",getList.dataValues);
//     console.log("getList-->",getList);

//     if (!getList) {
//       responseData.msg = "No users found";
//       return responseHelper.error(res, responseData, 201);
//     }
//     let getWithDrawAmt = await adminService.getWithdrawl({
//       user_id: getList.user_id,
//     });
//     let getWallet = await userService.getUserWalletDetailsById({
//       user_id: getList.user_id,
//     });
//     let withdrawAmt = getWithDrawAmt[0].redeem_amount;
//     if (getWithDrawAmt[0].redeem_amount == null) {
//       withdrawAmt = 0;
//     }

//     let depositAmt = getWallet.real_amount;
//     let getUserLevel = await adminService.getGameHistoryCountByUserId({
//       user_id: getList.user_id,
//     });
//     let getUserWinGame = await adminService.getGameHistoryCountByUserId({
//       user_id: getList.user_id,
//       is_win: "1",
//     });
//     let getUserLoseGame = await adminService.getGameHistoryCountByUserId({
//       user_id: getList.user_id,
//       is_win: "0",
//     });
//     console.log("usr_lvl", getUserLevel);
//     getList.dataValues.mobile = await decryptData(getList.dataValues.mobile);
//     getList.dataValues.email = getList.dataValues.email
//       ? await decryptData(getList.dataValues.email)
//       : "";
//     getList.dataValues.total_games = getUserLevel;
//     getList.dataValues.is_email_verified =
//       getList.is_email_verified == 1 ? "Yes" : "No";
//     getList.dataValues.is_mobile_verified =
//       getList.is_mobile_verified == 1 ? "Yes" : "No";
//     getList.dataValues.is_kyc_done = getList.is_kyc_done == 1 ? "Yes" : "No";
//     getList.dataValues.game_win = getUserWinGame;
//     getList.dataValues.game_lose = getUserLoseGame;
//     getList.dataValues.win_wallet =
//       getWallet && getWallet.win_amount ? getWallet.win_amount : 0;
//     getList.dataValues.withdraw_amount = withdrawAmt;
//     getList.dataValues.deposit_amount = depositAmt;
//     getList.dataValues.wallet_amount =
//       getWallet && getWallet.real_amount
//         ? parseFloat(getWallet.real_amount) + parseFloat(getWallet.win_amount)
//         : 0;
//     getList.dataValues.bonus_amount =
//       getWallet && getWallet.bonus_amount ? getWallet.bonus_amount : 0;
//     let level = 0;
//     if (getUserLevel > 0 && getUserLevel < 100) {
//       level = 1;
//     } else if (getUserLevel > 101 && getUserLevel < 500) {
//       level = 2;
//     } else if (getUserLevel > 501 && getUserLevel < 1000) {
//       level = 3;
//     } else if (getUserLevel > 1001 && getUserLevel < 3000) {
//       level = 4;
//     } else if (getUserLevel > 3001) {
//       level = 5;
//     }
//     getList.dataValues.user_level = "Level " + level;
//     responseData.msg = "User Detail";
//     responseData.data = getList;
//     return responseHelper.success(res, responseData);
//   } catch (error) {
//     responseData.msg = error.message;
//     return responseHelper.error(res, responseData, 500);
//   }
// };

const userKycDetail = async (req, res) => {
    let responseData = {};
    try {
        let user_id = req.params.userid;
        let getList = await userService.getUserKycDetailsById({user_id: user_id});
        if (!getList) {
            responseData.msg = "No Data found";
            return responseHelper.error(res, responseData, 201);
        }
        getList.id_number = await decryptData(getList.id_number);
        getList.id_document =
            req.protocol + "://" + req.headers.host + "/user/" + getList.id_document;
        responseData.msg = "User Kyc Details";
        responseData.data = getList;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const userActivity = async (req, res) => {
    let responseData = {};
    try {
        let user_id = req.params.id;
        let getList = await userService.getUserActivityDetailsById({
            user_id: user_id,
        });
        if (getList.length == 0) {
            responseData.msg = "No Data found";
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = "User Activity Log Details";
        responseData.data = getList;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const userLoginActivity = async (req, res) => {
    let responseData = {};
    try {
        let user_id = req.params.id;
        let page = req.query.page || 1;
        const {limit, offset} = getPagination(page);
        let getList = await sequelize.query(
            `Select *
             from user_login_logs
             where user_id = '${user_id}' LIMIT ${offset}
                 , ${limit}`,
            {type: sequelize.QueryTypes.SELECT}
        );

        let getCount = await sequelize.query(
            `Select *
             from user_login_logs
             where user_id = '${user_id}'`,
            {type: sequelize.QueryTypes.SELECT}
        );
        if (getList.length == 0) {
            responseData.msg = "No Data found";
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = "User Login Log Details";
        responseData.data = getList;
        responseData.count = getCount.length;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const userBankAccount = async (req, res) => {
    let responseData = {};
    try {
        let user_id = req.params.userid;
        let getData = await userService.getUserBankByQuery({user_id: user_id});
        if (getData.length == 0) {
            responseData.msg = "No Data found";
            return responseHelper.error(res, responseData, 201);
        }
        getData = getData.map(async (element, i) => {
            element.ifsc_code = await decryptData(element.ifsc_code);
            element.account_no = await decryptData(element.account_no);
            element.upi_no = element.upi_no ? await decryptData(element.upi_no) : "";
            return element;
        });
        getData = await Promise.all(getData);
        responseData.msg = "User Bank Account List";
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const changePassword = async (req, res) => {
    let responseData = {};
    try {
        let reqObj = req.body;
        let user = req.user;
        console.log(user);
        let id = user.admin_id;
        let query = {admin_id: id};
        let getUser = await adminService.geAdminDetailsById(query);
        if (!getUser) {
            responseData.msg = "No User Found";
            return responseHelper.error(res, responseData, 201);
        }
        console.log(1);
        let comparePasswrd = await comparePassword(
            reqObj.old_password,
            getUser.password
        );
        console.log(4);
        if (!comparePasswrd) {
            console.log(3);
            responseData.msg = `Invalid old password !!!`;
            return responseHelper.error(res, responseData, 201);
        }
        console.log(2);
        let compareNewAndOld = await comparePassword(
            reqObj.new_password,
            getUser.password
        );
        if (compareNewAndOld) {
            responseData.msg = `New password must be different from old password !!!`;
            return responseHelper.error(res, responseData, 201);
        }
        let newPassword = await encryptPassword(reqObj.new_password);
        let updatedObj = {
            password: newPassword,
        };

        let updateProfile = await adminService.updateAdminByQuery(
            updatedObj,
            query
        );
        responseData.msg = `Password updated successfully !!!`;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const filterUser = async (req, res) => {
    let responseData = {};
    try {
        let reqObj = req.body;
        let fromDate = new Date(reqObj.from_date);
        let toDate = new Date(reqObj.to_date);
        if (isNaN(fromDate.getTime())) {
            responseData.msg = "Please enter valid from date";
            return responseHelper.error(res, responseData, 201);
        }
        if (isNaN(toDate.getTime())) {
            responseData.msg = "Please enter valid to date";
            return responseHelper.error(res, responseData, 201);
        }
        if (fromDate > toDate) {
            responseData.msg = "From date is not greater than to date";
            return responseHelper.error(res, responseData, 201);
        }

        const page = req.query.page || 1;
        const limit = config.limit;
        let query = {
            where: {
                createdAt: {
                    [Op.gte]: fromDate,
                    [Op.lte]: toDate,
                },
            },
            order: [["user_id", "DESC"]],
        };
        //return false;
        let getUser = await adminService.getUserList(query);
        if (getUser.length == 0) {
            responseData.msg = "No User Found";
            return responseHelper.error(res, responseData, 201);
        }

        responseData.msg = `User List !!!`;
        responseData.data = getUser;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const activeUserListNew = async (req, res) => {
    let responseData = {};
    try {
        let query = {
            where: {
                user_status: "1",
            },
        };
        let getList = await adminService.getUserList(query);
        //console.log(getList);
        if (getList.length == 0) {
            responseData.msg = "No users found";
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = "User List";
        responseData.data = getList;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const activeUserList = async (req, res) => {
    let responseData = {};
    try {
        let query = {
            where: {
                user_status: "1",
            },
        };
        let newdate = moment(new Date(), "DD/MM/YYYY").format("YYYY-MM-DD");
        let response = await sequelize.query(
            `Select users.*, game_histories.updatedAt
             from game_histories
                      join users on game_histories.user_id = users.user_id
             where DATE (game_histories.createdAt)='${newdate}'
             group by game_histories.user_id`,
            {type: sequelize.QueryTypes.SELECT}
        );
        if (response.length == 0) {
            responseData.msg = "No users found";
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
        });
        response = await Promise.all(response);
        responseData.msg = "User List";
        responseData.data = response;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const todayUserList = async (req, res) => {
    let responseData = {};
    try {
        let date = new Date().toISOString().split("T")[0];
        let query = {
            where: {
                createdAt: {
                    [Op.gte]: date,
                },
            },
        };
        let getList = await adminService.getUserList(query);
        console.log(getList);
        if (getList.length == 0) {
            responseData.msg = "No users found";
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = "User List";
        responseData.data = getList;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const updateUserProfile = async (req, res) => {
    let responseData = {};
    try {
        let reqObj = req.body;
        let id = req.body.id;
        let query = {user_id: id};
        let getUser = await userService.getUserDetailsById(query);
        if (!getUser) {
            responseData.msg = "No User Found";
            return responseHelper.error(res, responseData, 201);
        }
        let fullName, emailId, dobs, gendar, mobileNo;
        if (typeof reqObj.full_name == "undefined") {
            fullName = getUser.full_name;
        } else if (reqObj.full_name == "") {
            fullName = getUser.full_name;
        } else {
            fullName = reqObj.full_name;
        }

        if (typeof reqObj.email == "undefined") {
            emailId = getUser.email;
        } else if (reqObj.email == "") {
            emailId = getUser.email;
        } else {
            emailId = reqObj.email;
        }

        if (typeof reqObj.mobile == "undefined") {
            mobileNo = getUser.mobile;
        } else if (reqObj.mobile == "") {
            mobileNo = getUser.mobile;
        } else {
            mobileNo = reqObj.mobile;
        }

        if (typeof reqObj.gender == "undefined") {
            gendar = getUser.gender;
        } else if (reqObj.gender == "") {
            gendar = getUser.gender;
        } else {
            gendar = reqObj.gender;
        }

        if (typeof reqObj.dob == "undefined") {
            dobs = getUser.dob;
        } else if (reqObj.dob == "") {
            dobs = getUser.dob;
        } else {
            dobs = reqObj.dob;
        }

        let userData = {
            full_name: fullName,
            gender: gendar,
            dob: dobs,
            email: emailId,
            mobile: mobileNo,
        };

        let userLog = {
            user_id: id,
            device_token: getUser.device_token,
            type: "update profile by admin",
            old_value: JSON.stringify(getUser),
            new_value: JSON.stringify(userData),
        };
        let updateUser = await userService.updateUserByQuery(userData, query);
        let updateLog = await userService.addUserLog(userLog);
        responseData.msg = "User Updated successfully!!!";
        responseData.data = {};
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const getGameFields = async (req, res) => {
    let responseData = {};
    try {
        let gameType = req.query.name;
        let subType = req.query.sub_name;

        // let checkGameFields = await adminService.getGameTypeByQuery({game_type_id: subType,game_category_id:gameType})
        // if(!checkGameFields.game_fields_json_data){
        //     responseData.msg = 'Please add fields from game category';
        //     return responseHelper.error(res, responseData, 201);
        // }
        // let gamefield = [];
        // let gameFieldData = JSON.parse(checkGameFields.game_fields_json_data, true);
        // console.log(gameFieldData);
        // gameFieldData = gameFieldData.map((element) => {
        //     let result = {
        //         'field': element.field_name,
        //         'field_type': element.field_name,
        //         'key': element.field_key,
        //         'is_required': element.is_required
        //     }
        //     gamefield.push(result);
        // })
        //console.log(gameFieldData);
        //return false;
        let field;
        if (gameType == 'Poker') {
            var text = subType.toLowerCase();
            if (text.includes("sit n go")) {
                field = [
                    {
                        'field': 'Room Name',
                        'field_type': 'String',
                        'key': 'room_name'
                    },
                    {
                        'field': 'Players',
                        'field_type': 'Number',
                        'key': 'maximum_player'
                    }, {
                        'field': 'Entry Fee',
                        'field_type': 'Number',
                        'key': 'minimum_buyin'
                    },
                    //  {
                    //     'field': 'Ante',
                    //     'field_type': 'Number',
                    //     'key': 'ante'
                    // },
                    {
                        'field': 'Small Blind',
                        'field_type': 'Number',
                        'key': 'small_blind'
                    }, {
                        'field': 'Big Blind',
                        'field_type': 'Number',
                        'key': 'big_blind'
                    },
                    //  {
                    //     'field': 'Time Interval',
                    //     'field_type': 'Number',
                    //     'key': 'time_interval'
                    // },
                    {
                        'field': 'Commission(%)',
                        'field_type': 'Number',
                        'key': 'commission'
                    }, {
                        'field': 'Commission Cap',
                        'field_type': 'Number',
                        'key': 'commission_cap'
                    },
                    {
                        'field': 'Turn Timmer',
                        'field_type': 'Number',
                        'key': 'turn_timmer'
                    },
                    //  {
                    //     'field': 'Multi Run',
                    //     'field_type': 'Boolean',
                    //     'key': 'multi_run'
                    // },
                    // {
                    //     'field': 'Game Timmer',
                    //     'field_type': 'Number',
                    //     'key': 'game_timmer'
                    // },
                    {
                        'field': 'Prize Money',
                        'field_type': 'Number',
                        'key': 'prize_money'
                    },
                    {
                        'field': 'Default Stack',
                        'field_type': 'Number',
                        'key': 'default_stack'
                    },
                    {
                        'field': 'Game Blind Structure',
                        'field_type': 'Number',
                        'key': 'game_blind_id'
                    },
                    {
                        'field': 'Game Prize Structure',
                        'field_type': 'Number',
                        'key': 'game_prize_id'
                    },
                ];
            } else if (text.toLowerCase().includes("tournament")) {
                field = [
                    {
                        'field': 'Room Name',
                        'field_type': 'String',
                        'key': 'room_name'
                    }, {
                        'field': 'Maximum Players for tournament',
                        'field_type': 'Number',
                        'key': 'maximum_player'
                    }, {
                        'field': 'Maximum Players on Table',
                        'field_type': 'Number',
                        'key': 'maximum_player_in_table'
                    },
                    {
                        'field': 'Minimum Players for tournament',
                        'field_type': 'Number',
                        'key': 'minimum_player'
                    },
                    {
                        'field': 'Entry Fee',
                        'field_type': 'Number',
                        'key': 'minimum_buyin'
                    }, {
                        'field': 'Ante',
                        'field_type': 'Number',
                        'key': 'ante'
                    }, {
                        'field': 'Small Blind',
                        'field_type': 'Number',
                        'key': 'small_blind'
                    }, {
                        'field': 'Big Blind',
                        'field_type': 'Number',
                        'key': 'big_blind'
                    }, {
                        'field': 'Time Interval',
                        'field_type': 'Number',
                        'key': 'time_interval'
                    }, {
                        'field': 'Commission(%)',
                        'field_type': 'Number',
                        'key': 'commission'
                    }, {
                        'field': 'Commission Cap',
                        'field_type': 'Number',
                        'key': 'commission_cap'
                    }, {
                        'field': 'Turn Timmer',
                        'field_type': 'Number',
                        'key': 'turn_timmer'
                    }, {
                        'field': 'Multi Run',
                        'field_type': 'Boolean',
                        'key': 'multi_run'
                    }, {
                        'field': 'Game Timmer',
                        'field_type': 'Number',
                        'key': 'game_timmer'
                    },
                    {
                        'field': 'Prize Money',
                        'field_type': 'Number',
                        'key': 'prize_money'
                    },
                    {
                        'field': 'Default Stack',
                        'field_type': 'Number',
                        'key': 'default_stack'
                    },
                    {
                        'field': 'Start Date and Time',
                        'field_type': 'Number',
                        'key': 'start_date'
                    },
                    {
                        'field': 'Registration Start Date and Time',
                        'field_type': 'Number',
                        'key': 'registration_start_date'
                    },
                    {
                        'field': 'Registration End Date and Time',
                        'field_type': 'Number',
                        'key': 'registration_end_date'
                    },
                    {
                        'field': 'Rebuy In Until Level',
                        'field_type': 'Number',
                        'key': 'rebuy_in_until_level'
                    },
                    {
                        'field': 'Add on Until Level',
                        'field_type': 'Number',
                        'key': 'add_on_until_level'
                    },
                    {
                        'field': 'Game Blind Structure',
                        'field_type': 'Number',
                        'key': 'game_blind_id'
                    },
                    {
                        'field': 'Game Prize Structure',
                        'field_type': 'Number',
                        'key': 'game_prize_id'
                    },
                ];
            } else {
                field = [
                    {
                        'field': 'Room Name',
                        'field_type': 'String',
                        'key': 'room_name'
                    },

                    {
                        'field': 'Minimum Player',
                        'field_type': 'Number',
                        'key': 'minimum_player'
                    }, {
                        'field': 'Maximum Player',
                        'field_type': 'Number',
                        'key': 'maximum_player'
                    }, {
                        'field': 'Minimum BuyIn',
                        'field_type': 'Number',
                        'key': 'minimum_buyin'
                    }, {
                        'field': 'Maximum BuyIn',
                        'field_type': 'Number',
                        'key': 'maximum_buyin'
                    }, {
                        'field': 'Small Blind',
                        'field_type': 'Number',
                        'key': 'small_blind'
                    }, {
                        'field': 'Big Blind',
                        'field_type': 'Number',
                        'key': 'big_blind'
                    }, {
                        'field': 'Commission(%)',
                        'field_type': 'Number',
                        'key': 'commission'
                    }, {
                        'field': 'Commission Cap',
                        'field_type': 'Number',
                        'key': 'commission_cap'
                    },
                    {
                        'field': 'Turn Timmer',
                        'field_type': 'Number',
                        'key': 'turn_timmer'
                    },
                    //  {
                    //     'field': 'Multi Run',
                    //     'field_type': 'Boolean',
                    //     'key': 'multi_run'
                    // },
                    // {
                    //     'field': 'Game Timmer',
                    //     'field_type': 'Number',
                    //     'key': 'game_timmer'
                    // },
                    // {
                    //     'field': 'Default Stack',
                    //     'field_type': 'Number',
                    //     'key': 'default_stack'
                    // }
                ];
            }

        }
        if (gameType == 'Pool') {
            field = [
                {
                    'field': 'Name',
                    'field_type': 'Text',
                    'key': 'name'
                }, {
                    'field': 'Description',
                    'field_type': 'Text',
                    'key': 'description'
                }, {
                    'field': 'BuyIn Amount',
                    'field_type': 'Number',
                    'key': 'buyin_amount'
                }, {
                    'field': 'Status',
                    'field_type': 'Text',
                    'key': 'status'
                }, {
                    'field': 'Game Type',
                    'field_type': 'Enum',
                    'key': 'game_type'
                }
            ];
        }
        if (gameType == 'Rummy') {
            field = [
                {
                    'field': 'Rummy Code',
                    'field_type': 'Number',
                    'key': 'rummy_code'
                },
                {
                    'field': 'Maximum Player',
                    'field_type': 'Number',
                    'key': 'maximum_player'
                },
                {
                    'field': 'Name',
                    'field_type': 'String',
                    'key': 'name'
                },
                {
                    'field': 'Commission(%)',
                    'field_type': 'Number',
                    'key': 'commission'
                },
                {
                    'field': 'Entry Fee',
                    'field_type': 'Number',
                    'key': 'entry_fee'
                }
            ];
            if (subType == 'Pool') field.push({
                'field': 'Pool Type',
                'field_type': 'Number',
                'key': 'pool_type'
            })
            if (subType == 'Point') field.push(
                {
                    'field': 'Point Value',
                    'field_type': 'Number',
                    'key': 'point_value'
                },
                {
                    'field': 'Is Practice',
                    'field_type': 'Number',
                    'key': 'is_practice'
                }
            )
            if (subType == 'Deal') field.push( {
                    'field': 'Deal Type',
                    'field_type': 'Number',
                    'key': 'deal_type'
                }
            )
        }
        if (gameType == 'Ludo') {
            field = [
                {
                    'field': 'Name',
                    'field_type': 'Text',
                    'key': 'Name'
                }, {
                    'field': 'Varient',
                    'field_type': 'Dropdown',
                    'key': 'varient_id'
                },
                {
                    'field': 'Commission(%)',
                    'field_type': 'Number',
                    'key': 'commission'
                },
            ];
        }
        responseData.msg = 'Get Form Fields';
        responseData.data = field;
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

        userData = await adminService.geAdminDetailsById({email: email});
        query = {
            email: email,
        };
        if (!userData) {
            responseData.msg = "no user found";
            return responseHelper.error(res, responseData, 201);
        }
        let otp = "123456";
        //let otp = OTP();
        let htmlB =
            "<html><body><p>Hello , " +
            "This is your one time password (" +
            otp +
            ") for forgot password. Please don't share to anyone.</p></body></html>";
        let subject = "Forgot Password OTP";
        //await SendWaitlistEmail(userData, htmlB, subject)
        console.log("otp", otp);

        await adminService.updateAdminByQuery({otp: otp, is_verify: "0"}, query);
        responseData.msg = "OTP has been sent successfully to your email id!!!";
        responseData.data = {otp: otp};
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 201);
    }
};

const verifyOtpForForgotPassword = async (req, res) => {
    let email = req.body.email;
    let otp = req.body.otp;
    let responseData = {};
    try {
        let userData;
        let updateObj;
        let query;
        userData = await adminService.geAdminDetailsById({email: email});
        updateObj = {
            otp: null,
            is_verify: "1",
        };
        if (!userData) {
            responseData.msg = "no user found";
            return responseHelper.error(res, responseData, 201);
        }

        if (userData.otp != otp) {
            responseData.msg = "Invalid Otp";
            return responseHelper.error(res, responseData, 201);
        }

        let updatedUser = await adminService.updateAdminByQuery(updateObj, {
            email: email,
        });
        if (!updatedUser) {
            responseData.msg = "failed to verify user";
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = "Your account has been successfully verified!!!";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const resetPassword = async (req, res) => {
    let email = req.body.email;
    let newPassword = req.body.password;
    let responseData = {};
    try {
        let userData;
        let query;

        userData = await adminService.geAdminDetailsById({email: email});
        query = {
            email: email,
        };
        if (!userData) {
            responseData.msg = "no user found";
            return responseHelper.error(res, responseData, 201);
        }

        if (userData.is_verify == "0") {
            responseData.msg = "Please verify your otp";
            return responseHelper.error(res, responseData, 201);
        }
        let encryptedPassword = await encryptPassword(newPassword);
        let updateUserQuery = {
            password: encryptedPassword,
        };

        let updatedUser = await adminService.updateAdminByQuery(
            updateUserQuery,
            query
        );
        if (!updatedUser) {
            responseData.msg = "failed to reset password";
            return responseHelper.error(res, responseData, 201);
        }

        responseData.msg =
            "Password updated successfully! Please Login to continue";
        return responseHelper.successWithType(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const addPriceStructure = async (req, res) => {
    let responseData = {};
    try {
        let {name, price_structure_json_data} = req.body;
        let data = {
            price_structure_name: name,
            price_structure_json_data: JSON.stringify(price_structure_json_data),
            added_by: req.user.admin_id,
        };
        let save = await adminService.createPriceStructure(data);
        responseData.msg = "Added Done";
        return responseHelper.success(res, responseData);
    } catch (error) {
        console.log(error);
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const priceStructureList = async (req, res) => {
    let responseData = {};
    try {
        let getData = await adminService.getAllPriceStructureList();
        if (!getData) {
            responseData.msg = "Price List not found";
            return responseHelper.error(res, responseData, 201);
        }
        getData = getData.map(async (element, i) => {
            element.dataValues.price_structure_json_data = JSON.parse(
                element.price_structure_json_data,
                true
            );
            return element;
        });
        getData = await Promise.all(getData);
        responseData.msg = "Price List";
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const priceStructureById = async (req, res) => {
    let responseData = {};
    try {
        let id = req.params.id;
        let getData = await adminService.getPriceStructureByQuery({price_id: id});
        if (!getData) {
            responseData.msg = "Price Data not found";
            return responseHelper.error(res, responseData, 201);
        }
        (getData.price_structure_json_data = JSON.parse(
            getData.price_structure_json_data,
            true
        )),
            (responseData.msg = "Price Detail");
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const updatePriceStructureById = async (req, res) => {
    let responseData = {};
    try {
        let {id, price_structure_json_data, name} = req.body;
        let data = {
            price_structure_name: name,
            price_structure_json_data: JSON.stringify(price_structure_json_data),
            updated_by: req.user.admin_id,
        };
        let getData = await adminService.getPriceStructureByQuery({price_id: id});
        if (!getData) {
            responseData.msg = "Price Data not found";
            return responseHelper.error(res, responseData, 201);
        }
        let updateData = await adminService.updatePriceStructureById(data, {
            price_id: id,
        });
        responseData.msg = "Price Update Successfully";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const deletePriceStructure = async (req, res) => {
    let responseData = {};
    try {
        let {id} = req.query;
        let getData = await adminService.getGameByQuery({game_prize_id: id});
        if (getData) {
            responseData.msg = "This price added in game";
            return responseHelper.error(res, responseData, 201);
        }
        await adminService.deletePrice({price_id: id});
        responseData.msg = "Price deleted Successfully";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};
const addBlindStructure = async (req, res) => {
    let responseData = {};
    try {
        let {name, blind_structure_json_data} = req.body;
        let data = {
            blind_structure_name: name,
            blind_structure_json_data: JSON.stringify(blind_structure_json_data),
            added_by: req.user.admin_id,
        };
        let save = await adminService.createBlindStructure(data);
        responseData.msg = "Added Done";
        return responseHelper.success(res, responseData);
    } catch (error) {
        console.log(error);
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const blindStructureList = async (req, res) => {
    let responseData = {};
    try {
        let getData = await adminService.getAllBlindStructureList();
        if (!getData) {
            responseData.msg = "Blind List not found";
            return responseHelper.error(res, responseData, 201);
        }
        getData = getData.map(async (element, i) => {
            element.dataValues.blind_structure_json_data = JSON.parse(
                element.blind_structure_json_data,
                true
            );
            return element;
        });
        getData = await Promise.all(getData);
        responseData.msg = "Blind List";
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const blindStructureById = async (req, res) => {
    let responseData = {};
    try {
        let id = req.params.id;
        let getData = await adminService.getBlindStructureByQuery({blind_id: id});
        if (!getData) {
            responseData.msg = "Game Data not found";
            return responseHelper.error(res, responseData, 201);
        }

        getData.blind_structure_json_data = JSON.parse(
            getData.blind_structure_json_data,
            true
        );
        responseData.msg = "Game Detail";
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const updateBlindStructureById = async (req, res) => {
    let responseData = {};
    try {
        let {id, name, blind_structure_json_data} = req.body;
        let data = {
            blind_structure_name: name,
            blind_structure_json_data: JSON.stringify(blind_structure_json_data),
            updated_by: req.user.admin_id,
        };
        let getData = await adminService.getBlindStructureByQuery({blind_id: id});
        if (!getData) {
            responseData.msg = "Blind Data not found";
            return responseHelper.error(res, responseData, 201);
        }
        let updateData = await adminService.updateBlindStructureById(data, {
            blind_id: id,
        });
        responseData.msg = "Blind Update Successfully";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const deleteBlindStructure = async (req, res) => {
    let responseData = {};
    try {
        let {id} = req.query;
        let getData = await adminService.getGameByQuery({game_blind_id: id});
        if (getData) {
            responseData.msg = "This blind data added in game";
            return responseHelper.error(res, responseData, 201);
        }
        await adminService.deleteBlindStructures({blind_id: id});
        responseData.msg = "Blind Structure deleted Successfully";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};
const getClubList = async (req, res) => {
    let responseData = {};
    try {
        let result = await adminService.getClubList({raw: true});
        if (result.length == 0) {
            responseData.msg = "Club not found";
            return responseHelper.error(res, responseData, 201);
        }
        console.log(result);
        result = result.map(async (element) => {
            let clubOwner = await userService.getUserDetailsById({
                user_id: element.club_adminId,
            });
            console.log("element.clubId", element.clubId);
            let clubJoined = await adminService.getJoinedclub({
                where: {
                    clubId: element.clubId,
                },
            });
            console.log("clubjoined-->", clubJoined);
            element.club_owner = clubOwner ? clubOwner.username : "";
            element.club_request_count = clubJoined.length;
            return element;
        });
        result = await Promise.all(result);
        responseData.msg = "Club List";
        responseData.data = result;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const getClubDetail = async (req, res) => {
    let responseData = {};
    try {
        let clubId = req.query.club_id;
        console.log("clubId-->", clubId);
        let result = await adminService.getClubDetailById({
            where: {clubId: clubId},
        });
        console.log("result-->", result);
        if (!result) {
            responseData.msg = "Club not found";
            return responseHelper.error(res, responseData, 201);
        }
        let clubOwner = await userService.getUserDetailsById({
            user_id: result.club_adminId,
        });
        result.dataValues.club_owner = clubOwner ? clubOwner.username : "";

        let clubMembers = await adminService.getJoinedclub({
            clubId: clubId,
            is_approve: "1",
        });
        let memArr = [];
        for (let i = 0; i < clubMembers.length; i++) {
            let memberDet = await userService.getUserDetailsById({
                user_id: clubMembers[i].user_id,
            });
            let data = {
                member_id: clubMembers[i].user_id,
                member_name: memberDet ? memberDet.username : "",
                chips: clubMembers[i].chips,
                amount: clubMembers[i].amount,
                deducted_Amount: 0,
            };
            memArr.push(data);
        }
        result.dataValues.members = memArr;
        responseData.msg = "Club Detail";
        responseData.data = result;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const changeClubStatus = async (req, res) => {
    let responseData = {};
    try {
        const {id, status} = req.body;
        let checkRole = await adminService.getClubDetailById({clubId: id});
        if (!checkRole) {
            responseData.msg = "Club not found";
            return responseHelper.error(res, responseData, 201);
        }
        let roleObj = {
            club_status: status,
            updated_by: req.user.admin_id,
        };
        await adminService.updateClubById(roleObj, {clubId: id});
        responseData.msg = "Status Updated";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const createVipPriviledge = async (req, res) => {
    let responseData = {};
    try {
        let {
            card_feature_title,
            days,
            all_in_equity,
            rabbit_hunting,
            more_login_report,
            retail_detail,
            rival_data_display,
            club_data,
            extra_disconnect_protection,
            exclusive_emojis,
            club_creation_limit,
            free_emojis,
            free_time_bank,
            purchase_diamond,
            purchase_coin,
            purchase_point,
        } = req.body;
        let reqObj = {
            card_feature_title,
            days,
            all_in_equity,
            rabbit_hunting,
            more_login_report,
            retail_detail,
            rival_data_display,
            club_data,
            extra_disconnect_protection,
            exclusive_emojis,
            club_creation_limit,
            free_emojis,
            free_time_bank,
            purchase_diamond,
            purchase_coin,
            purchase_point,
        };

        await adminService.createVipPriviledge(reqObj);
        responseData.msg = "Vip Priviledge created done";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};
const updateVipPriviledge = async (req, res) => {
    let responseData = {};
    try {
        let {
            id,
            card_feature_title,
            days,
            all_in_equity,
            rabbit_hunting,
            more_login_report,
            retail_detail,
            rival_data_display,
            club_data,
            extra_disconnect_protection,
            exclusive_emojis,
            club_creation_limit,
            free_emojis,
            free_time_bank,
            purchase_diamond,
            purchase_coin,
            purchase_point,
        } = req.body;
        let reqObj = {
            card_feature_title,
            days,
            all_in_equity,
            rabbit_hunting,
            more_login_report,
            retail_detail,
            rival_data_display,
            club_data,
            extra_disconnect_protection,
            exclusive_emojis,
            club_creation_limit,
            free_emojis,
            free_time_bank,
            purchase_diamond,
            purchase_coin,
            purchase_point,
        };
        let check = await adminService.getVipPriviledgeById({id: id});
        if (!check) {
            responseData.msg = "Data not found";
            return responseHelper.error(res, responseData, 201);
        }
        await adminService.updateVipPriviledge(reqObj, {where: {id: id}});
        responseData.msg = "Vip Priviledge updated done";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const getVipPriviledgeById = async (req, res) => {
    let responseData = {};
    try {
        let id = req.query.id;
        let check = await adminService.getVipPriviledgeById({id: id});
        if (!check) {
            responseData.msg = "Data not found";
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = "Vip priviledge detail";
        responseData.data = check;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const getAllVipPriviledge = async (req, res) => {
    let responseData = {};
    try {
        let check = await adminService.getAllVipPriviledge({
            where: {status: {[Op.ne]: "2"}},
        });
        if (check.length == 0) {
            responseData.msg = "Data not found";
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = "Vip priviledge list";
        responseData.data = check;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const changeVipPriviledgeStatus = async (req, res) => {
    let responseData = {};
    try {
        const {id, status} = req.body;
        let checkRole = await adminService.getVipPriviledgeById({id: id});
        if (!checkRole) {
            responseData.msg = "Data not found";
            return responseHelper.error(res, responseData, 201);
        }
        let roleObj = {
            status: status,
            updated_by: req.user.admin_id,
        };
        await adminService.updateVipPriviledge(roleObj, {where: {id: id}});
        responseData.msg = "Status Updated";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const addClubLevel = async (req, res) => {
    let responseData = {};
    try {
        let {name, validity, diamond, manager, member, rating} = req.body;
        let reqObj = {name, validity, diamond, manager, member, rating};
        reqObj.added_by = req.user.admin_id;
        await adminService.addClubLevel(reqObj);
        responseData.msg = "Club Level added";
        responseData.data = {};
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const updateClubLevel = async (req, res) => {
    let responseData = {};
    try {
        let {id, name, validity, diamond, manager, member, rating} = req.body;
        let reqObj = {name, validity, diamond, manager, member, rating};
        let check = await adminService.getClubLevelById({where: {id: id}});
        if (!check) {
            responseData.msg = "Data not found";
            return responseHelper.error(res, responseData, 201);
        }
        reqObj.updated_by = req.user.admin_id;
        await adminService.updateClubLevel(reqObj, {where: {id: id}});
        responseData.msg = "Club Level updated";
        responseData.data = {};
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const getClubLevelById = async (req, res) => {
    let responseData = {};
    try {
        let id = req.query.id;
        let check = await adminService.getClubLevelById({where: {id: id}});
        if (!check) {
            responseData.msg = "Data not found";
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = "Club Level detail";
        responseData.data = check;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const getAllClubLevel = async (req, res) => {
    let responseData = {};
    try {
        let check = await adminService.getAllClubLevel({});
        if (check.length == 0) {
            responseData.msg = "Data not found";
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = "Club Level list";
        responseData.data = check;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const addShop = async (req, res) => {
    let responseData = {};
    try {
        let {
            category,
            sub_category,
            from_purchase,
            get_purchase,
            purchase_value,
            get_value,
            is_offer,
        } = req.body;
        let reqObj = {
            category,
            sub_category,
            from_purchase,
            get_purchase,
            purchase_value,
            get_value,
            is_offer,
        };
        reqObj.added_by = req.user.admin_id;
        await adminService.addShop(reqObj);
        responseData.msg = "Shop added";
        responseData.data = {};
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const updateShop = async (req, res) => {
    let responseData = {};
    try {
        let {
            id,
            category,
            sub_category,
            from_purchase,
            get_purchase,
            purchase_value,
            get_value,
            is_offer,
        } = req.body;
        let reqObj = {
            category,
            sub_category,
            from_purchase,
            get_purchase,
            purchase_value,
            get_value,
            is_offer,
        };
        reqObj.updated_by = req.user.admin_id;
        await adminService.updateShop(reqObj, {where: {id: id}});
        responseData.msg = "Shop updated";
        responseData.data = {};
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const getShopById = async (req, res) => {
    let responseData = {};
    try {
        let id = req.query.id;
        let check = await adminService.getShopById({where: {id: id}});
        if (!check) {
            responseData.msg = "Data not found";
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = "Shop detail";
        responseData.data = check;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const getAllShop = async (req, res) => {
    let responseData = {};
    try {
        let check = await adminService.getAllShop({
            where: {status: {[Op.ne]: "2"}},
        });
        if (check.length == 0) {
            responseData.msg = "Data not found";
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = "shop list";
        responseData.data = check;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const changeShopStatus = async (req, res) => {
    let responseData = {};
    try {
        const {id, status} = req.body;
        let checkRole = await adminService.getShopById({where: {id: id}});
        if (!checkRole) {
            responseData.msg = "Shop not found";
            return responseHelper.error(res, responseData, 201);
        }
        let roleObj = {
            status: status,
            updated_by: req.user.admin_id,
        };
        await adminService.updateShop(roleObj, {where: {id: id}});
        responseData.msg = "Status Updated";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const addMission = async (req, res) => {
    let responseData = {};
    try {
        let {image, mission_type, description, value, time_interval} = req.body;
        let reqObj = {image, mission_type, description, value, time_interval};
        reqObj.added_by = req.user.admin_id;
        await adminService.addMission(reqObj);
        responseData.msg = "Mission added";
        responseData.data = {};
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const updateMission = async (req, res) => {
    let responseData = {};
    try {
        let {id, image, mission_type, description, value, time_interval} =
            req.body;
        let reqObj = {image, mission_type, description, value, time_interval};
        reqObj.updated_by = req.user.admin_id;
        await adminService.updateMission(reqObj, {where: {id: id}});
        responseData.msg = "Mission updated";
        responseData.data = {};
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const getMissionById = async (req, res) => {
    let responseData = {};
    try {
        let id = req.query.id;
        let check = await adminService.getMissionById({where: {id: id}});
        if (!check) {
            responseData.msg = "Data not found";
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = "Mission detail";
        responseData.data = check;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const getAllMission = async (req, res) => {
    let responseData = {};
    try {
        let check = await adminService.getAllMission({});
        if (check.length == 0) {
            responseData.msg = "Data not found";
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = "mission list";
        responseData.data = check;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};
const memberDetails = async (req, res) => {
    let responseData = {};
    try {
        let memberId = req.query.member_id;
        let type = req.query.type;
        let memberD = await userService.getUserDetailsById({user_id: memberId});
        if (type == 1) {
        } else if (type == 2) {
        } else {
        }
        let result = {
            username: memberD.username,
            profile_pic: memberD.profile_pic,
            winning: 0,
            hands: 0,
            bb_100: 0,
            mtt_winnings: 0,
            spinup_buy_in: 0,
            fee: 0,
        };

        responseData.msg = "Member details";
        responseData.data = result;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const uploadImage = async (req, res) => {
    let responseData = {};
    try {
        console.log(req.file);
        responseData.msg = "File upload";
        responseData.data = req.file.location;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};
const addModule = async (req, res) => {
    let responseData = {};
    try {
        const {module_name, parent_id, is_Sidebar, api_method, routes, icon} =
            req.body;
        console.log("req.body", req.body.is_Sidebar);
        let existingModule = await adminService.getModuleByName(module_name);
        console.log("existingModule-->", existingModule);
        if (existingModule) {
            responseData.msg = "Module with the same name already exists";
            return responseHelper.error(res, responseData, 201);
        }
        let moduleObj = {
            moduleName: module_name,
            parentId: parent_id,
            isSidebar: is_Sidebar,
            apiMethod: api_method,
            routes: routes,
            icon: icon,
        };

        console.log("moduleObj", moduleObj);
        await adminService.createModule(moduleObj);

        responseData.msg = "Module added successfully";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};
const updateModule = async (req, res) => {
    let responseData = {};
    try {
        const {
            module_id,
            module_name,
            parent_id,
            is_Sidebar,
            api_method,
            routes,
            icon,
        } = req.body;
        console.log("req.body", req.body.is_Sidebar);
        let existingModule = await adminService.getModuleById(module_id);
        if (!existingModule) {
            responseData.msg = "Module with the given ID does not exist";
            return responseHelper.error(res, responseData, 404);
        }

        // Check if module name is being updated and it's not conflicting with existing modules
        if (module_name !== existingModule.moduleName) {
            let moduleWithName = await adminService.getModuleByName(module_name);
            if (moduleWithName) {
                responseData.msg = "Module with the same name already exists";
                return responseHelper.error(res, responseData, 409);
            }
        }

        let updatedModuleObj = {
            moduleName: module_name,
            parentId: parent_id,
            isSidebar: is_Sidebar,
            apiMethod: api_method,
            routes: routes,
            icon: icon,
        };

        console.log("updatedModuleObj", updatedModuleObj);
        await adminService.updateModule(updatedModuleObj, {
            where: {moduleId: module_id},
        });
        // await adminService.updateClubLevel(reqObj, { where: { id: id } });

        responseData.msg = "Module updated successfully";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const delModule = async (req, res) => {
    let responseData = {};
    try {
        const {module_name} = req.body;

        let existingModule = await adminService.getModuleByName(module_name);
        if (!existingModule) {
            responseData.msg = "Module does not exist";
            return responseHelper.error(res, responseData, 404);
        }
        await adminService.deleteModule(existingModule.moduleId);

        responseData.msg = "Module deleted successfully";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};
const addRoleModule = async (req, res) => {
    let responseData = {};
    try {
        const {module_ids, role_id} = req.body; // Assuming module_ids is an array
        for (const module_id of module_ids) {
            const existingRoleModule =
                await adminService.getRoleModuleByModuleIdAndRoleId({
                    moduleId: module_id,
                    roleId: role_id,
                });

            if (existingRoleModule) {
                responseData.msg =
                    "Role module with the same moduleId and roleId already exists";
                return res.status(400).json(responseData);
            }

            let moduleObj = {
                moduleId: module_id,
                roleId: role_id,
                addedBy: req.user.admin_id,
            };

            await adminService.createRoleModule(moduleObj);
        }

        responseData.msg = "Role modules added successfully";
        return responseHelper.success(res, responseData);
    } catch (error) {
        console.error("Error creating role modules:", error);
        responseData.msg = "Error creating role modules";
        return res.status(500).json(responseData);
    }
};

const deleteRoleModule = async (req, res) => {
    let responseData = {};
    try {
        const {module_id, role_id} = req.body;
        const existingRoleModule =
            await adminService.getRoleModuleByModuleIdAndRoleId({
                moduleId: module_id,
                roleId: role_id,
            });

        if (!existingRoleModule) {
            responseData.msg = "Role module does not exist";
            return res.status(404).json(responseData);
        }
        await adminService.deleteRoleModule(existingRoleModule.id);

        responseData.msg = "Role module deleted successfully";
        return responseHelper.success(res, responseData);
    } catch (error) {
        console.error("Error deleting role module:", error);
        responseData.msg = "Error deleting role module";
        return res.status(500).json(responseData);
    }
};
const updateRoleModules = async (req, res) => {
    try {
        const {role_id, permit_module_ids, not_permit_module_ids} = req.body;

        // Validate input parameters
        if (
            !Array.isArray(permit_module_ids) ||
            !Array.isArray(not_permit_module_ids) ||
            !role_id
        ) {
            return res.status(400).json({msg: "Invalid input data"});
        }

        for (const module_id of permit_module_ids) {
            const existingRoleModule =
                await adminService.getRoleModuleByModuleIdAndRoleId({
                    moduleId: module_id,
                    roleId: role_id,
                });

            if (!existingRoleModule) {
                const moduleObj = {
                    moduleId: module_id,
                    roleId: role_id,
                    addedBy: req.user.admin_id,
                };
                await adminService.createRoleModule(moduleObj);
            }
        }

        // Delete non-permitted modules
        for (const module_id of not_permit_module_ids) {
            const existingRoleModule =
                await adminService.getRoleModuleByModuleIdAndRoleId({
                    moduleId: module_id,
                    roleId: role_id,
                });

            if (existingRoleModule) {
                await adminService.deleteRoleModule(existingRoleModule.id);
            }
        }

        return res.status(200).json({msg: "Role modules updated successfully"});
    } catch (error) {
        console.error("Error updating role modules:", error);
        return res.status(500).json({msg: "Error updating role modules"});
    }
};

const addUserRole = async (req, res) => {
    let responseData = {};
    try {
        const {user_id, role_ids} = req.body;
        let userData = await adminService.geAdminDetailsById({user_id: user_id});
        console.log("userData-->", userData);
        if (!userData) {
            let userDetail = await userService.getUserDetailsById({
                user_id: user_id,
            });
            if (!userDetail) {
                responseData.msg = "User does not exist in our system";
                return res.status(404).json(responseData);
            }

            if (!userDetail.email) {
                responseData.msg = "Email not found";
                return res.status(400).json(responseData);
            }

            userDetail.admin_status = "1";
            await adminService.createAdminUser(userDetail);
        }

        for (const role_id of role_ids) {
            let userData = await adminService.geAdminDetailsById({
                user_id: user_id,
            });
            console.log("userData-->", userData);
            const existingUserRole = await adminService.getUserRoleByUserIdAndRoleId({
                // userId: user_id,
                userId: userData.admin_id,
                roleId: role_id,
            });
            console.log("existingUserRole-->", existingUserRole);
            if (existingUserRole) {
                responseData.msg = "User role already exists";
                return res.status(400).json(responseData);
            }

            const newUserRole = {
                userId: userData.admin_id,
                roleId: role_id,
                addedBy: req.user.admin_id,
            };

            await adminService.createUserRole(newUserRole);
        }

        responseData.msg = "User roles added successfully";
        responseData.data = {user_id, role_ids};
        return res.status(201).json(responseData);
    } catch (error) {
        console.error("Error creating user roles:", error);
        responseData.msg = "Error creating user roles";
        return res.status(500).json(responseData);
    }
};

const deleteUserRole = async (req, res) => {
    let responseData = {};
    try {
        const {user_id, role_id} = req.body;
        const existingRoleModule = await adminService.getUserRoleByUserIdAndRoleId({
            userId: user_id,
            roleId: role_id,
        });

        if (!existingRoleModule) {
            responseData.msg = "User Role does not exist";
            return res.status(404).json(responseData);
        }
        await adminService.deleteUserRole(existingRoleModule.id);

        responseData.msg = "Role module deleted successfully";
        return responseHelper.success(res, responseData);
    } catch (error) {
        console.error("Error deleting role module:", error);
        responseData.msg = "Error deleting role module";
        return res.status(500).json(responseData);
    }
};
const updateUserRole = async (req, res) => {
    let responseData = {};
    try {
        const {user_id, permit_role_ids, not_permit_role_ids} = req.body;
        let userData = await adminService.geAdminDetailsById({user_id: user_id});
        console.log("userData-->", userData);
        if (!userData) {
            let userDetail = await userService.getUserDetailsById({
                user_id: user_id,
            });
            if (!userDetail) {
                responseData.msg = "User does not exist in our system";
                return res.status(404).json(responseData);
            }

            userDetail.admin_status = "1";
            await adminService.createAdminUser(userDetail);
        }

        // // Validate input parameters
        // if (!user_id || !Array.isArray(permit_role_ids) || !Array.isArray(not_permit_role_ids)) {
        //   responseData.msg = "Invalid input data";
        //   return res.status(400).json(responseData);
        // }


        // if (!userData) {
        //   responseData.msg = "User does not exist in our system";
        //   return responseHelper.error(res, responseData, 404);
        // }

        let userData_admin = await adminService.geAdminDetailsById({user_id: user_id});
        console.log("req.user", req.user);
        console.log("userData_admin--->", userData_admin);
        // Check if any permitted role already exists
        for (const role_id of permit_role_ids) {

            const existingUserRole = await adminService.getUserRoleByUserIdAndRoleId({
                userId: userData_admin.admin_id,
                roleId: role_id,
            });

            if (existingUserRole) {
                responseData.msg =
                    "User role with the same userId and roleId already exists";
                return res.status(400).json(responseData);
            }
        }


        for (const role_id of permit_role_ids) {

            const newUserRole = {
                userId: userData_admin.admin_id,
                roleId: role_id,
                addedBy: 1,
            };
            await adminService.createUserRole(newUserRole);
        }

        for (const role_id of not_permit_role_ids) {

            const existingUserRole = await adminService.getUserRoleByUserIdAndRoleId({
                userId: userData_admin.admin_id,
                roleId: role_id,
            });

            if (existingUserRole) {
                await adminService.deleteUserRole(existingUserRole.id);
            }
        }

        responseData.msg = "User roles updated successfully";
        return res.status(201).json(responseData);
    } catch (error) {
        console.error("Error updating user roles:", error);
        responseData.msg = "Error updating user roles";
        return res.status(500).json(responseData);
    }
};

const getAllModules = async (req, res) => {
    let responseData = {};
    try {
        const roleId = req.query.role_id;
        console.log("adminId", roleId);
        const allModules = await adminService.getAllModules();

        const modulesIds = `
            SELECT role_modules.moduleId
            FROM roles
                     INNER JOIN role_modules ON roles.role_id = role_modules.roleId
            WHERE roles.role_id = ${roleId}
        `;

        modulesIdsData = await sequelize.query(modulesIds, {
            type: QueryTypes.SELECT,
        });

        const formattedIds = modulesIdsData.map((roleObj) => {
            return roleObj.moduleId;
        });

        console.log("getRolesResult", formattedIds);

        const moduleIds = formattedIds;

        if (moduleIds.length === 0) {
            const allModulesUpdated = allModules.map((module) => ({
                ...module,
                isActive: false,
            }));
            responseData.msg = "No roles assigned";
            responseData.modules = allModulesUpdated;
            return responseHelper.success(res, responseData);
        }

        let recursiveQuery = `
            WITH RECURSIVE ModuleHierarchy AS (SELECT m.moduleId,
                                                      m.moduleName,
                                                      m.isSidebar,
                                                      m.apiMethod,
                                                      m.routes,
                                                      m.parentId,
                                                      m.icon
                                               FROM modules m
                                               WHERE m.moduleId IN (${moduleIds.join(", ")}) -- Inject module IDs here

                                               UNION ALL

                                               SELECT m.moduleId,
                                                      m.moduleName,
                                                      m.isSidebar,
                                                      m.apiMethod,
                                                      m.routes,
                                                      m.parentId,
                                                      m.icon
                                               FROM ModuleHierarchy mh
                                                        INNER JOIN modules m ON m.parentId = mh.moduleId -- Fetch child modules where parentId matches moduleId
            )
            SELECT mh.moduleId,
                   mh.moduleName,
                   mh.isSidebar,
                   mh.apiMethod,
                   mh.routes,
                   mh.parentId,
                   mh.icon
            FROM ModuleHierarchy mh;
        `;

        modulesIdsData = await sequelize.query(recursiveQuery, {
            type: QueryTypes.SELECT,
        });

        // Create a set of moduleIds for quick lookup
        const modulesWithAccessIds = new Set(
            modulesIdsData.map((module) => module.moduleId)
        );

        // Add isActive field to each module in allModules
        const allModulesWithIsActive = allModules.map((module) => ({
            ...module,
            isActive: modulesWithAccessIds.has(module.moduleId),
        }));

        responseData.modules = allModulesWithIsActive; // Return allModules with isActive field
        return responseHelper.success(res, responseData);
    } catch (error) {
        console.error("Error:", error);
        responseData.msg = "Internal server error";
        return responseHelper.error(res, responseData, 500);
    }
};

const addMemberRole = async (req, res) => {
    let responseData = {};
    try {
        const {member_role} = req.body;

        // Validation
        if (!member_role) {
            responseData.msg = "Member role is required";
            return responseHelper.error(res, responseData, 400);
        }

        // Create the member role
        const roleData = {
            member_role
        };

        // await club_member_roles(roleData);
        await adminService.createClubMemberRole(roleData);

        responseData.msg = "Member role created successfully";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};
const addclubModule = async (req, res) => {
    let responseData = {};
    try {
        const {module_name, parent_id, is_Sidebar, api_method, routes, icon} =
            req.body;
        // console.log("req.body", req.body.is_Sidebar);
        // let existingModule = await adminService.getModuleByName(module_name);
        // if (existingModule) {
        //   responseData.msg = "Module with the same name already exists";
        //   return responseHelper.error(res, responseData, 201);
        // }
        let moduleObj = {
            moduleName: module_name,
            parentId: parent_id,
            isSidebar: is_Sidebar,
            apiMethod: api_method,
            routes: routes,
            icon: icon,
        };

        // console.log("moduleObj", moduleObj);
        await adminService.createclubModule(moduleObj);

        responseData.msg = "Module added successfully";
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};


const addclubMemberRoleModule = async (req, res) => {
    let responseData = {};
    try {
        const {clubMemberRoleId, moduleId} = req.body; // Assuming module_ids is an array


        let Obj = {
            clubMemberRoleId: clubMemberRoleId,
            moduleId: moduleId

        };
        console.log(Obj);
        await adminService.createclubMemberRoleModule(Obj);
        responseData.msg = "club Member Role- modules added successfully";
        return responseHelper.success(res, responseData);
    } catch (error) {
        console.error("Error creating role modules:", error);
        responseData.msg = "Error creating club Member role modules";
        return res.status(500).json(responseData);
    }
};

const running_tables_rummy = async (req, res) => {
    try {
        let redisClient = await getRedisClient();
        let rooms = await redisClient.hGetAll("ROOMS");
        // Define page size and get page number from request parameters
        const pageSize = 10;
        const page = parseInt(req.query.page) || 1;

        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;


        let data = [];
        for (const roomId in rooms) {
            let roomString = rooms[roomId];
            let room = JSON.parse(roomString);
            let roomData = {
                roomId: room.roomId,
                playerCount: room.playerCount,
                gameId: room.gameId,
                gameRules: {
                    ...room.gameRules,
                    Points: parseFloat((room.gameRules?.Points || 0).toFixed(2))
                }
            };
            data.push(roomData);

            // Break loop if reached the end index
            if (data.length >= pageSize) break;
        }

        // Calculate total number of pages
        const totalRooms = Object.keys(rooms).length;
        const totalPages = Math.ceil(totalRooms / pageSize);

        // Send the filtered rooms and total pages in the response
        res.status(200).json({Data: data, totalcount: totalRooms, totalPages});
    } catch (error) {
        console.log("Error fetching rooms from Redis:", error);
        res.status(500).json({error: "Error fetching rooms from Redis"});
    }
}

const add_avatar = async (req, res) => {
    let responseData = {};
    try {
        if (!req.file) {
            responseData.msg = "file is required"
            return responseHelper.error(res, responseData, 201);
        }
        // const existingAvatar = await adminService.findAvatar({url: req.file.location});
        // console.log("existingAvatar--.>",existingAvatar);
        // if (existingAvatar) {
        //   responseData.msg= "This URL has already been added"
        //     return responseHelper.error(res,responseData,201);
        // }

        const obj = {
            url: req.file.location,
        }
        const newAvatar = await adminService.createAvatar(obj)
        responseData.msg = "New avatar added successfully";
        responseData.data = newAvatar;
        return responseHelper.success(res, responseData);

    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const get_all_avatars = async (req, res) => {
    let responseData = {};
    try {
        const avatars = await adminService.getAllAvatar({});
        responseData.msg = "all avatar fetch successfully"
        responseData.data = avatars
        return responseHelper.success(res, responseData, 200);

    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const delete_avatar = async (req, res) => {
    let responseData = {}
    try {
        let id = req.query.id;

        console.log("id-->", id);
        // Check if the avatar exists in the database
        const existingAvatar = await adminService.findAvatar({id: id});
        console.log("existingAvatar-->", existingAvatar);
        if (!existingAvatar) {
            responseData.msg = "avatar not found"
            return responseHelper.error(res, responseData, 201);
        }
        await adminService.deleteAvatarById({id: id})
        responseData.msg = "Avatar deleted successfully"

        return responseHelper.success(res, responseData, 200);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const sendNotification = async (req, res) => {
    let responseData = {};
    try {
        let reqData = req.body;
        // if (!reqData.user_id) {
        //     responseData.msg = 'User ID is required';
        //     return responseHelper.error(res, responseData, 400);
        // }
        let rangeStart = reqData.range_start;
        let rangeEnd = reqData.range_end;
        let userIds = [];
        if (reqData.type == 1) {
            userIds = reqData.user_id.split(',');
        } else if (reqData.type == 2 && rangeStart && rangeEnd) {
            let response = await sequelize.query(`Select user_id
                                                  from users
                                                  where user_status!='2' AND is_influencer='0' LIMIT ${rangeStart}
                                                      , ${rangeEnd}`, {type: sequelize.QueryTypes.SELECT});
            userIds = response.map((row) => row.user_id);
            console.log('userIds', userIds); // [101, 102, 103, 104, 105]
        } else {
            let response = await sequelize.query(`Select user_id
                                                  from users
                                                  where user_status!='2' AND is_influencer='0'`, {type: sequelize.QueryTypes.SELECT});
            userIds = response.map((row) => row.user_id);
        }

        if (!userIds.length) {
            responseData.msg = 'No valid user IDs provided';
            return responseHelper.error(res, responseData, 400);
        }

        let notifications = userIds.map(async (userIDS) => {
            let checkUser = await adminService.getUserDetailsById({user_id: userIDS});
            if (!checkUser) {
                throw new Error(`User not found: ${userIDS}`);
            }

            let data = {
                sender_user_id: req.user.admin_id,
                receiver_user_id: userIDS,
                title: reqData.title,
                message: reqData.message
            };

            await adminService.sendNotification(data);

            if (checkUser.device_token && checkUser.device_token != '') {
                let pushData = {
                    title: reqData.title,
                    message: reqData.message,
                    device_token: checkUser.device_token
                };
                try {
                    let result = await sendPushNotification(pushData);
                    console.log("Push Notification Result:", result);
                } catch (error) {
                    console.error("Error sending push notification:", error.message);
                }
            }
        });

        await Promise.all(notifications);

        responseData.msg = 'Notification sent successfully!!!';
        responseData.data = {};
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};
const getWinningAmount = async (req, res) => {
    let responseData = {};
    try {
        const {game_type,page = 1, search_key = '', from_date, end_date, csvtype} = req.query;
        const {limit, offset} = getPagination(page);
        let getUserData;
        let baseQuery;
        let getCount;
        if (game_type === 'Poker') {
                baseQuery = `SELECT t.*, u.username,u.uuid, u.email, u.mobile
            FROM transactions t
                     JOIN users u ON t.user_id = u.user_id
            WHERE t.other_type= 'Table Commision' AND t.category='${game_type}'`;
        } else if (game_type) {
            baseQuery = `SELECT t.*, u.username,u.uuid, u.email, u.mobile
            FROM transactions t
                     JOIN users u ON t.user_id = u.user_id
            WHERE t.other_type= 'Winning'  AND t.category='${game_type}'`;
        } else {
            baseQuery = `SELECT t.*, u.username,u.uuid, u.email, u.mobile
            FROM transactions t
                     JOIN users u ON t.user_id = u.user_id
            WHERE t.other_type= 'Winning'`;
        }
        // Add search condition if search_key is provided
        if (search_key) {
            baseQuery += ` AND (
                u.username LIKE '%${search_key}%' OR 
                 u.uuid LIKE '%${search_key}%' OR 
                u.email LIKE '%${search_key}%' OR 
                u.mobile LIKE '%${search_key}%'
            )`;
        }

        // Add date range filter if dates are provided
        if (from_date && end_date) {
            baseQuery += ` AND t.createdAt BETWEEN '${from_date}' AND '${end_date}'`;
        } else if (from_date) {
            baseQuery += ` AND t.createdAt >= '${from_date}'`;
        } else if (end_date) {
            baseQuery += ` AND t.createdAt <= '${end_date}'`;
        }
        // Get paginated data with count
        getUserData = await sequelize.query(
            `${baseQuery} ORDER BY t.createdAt DESC LIMIT ${limit} OFFSET ${offset}`,
            {type: sequelize.QueryTypes.SELECT}
        );

        getCount = await sequelize.query(
            `SELECT COUNT(*) as total
             FROM (${baseQuery}) as count_query`,
            {type: sequelize.QueryTypes.SELECT}
        )
        if (getUserData.length == 0) {
            responseData.msg = 'Data not found';
            return responseHelper.error(res, responseData, 201);
        }
        getUserData = await Promise.all(getUserData.map(async (element, i) => {
            if (game_type === 'Pool') {
                let poolGame = await adminService.getPoolGameTypeByQuery({ game_id: element.game_id }); // <-- Add 'await' here
                element.table_name = (poolGame) ? poolGame.name : '';
                element.table_type = (poolGame) ? poolGame.table_type : '';
            }else if(game_type=='Poker'){
                let gameResult = await adminService.getGameByQuery({ game_id: element.game_id });
                let gameName;
                let str = JSON.parse(gameResult.game_json_data || "{}");

                if (gameResult.game_category_id == 2) {
                    gameName = str.room_name;
                } else if (gameResult.game_category_id == 3) {
                    gameName = str.name || str.Name;
                } else if (gameResult.game_category_id == 4) {
                    gameName = gameResult.game_name;
                }
                element.game_name = gameName;
            }else if(game_type=='Ludo'){
                let gameLudoResult = await adminService.getLudoGameHistoryById({ tableId: element.table_id });
                let ludoName;
                if(gameLudoResult && gameLudoResult.gameId){
                    let gameNameD = await adminService.getLudoGameByQuery({ id: gameLudoResult.gameId });
                    ludoName = (gameNameD) ? gameNameD.name : '';
                }
                let gameType = await adminService.getLudoGameTypeByQuery({ id: element.reference });
                element.game_id = (gameLudoResult) ? gameLudoResult.gameId : '';
                element.game_name = ludoName;
                element.game_type = (gameType) ? gameType.name : '';
            }else{

            }
           // element.user_id = element.username;
            return element;
        }));
        const totalCount = getCount[0].total;

        responseData.msg = 'Winning Transaction List!!!';
        responseData.count = totalCount;
        responseData.data = getUserData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};
// const getGameWiseUsers = async (req, res) => {
//   let responseData = {};
//   try {
//       console.log('Function getGameWiseUsers called');
//       const {game_type, page, search_key, from_date, end_date} = req.query;

//       const {limit, offset} = getPagination(page);
//       let query = '1=1'; // Start with a base query

//       if (game_type) {
//           query += ` AND game_histories.game_category='${game_type}'`;
//           console.log('Game Type Filter Applied');
//       }

//       if (from_date && end_date) {
//           let fromDate = moment(from_date).format('YYYY-MM-DD');
//           let endDate = moment(end_date).format('YYYY-MM-DD');
//           console.log('Date Filter Applied:', { fromDate, endDate });
//           query += ` AND DATE(game_histories.createdAt) BETWEEN '${fromDate}' AND '${endDate}'`;
//       }

//       if (search_key) {
//           console.log('Search Key Filter Applied:', search_key);
//           query += ` AND (users.username like '%${search_key}%' OR users.referral_code like '%${search_key}%' OR users.full_name like '%${search_key}%')`;
//       }

//       query += ` GROUP BY game_histories.user_id ORDER BY game_histories.createdAt DESC`;

//       // Fetch data
//       let response = await sequelize.query(`SELECT game_histories.* FROM game_histories JOIN users ON game_histories.user_id = users.user_id WHERE ${query} LIMIT ${offset}, ${limit}`, {type: sequelize.QueryTypes.SELECT});
//       // console.log("response-->",response);


//       let responseTotalCount = await sequelize.query(`SELECT game_histories.* FROM game_histories JOIN users ON game_histories.user_id = users.user_id WHERE ${query}`, {type: sequelize.QueryTypes.SELECT});


//       let totalCount = responseTotalCount.length;

//       if (response.length === 0) {
//           responseData.msg = 'Data not found';
//           return responseHelper.error(res, responseData, 201);
//       }

//       var now = new Date().getTime();
//       let time = Math.floor(now / 1000);

//       response = await Promise.all(response.map(async (element) => {

//           let userD = await adminService.getUserDetailsById({ user_id: element.user_id });
//           let getUserBlock = await adminService.getUserStatus({ user_id: element.user_id, game_id: game_type });

//           let getWithDrawAmt = await adminService.getWithdrawl({ user_id: element.user_id });

//           let getDepositAmt = await adminService.getDeposit({ user_id: element.user_id });

//           let withdrawAmt = (getWithDrawAmt && getWithDrawAmt[0].redeem_amount != null) ? getWithDrawAmt[0].redeem_amount : 0;
//           let depositAmt = (getDepositAmt && getDepositAmt[0].redeem_amount != null) ? getDepositAmt[0].amount : 0;
//           let isBlock = (getUserBlock && time < getUserBlock.block_timestamp) ? 1 : 0;

//           element.full_name = (userD) ? userD.full_name : '';
//           element.display_name = (userD) ? userD.display_name : '';
//           element.username = (userD) ? userD.username : '';
//           element.email = (userD) ? userD.email : '';
//           element.mobile = (userD && userD.mobile) ? await decryptData(userD.mobile) : '';
//           element.is_email_verified = (userD) ? userD.is_email_verified : '';
//           element.is_mobile_verified = (userD) ? userD.is_mobile_verified : '';
//           element.is_kyc_done = (userD) ? userD.is_kyc_done : '';
//           element.gender = (userD) ? userD.gender : '';
//           element.dob = (userD) ? userD.dob : '';
//           element.profile_image = (userD) ? userD.profile_image : '';
//           element.device_type = (userD) ? userD.device_type : '';
//           element.device_token = (userD) ? userD.device_token : '';
//           element.referral_code = (userD) ? userD.referral_code : '';
//           element.friend_refer_code = (userD) ? userD.friend_refer_code : '';
//           element.last_login = (userD) ? userD.last_login : '';
//           element.commission = (userD) ? userD.commission : '';
//           element.ip = (userD) ? userD.ip : '';
//           element.user_status = (userD) ? userD.user_status : '';
//           element.user_level = 10;
//           element.withdraw_amount = withdrawAmt;
//           element.deposit_amount = depositAmt;
//           element.is_block = isBlock;
//           element.createdAt = userD.createdAt;
//           element.updatedAt = userD.updatedAt;

//           return element;
//       }));

//       return res.status(200).send({
//           message: 'User List',
//           statusCode: 200,
//           status: true,
//           count: totalCount,
//           data: response
//       });

//   } catch (error) {
//       console.error('Error Occurred:', error.message);
//       responseData.msg = error.message;
//       return responseHelper.error(res, responseData, 500);
//   }
// }
const getGameWiseUsers = async (req, res) => {
    let responseData = {};
    try {
        console.log('Function getGameWiseUsers called');
        const {game_type, page, search_key, from_date, end_date} = req.query;

        const {limit, offset} = getPagination(page);
        let query = '1=1'; // Start with a base query
        let responseTotalCount = 0;
        let response;
        if(game_type==1){
            if (game_type) {
                query += ` AND pool_game_histories.game_category = '${game_type}'`;
                console.log('Game Type Filter Applied');
            }

            if (from_date && end_date) {
                let fromDate = moment(from_date).format('YYYY-MM-DD');
                let endDate = moment(end_date).format('YYYY-MM-DD');
                console.log('Date Filter Applied:', {fromDate, endDate});
                query += ` AND DATE(pool_game_histories.createdAt) BETWEEN '${fromDate}' AND '${endDate}'`;
            }

            if (search_key) {
                console.log('Search Key Filter Applied:', search_key);
                query += ` AND (users.username LIKE '%${search_key}%' OR 
                          users.referral_code LIKE '%${search_key}%' OR 
                          users.full_name LIKE '%${search_key}%')`;
            }

            query += ` GROUP BY pool_game_histories.user_id ORDER BY MAX(pool_game_histories.createdAt) DESC`;

            // ✅ Using SELECT with Aggregate Functions to avoid ONLY_FULL_GROUP_BY issues
            response = await sequelize.query(
                `SELECT pool_game_histories.user_id,
                    MAX(pool_game_histories.game_history_id) AS game_history_id,
                    MAX(pool_game_histories.createdAt)       AS createdAt
             FROM pool_game_histories
                      JOIN users ON pool_game_histories.user_id = users.user_id
             WHERE ${query} LIMIT ${offset}
                 , ${limit}`,
                {type: sequelize.QueryTypes.SELECT}
            );

            responseTotalCount = await sequelize.query(
                `SELECT COUNT(DISTINCT pool_game_histories.user_id) AS totalCount
             FROM pool_game_histories
                      JOIN users ON pool_game_histories.user_id = users.user_id
             WHERE ${query}`,
                {type: sequelize.QueryTypes.SELECT}
            );

        }else{
            if (game_type) {
                query += ` AND game_histories.game_category = '${game_type}'`;
                console.log('Game Type Filter Applied');
            }

            if (from_date && end_date) {
                let fromDate = moment(from_date).format('YYYY-MM-DD');
                let endDate = moment(end_date).format('YYYY-MM-DD');
                console.log('Date Filter Applied:', {fromDate, endDate});
                query += ` AND DATE(game_histories.createdAt) BETWEEN '${fromDate}' AND '${endDate}'`;
            }

            if (search_key) {
                console.log('Search Key Filter Applied:', search_key);
                query += ` AND (users.username LIKE '%${search_key}%' OR 
                          users.referral_code LIKE '%${search_key}%' OR 
                          users.full_name LIKE '%${search_key}%')`;
            }

            query += ` GROUP BY game_histories.user_id ORDER BY MAX(game_histories.createdAt) DESC`;

            // ✅ Using SELECT with Aggregate Functions to avoid ONLY_FULL_GROUP_BY issues
            response = await sequelize.query(
                `SELECT game_histories.user_id,
                    MAX(game_histories.game_history_id) AS game_history_id,
                    MAX(game_histories.createdAt)       AS createdAt
             FROM game_histories
                      JOIN users ON game_histories.user_id = users.user_id
             WHERE ${query} LIMIT ${offset}
                 , ${limit}`,
                {type: sequelize.QueryTypes.SELECT}
            );

            responseTotalCount = await sequelize.query(
                `SELECT COUNT(DISTINCT game_histories.user_id) AS totalCount
             FROM game_histories
                      JOIN users ON game_histories.user_id = users.user_id
             WHERE ${query}`,
                {type: sequelize.QueryTypes.SELECT}
            );
        }

        let totalCount = responseTotalCount[0]?.totalCount || 0;

        if (response.length === 0) {
            responseData.msg = 'Data not found';
            return responseHelper.error(res, responseData, 201);
        }

        let time = Math.floor(Date.now() / 1000);

        response = await Promise.all(response.map(async (element) => {
            let userD = await adminService.getUserDetailsById({user_id: element.user_id});
            console.log("gameId-->",element.user_id);
            console.log("game_type-->",game_type);
            let getUserBlock = await adminService.getUserStatus({user_id: element.user_id, game_id: game_type});
            console.log("getUserBlock----->",getUserBlock);

            let getWithDrawAmt = await adminService.getWithdrawl({user_id: element.user_id});
            let getDepositAmt = await adminService.getDeposit({user_id: element.user_id});

            let withdrawAmt = getWithDrawAmt?.[0]?.redeem_amount ?? 0;
            let depositAmt = getDepositAmt?.[0]?.amount ?? 0;
            let isBlock = (getUserBlock && time < getUserBlock.block_timestamp) ? 1 : 0;
            let block_time = getUserBlock?.block_time || 0;
            let is_blocked_until_unblock = getUserBlock?.is_blocked_until_unblock || false;
            


            return {
                ...element,
                full_name: userD?.full_name || '',
                display_name: userD?.display_name || '',
                username: userD?.username || '',
                email: userD?.email || '',
                mobile: userD?.mobile ? await decryptData(userD.mobile) : '',
                is_email_verified: userD?.is_email_verified || '',
                is_mobile_verified: userD?.is_mobile_verified || '',
                is_kyc_done: userD?.is_kyc_done || '',
                gender: userD?.gender || '',
                dob: userD?.dob || '',
                profile_image: userD?.profile_image || '',
                device_type: userD?.device_type || '',
                device_token: userD?.device_token || '',
                referral_code: userD?.referral_code || '',
                friend_refer_code: userD?.friend_refer_code || '',
                last_login: userD?.last_login || '',
                commission: userD?.commission || '',
                ip: userD?.ip || '',
                user_status: userD?.user_status || '',
                user_level: 10,
                withdraw_amount: withdrawAmt,
                deposit_amount: depositAmt,
                is_block: isBlock,
                block_time:block_time,
                is_blocked_until_unblock:is_blocked_until_unblock,
                createdAt: userD?.createdAt,
                updatedAt: userD?.updatedAt
            };
        }));

        return res.status(200).send({
            message: 'User List',
            statusCode: 200,
            status: true,
            count: totalCount,
            data: response
        });

    } catch (error) {
        console.error('Error Occurred:', error.message);
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};


const getGameHistory = async (req, res) => {
    let responseData = {};
    try {
        const {game_type, page, search_key, from_date, end_date} = req.query;
        const {limit, offset} = getPagination(page);
        let query = '';
        let response;
        let responseTotalCount;
        let totalCount = 0;
        let resData = [];
        const whereConditions = [];
        const replacements = { limit, offset };
        if(game_type=='Pool'){
            // if (game_type) {
            //     whereConditions.push('gh.game_category = :game_type');
            //     replacements.game_type = game_type;
            //
            //     if (game_type == 2) {
            //         whereConditions.push('gh.game_type NOT IN (81, 82, 83)');
            //     }
            // }

            if (from_date && end_date) {
                whereConditions.push('DATE(gh.createdAt) BETWEEN :fromDate AND :endDate');
                replacements.fromDate = moment(from_date).format('YYYY-MM-DD');
                replacements.endDate = moment(end_date).format('YYYY-MM-DD');
            }

            if (search_key) {
                const gameTypes = await sequelize.query(
                    `SELECT game_type_id FROM game_types WHERE name LIKE :searchKey`,
                    { replacements: { searchKey: `%${search_key}%` }, type: sequelize.QueryTypes.SELECT }
                );

                if (gameTypes.length > 0) {
                    whereConditions.push('gh.game_type = :gameTypeId');
                    replacements.gameTypeId = gameTypes[0].game_type_id;
                } else {
                    whereConditions.push(
                        `(u.username LIKE :searchKey OR 
                        u.uuid LIKE :searchKey OR 
                        u.referral_code LIKE :searchKey OR 
                        u.full_name LIKE :searchKey OR 
                        gh.table_name LIKE :searchKey OR 
                        gh.table_id LIKE :searchKey OR 
                        gh.game_id LIKE :searchKey)`
                    );
                    replacements.searchKey = `%${search_key}%`;
                }
            }

            // Build the final query
            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // Get table_ids with pagination
            const tableIdsResult = await sequelize.query(
                `SELECT DISTINCT gh.table_id, gh.game_id, gh.table_name, gh.game_type, gh.createdAt, gh.updatedAt
             FROM pool_game_histories gh
                      JOIN users u ON gh.user_id = u.user_id
                 ${whereClause}
             ORDER BY gh.game_history_id DESC
                 LIMIT :limit OFFSET :offset`,
                { replacements, type: sequelize.QueryTypes.SELECT }
            );

            // Get total count
            const countResult = await sequelize.query(
                `SELECT COUNT(DISTINCT gh.table_id) as totalCount
             FROM pool_game_histories gh
                      JOIN users u ON gh.user_id = u.user_id
                 ${whereClause}`,
                { replacements, type: sequelize.QueryTypes.SELECT }
            );
            const tableDetails = await Promise.all(
                tableIdsResult.map(async ({ table_id,table_name, game_id,createdAt,updatedAt }) => {
                    // Get game history for the table
                    const gameHistory = await userService.getPoolGameHistoryByQuery({ table_id });

                    // Get game type name
                    const getGameType = await adminService.getPoolGameTypeByQuery({ game_id: game_id });

                    // Enrich each game history entry with username
                    const enrichedHistory = await Promise.all(
                        gameHistory.map(async (history) => {
                            const user = await adminService.getUserDetailsById({ user_id: history.user_id });
                            return {
                                ...history,
                                uuid: user?.uuid || '---',
                                username: user?.username || 'Unknown'  // Add username to each entry
                            };
                        })
                    );

                    return {
                        table_id: game_id,
                        table_name,
                        createdAt,
                        updatedAt,
                        table_type: getGameType?.table_type || '',
                        users: enrichedHistory  // Now includes usernames
                    };
                })
            );
            totalCount = countResult[0]?.totalCount || 0;
            resData = tableDetails
        }else{
            if (game_type) {
                console.log('d');
                query += `game_category = '${game_type}'`;
            }
            if (from_date && end_date) {
                console.log('d');
                let fromDate = moment(from_date).format('YYYY-MM-DD');
                let endDate = moment(end_date).format('YYYY-MM-DD');
                query += ` AND DATE(game_histories.createdAt) BETWEEN '${fromDate}' AND '${endDate}'`;
            }
            if (search_key) {
                //let gameType = await adminService.getGameTypeByQuery({name:search_key});
                let gameType = await sequelize.query(`Select *
                                                  from game_types
                                                  where name like '%${search_key}%'`, {type: sequelize.QueryTypes.SELECT});
                if (gameType.length > 0) {
                    query += ` AND game_histories.game_type like '%${gameType[0].game_type_id}%'`;
                } else {
                    query += ` AND (users.username like '%${search_key}%' OR users.uuid like '%${search_key}%' OR users.referral_code like '%${search_key}%' OR users.full_name like '%${search_key}%' OR game_histories.table_name like '%${search_key}%' OR game_histories.table_id like '%${search_key}%')`;
                }

            }
            query += ` order by game_history_id DESC`;
            response = await sequelize.query(`Select game_histories.*
                                              from game_histories
                                                       join users on game_histories.user_id = users.user_id
                                              where ${query} LIMIT ${offset}
                                                  , ${limit}`, {type: sequelize.QueryTypes.SELECT});
            responseTotalCount = await sequelize.query(`Select game_histories.*
                                                        from game_histories
                                                                 join users on game_histories.user_id = users.user_id
                                                        where ${query}`, {type: sequelize.QueryTypes.SELECT});
            if (responseTotalCount.length == 0) {
                responseData.msg = 'Game history not found';
                return responseHelper.error(res, responseData, 201);
            }
            response = response.map(async (element) => {
                //let getGameCategory = await adminService.getGameCategoryByQuery({game_category_id: element.game_category})
                let getGameType, category;
                if(game_type=='Pool'){
                    getGameType = await adminService.getPoolGameTypeByQuery({name: element.table_name})
                    category = (getGameType) ? getGameType.table_type : ''
                }else{
                    getGameType = await adminService.getGameTypeByQuery({game_type_id: element.game_type})
                    category = (getGameType) ? getGameType.name : ''
                }

                let getUserDetail = await adminService.getUserDetailsById({user_id: element.user_id})
                element.game_category = category;
                element.username = (getUserDetail) ? getUserDetail.username : '';
                element.is_win = (element.is_win == 1) ? 'Yes' : 'No';
                element.win_amount = (element.win_amount) ? element.win_amount : '0';
                element.hands_record = (element.hands_record) ? JSON.parse(element.hands_record, true) : '';
                element.community_card = (element.community_card) ? JSON.parse(element.community_card, true) : '';
                return element;
            })
            response = await Promise.all(response);
            totalCount = responseTotalCount.length;
            resData = response
        }
        return res.status(200).send({
            message: 'Game history Data',
            statusCode: 200,
            status: true,
            count: totalCount,
            data: resData
        });
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const getRummyGameHistoryByTableId = async (req, res) => {
    let responseData = {};
    try {
        let tableId = req.query.table_id;

        if (!tableId) {
            responseData.msg = 'table_id is required';
            return responseHelper.error(res, responseData, 400);
        }

        let historyData = await adminService.gameHistory({ table_id: tableId });

        const updatedHistory = await Promise.all(historyData.map(async (element) => {
            // Convert Sequelize instance to plain object
            let record = element.get({ plain: true });

            let getGameType, category;
            if (record.game_type_name === 'Pool') {
                getGameType = await adminService.getPoolGameTypeByQuery({ name: record.table_name });
                category = getGameType ? getGameType.table_type : '';
            } else {
                getGameType = await adminService.getGameTypeByQuery({ game_type_id: record.game_type });
                category = getGameType ? getGameType.name : '';
            }

            const getUserDetail = await adminService.getUserDetailsById({ user_id: record.user_id });

            return {
                ...record,
                game_category: category,
                username: getUserDetail ? getUserDetail.username : '',
                is_win: record.is_win == 1 ? 'Yes' : 'No',
                win_amount: record.win_amount || '0',
                hands_record: record.hands_record ? JSON.parse(record.hands_record) : '',
                community_card: record.community_card ? JSON.parse(record.community_card) : ''
            };
        }));

        responseData.msg = 'Rummy history by table id';
        responseData.data = updatedHistory;
        responseData.count = updatedHistory.length;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};




const getLeaderBoardData = async (req, res) => {
    let responseData = {};
    try {
        const {game_type, type} = req.query;
        let getLeaderBoard;
        if (game_type) {
            if (game_type === "Poker") {
                let toDate = new Date();
                let fromDate;
                if (type === "daily") {
                    fromDate = new Date(toDate.getTime() - (24 * 60 * 60 * 1000));
                } else if (type === "weekly") {
                    fromDate = new Date(toDate.getTime() - (7 * 24 * 60 * 60 * 1000));
                } else {
                    fromDate = new Date(toDate.getTime() - (30 * 24 * 60 * 60 * 1000));
                }
                let pokerSessionWinnings = await userService.getPokerSessionWinGroupOrder({
                    attributes: [
                        'user_id',
                        'game_type_id',
                        [sequelize.fn("sum", sequelize.col('winning')), 'total_winning'],
                        [sequelize.fn("sum", sequelize.col('rounds_played')), 'total_rounds_played']
                    ],
                    where: {
                        createdAt: {
                            [Op.between]: [fromDate, toDate]
                        }
                    },
                    group: ['user_id', 'game_type_id'],
                    order: [[sequelize.col('total_winning'), 'DESC']],
                    raw: true
                });
                getLeaderBoard = [];
                let rank = 1;
                let users = {};
                let gameTypes = {};
                for (let pokerSessionWinning of pokerSessionWinnings) {
                    let user;
                    let gameType;
                    if (users[pokerSessionWinning.user_id]) {
                        user = users[pokerSessionWinning.user_id];
                    } else {
                        user = await userService.getUserDetailsById({user_id: pokerSessionWinning.user_id});
                        users[pokerSessionWinning.user_id] = user;
                    }
                    if (gameTypes[pokerSessionWinning.game_type_id]) {
                        gameType = gameTypes[pokerSessionWinning.game_type_id];
                    } else {
                        gameType = await pokerService.getGameTypeModalDataByQuery({
                            game_type_id: pokerSessionWinning.game_type_id
                        });
                        gameTypes[pokerSessionWinning.game_type_id] = gameType;
                    }
                    let result = {
                        "game_category": "Poker",
                        "game_type": (gameType) ? gameType.name : '',
                        "user_id": pokerSessionWinning.user_id,
                        "username": (user) ? user.username : '',
                        "rank": rank,
                        "winning": pokerSessionWinning.total_winning,
                        "type": type,
                        "game_played": pokerSessionWinning.total_rounds_played,
                        "createdAt": new Date(),
                        "updatedAt": new Date()
                    }
                    getLeaderBoard.push(result);
                    rank++;
                }
            } else {
                getLeaderBoard = await adminService.getLeaderBoard({game_category: game_type, type: type});
            }
        } else {
            getLeaderBoard = await adminService.getLeaderBoard({type: type});
        }

        if (getLeaderBoard.length == 0) {
            responseData.msg = 'Leaderboard not found';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'LeaderBoard Data';
        responseData.data = getLeaderBoard;
        return responseHelper.success(res, responseData);
    } catch (error) {
        console.log(error);
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const getRunningTable = async (req, res) => {
    let responseData = {};
    try {
        let gameType = req.query.game_type;
        let data;
        if (gameType == 'Poker') {
            let redisClient = await getRedisClient();
            let runningTableData = await redisClient.hGetAll("TABLE");
            data = Object.entries(runningTableData).map(([tableId, tableString]) => {
                try {
                    const parsed = JSON.parse(tableString);
                    return {
                        tableId,
                        game_id: parsed.gameId,
                        game_type: parsed.gameType,
                        tableId: parsed.tableId,
                        table_name: parsed.table_name,
                        game_table_status: 'running table',
                        tableData: parsed
                    };
                } catch (e) {
                    console.warn(`Failed to parse table ${tableId}:`, e.message);
                    return null;
                }
            }).filter(Boolean);
            responseData.msg = 'Running Table!!!';
            responseData.data = data;
            return responseHelper.success(res, responseData);
        } else if (gameType) {
            data = await adminService.getRunningTableData({
                game_category: gameType,
                game_table_status: ['Active', 'Full']
            });
        } else {
            data = await adminService.getRunningTableData({game_table_status: 'Active'});
        }

        if (data.length == 0) {
            responseData.msg = 'No Data Found';
            return responseHelper.error(res, responseData, 201);
        }

        data = data.map(async (element) => {
            let getGame = await adminService.getGameByQuery({game_id: element.game_id})
            if (getGame) {
                let getGameType = await adminService.getGameTypeByQuery({game_type_id: getGame.dataValues.game_type_id})
                element.dataValues.game_type = (getGameType) ? getGameType.dataValues.name : '';
            } else {
                element.dataValues.game_type = '';
            }

            return element;
        })
        data = await Promise.all(data);
        responseData.msg = 'Running Table!!!';
        responseData.data = data;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const getTotalTable = async (req, res) => {
    let responseData = {};
    //try {

    let gameType = req.query.game_type;
    let gameId = req.query.game_id
    let date = new Date().toISOString().split('T')[0]
    let query;
    let data;
    if (gameType) {
        let getCategory = await adminService.getGameCategoryByQuery({name: gameType});
        data = await adminService.getAllGameList({game_category_id: getCategory.game_category_id, game_status: '1'});
    } else {
        data = await adminService.getAllGameList();
    }
    if (data.length == 0) {
        responseData.msg = 'No Data Found';
        return responseHelper.error(res, responseData, 201);
    }
    console.log(data);
    data = data.map(async (element) => {
        let roomAttributes = element.game_json_data;
        let roomAttributesObj = JSON.parse(roomAttributes);
        let getGameCategory = await adminService.getGameCategoryByQuery({game_category_id: element.game_category_id})
        let getGameType = await adminService.getGameTypeByQuery({game_type_id: element.game_type_id})
        element.dataValues.game_table_id = element.game_id
        element.dataValues.game_category = (getGameCategory) ? getGameCategory.dataValues.name : '';
        element.dataValues.game_type = (getGameType) ? getGameType.dataValues.name : '';
        element.dataValues.table_name = roomAttributesObj.room_name;
        element.dataValues.game_table_status = "Active";
        return element;

    })

    data = await Promise.all(data);
    responseData.msg = 'Total Table!!!';
    responseData.data = data;
    return responseHelper.success(res, responseData);
    // } catch (error) {
    //     responseData.msg = error.message;
    //     return responseHelper.error(res, responseData, 500);
    // }
}

const addBanner = async (req, res) => {
    let responseData = {};
    try {
        let bannerObj = {
            image: req.file.location,
            added_by: req.user.admin_id
        }
        await adminService.createBanner(bannerObj);
        responseData.msg = 'Banner Added Done';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const bannerList = async (req, res) => {
    let responseData = {};
    try {
        let getBanners = await adminService.getAllBanners({status: {[Op.ne]: '2'}});
        if (getBanners.length == 0) {
            responseData.msg = 'Banners not found';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'Banners List';
        responseData.data = getBanners;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const bannerById = async (req, res) => {
    let responseData = {};
    try {
        let getBanners = await adminService.getBannerByQuery({id: req.params.id});
        if (!getBanners) {
            responseData.msg = 'Banner not found';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'Banner List';
        responseData.data = getBanners;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const updateBannerById = async (req, res) => {
    let responseData = {};
    try {
        const id = req.body.id;
        let getBanner = await adminService.getBannerByQuery({id: id});
        let roleObj = {
            image: (typeof req.file != 'undefined') ? req.file.location : getBanner.image,
            updated_by: req.user.admin_id
        }
        await adminService.updateBanner(roleObj, {id: id});
        responseData.msg = 'Banner Updated Done';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const changeBannerStatus = async (req, res) => {
    let responseData = {};
    try {
        const id = req.body.id;
        const status = req.body.status;
        let getBanner = await adminService.getBannerByQuery({id: id});
        if (!getBanner) {
            responseData.msg = 'Banner Not found';
            return responseHelper.error(res, responseData, 201);
        }
        let roleObj = {
            status: status
        }
        await adminService.updateBanner(roleObj, {id: id});
        responseData.msg = 'Banner Status Changed Done';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const tournamentList = async (req, res) => {
    let responseData = {};
    try {
        let game_type = req.query.game_type;
        console.log(game_type);
        let getData;
        if (game_type) {
            getData = await adminService.getAllTournamentList({game_category: game_type});
        } else {
            getData = await adminService.getAllTournamentList();
        }
        if (!getData) {
            responseData.msg = 'Tournament List not found';
            return responseHelper.error(res, responseData, 201);
        }
        getData = getData.map(async (element, i) => {
            let getUserD = await adminService.geAdminDetailsById({admin_id: element.added_by});
            element.dataValues.added_by = (getUserD && getUserD.full_name != null) ? getUserD.full_name : '';
            let getUserDD = await adminService.geAdminDetailsById({admin_id: element.updated_by});
            element.dataValues.updated_by = (getUserDD && getUserDD.full_name != null) ? getUserDD.full_name : '';

            let str = element.tournament_json_data;
            element.dataValues.tournament_json_data = JSON.parse(str, true);

            // let getGameCategory = await adminService.getGameCategoryByQuery({game_category_id: element.game_category})
            // element.dataValues.game_category = (getGameCategory) ? getGameCategory.dataValues.name : '';
            //
            // let getGameType = await adminService.getGameTypeByQuery({game_type_id: element.game_type})
            // element.dataValues.game_type_name = (getGameType) ? getGameType.dataValues.name : '';
            return element;
        })
        getData = await Promise.all(getData);
        responseData.msg = 'Tournament List';
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const createTournament = async (req, res) => {
    let responseData = {};
    try {
        let redisClient = await getRedisClient();
        let {game_category, game_type, player_type, tournament_name, tournament_json_data} = req.body;
        //
        let check = await adminService.getTournamentByQuery({tournament_name: tournament_name});
        if (check) {
            responseData.msg = 'Already Added';
            return responseHelper.error(res, responseData, 201);
        }

        // rummy_tournament
        if (game_category == 'Rummy') {
            let rummy_tourney = {
                game_category: game_category,
                tournament_name: tournament_name,
                tournament_json_data: JSON.stringify(tournament_json_data),
            }
            let save = await adminService.createTournament(rummy_tourney);
            let tournamentInRedis = await redisClient.hKeys('RummyTournamentId')
            if (tournamentInRedis || tournamentInRedis.length > 0) {
                tournamentInRedis.push(save.tournament_id);
            }
            //store created tournament id in redis
            await redisClient.hSet("RummyTournamentId", "" + save.tournament_id, JSON.stringify(save.tournament_id));
            responseData.msg = 'Tournament Added Done';
            return responseHelper.success(res, responseData);
        }
        //console.log('player_type',player_type);
        let scheduleDate = tournament_json_data.tourney_start;
        if (game_category == 4) {
            scheduleDate = tournament_json_data.game_date + ' ' + tournament_json_data.game_time;
        }
        let data = {
            game_category: game_category,
            game_type: game_type,
            player_type: tournament_json_data.player_type,
            tournament_name: tournament_name,
            tournament_json_data: JSON.stringify(tournament_json_data),
            scheduled_date: scheduleDate,
            added_by: req.user.admin_id
        }

        //console.log(data);
        //return false;

        let save = await adminService.createTournament(data);
        responseData.msg = 'Tournament Added Done';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const tournamentDetail = async (req, res) => {
    let responseData = {};
    try {
        let tournamentId = req.params.id;
        let getData = await adminService.getTournamentByQuery({tournament_id: tournamentId});
        if (!getData) {
            responseData.msg = 'Tournament Data not found';
            return responseHelper.error(res, responseData, 201);
        }
        let str = getData.tournament_json_data;
        getData.tournament_json_data = JSON.parse(str, true);
        responseData.msg = 'Tournament Detail';
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const updateTournament = async (req, res) => {
    let responseData = {};
    try {
        let redisClient = await getRedisClient();
        let {tournament_id, game_category, player_type, game_type, tournament_name, tournament_json_data} = req.body;
        let scheduleDate = tournament_json_data.tourney_start;
        if (game_category == 4) {
            scheduleDate = tournament_json_data.game_date + ' ' + tournament_json_data.game_time;
        }
        let data = {
            game_category: game_category,
            game_type: game_type,
            player_type: tournament_json_data.player_type,
            tournament_name: tournament_name,
            tournament_json_data: JSON.stringify(tournament_json_data),
            scheduled_date: scheduleDate,
            updated_by: req.user.admin_id
        }

        let getData = await adminService.getTournamentByQuery({tournament_id: tournament_id});
        if (!getData) {
            responseData.msg = 'Game Data not found';
            return responseHelper.error(res, responseData, 201);
        }
        let updateData = await adminService.updateTournamentById(data, {tournament_id: tournament_id});
        let tournamentInRedis = await redisClient.hKeys('tournament')
        if (!tournamentInRedis.includes(updateData.tournament_id)) {
            tournamentInRedis.push(updateData);
        }
        responseData.msg = 'Tournament Update Successfully';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const updateTournamentStatus = async (req, res) => {
    let responseData = {};
    try {
        const {tournament_id, status} = req.body;
        let checkTournament = await adminService.getTournamentByQuery({tournament_id: tournament_id});
        if (!checkTournament) {
            responseData.msg = 'Tournament not found';
            return responseHelper.error(res, responseData, 201);
        }
        let dataObj = {
            tournament_status: status,
            updated_by: req.user.admin_id
        }
        await adminService.updateTournamentById(dataObj, {tournament_id: tournament_id});
        responseData.msg = 'Status Updated';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const cancelTournament = async (req, res) => {
    let responseData = {};
    try {
        const {tournament_id} = req.query;
        let checkTournament = await adminService.getTournamentByQuery({tournament_id: tournament_id});
        if (!checkTournament) {
            responseData.msg = 'Tournament not found';
            return responseHelper.error(res, responseData, 201);
        }
        let dataObj = {
            is_cancel: '1',
            updated_by: req.user.admin_id
        }
        await adminService.updateTournamentById(dataObj, {tournament_id: tournament_id});
        responseData.msg = 'Tournament cancelled successfully';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const getTypeListByName = async (req, res) => {
    let responseData = {};
    try {
        let getType = req.query.game_type;
        let getCategorys = await adminService.getGameCategoryByQuery({name: getType, game_category_status: '1'});

        if (!getCategorys) {
            responseData.msg = 'Data not not found';
            return responseHelper.error(res, responseData, 201);
        }

        let gameTypeD = await adminService.getAllGameType({game_category_id: getCategorys.game_category_id});
        if (gameTypeD.length == 0) {
            responseData.msg = 'Data not not found';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'Game Type List';
        responseData.data = gameTypeD;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const pendingWithdrawal = async (req, res) => {
    let responseData = {};
    try {
        const {page = 1, search_key = '', from_date, end_date, csvtype} = req.query;
        const {limit, offset} = getPagination(page);

        // Base query with JOIN to users table
        let baseQuery = `
            SELECT r.*, u.username,u.uuid, u.email, u.mobile
            FROM redemptions r
                     JOIN users u ON r.user_id = u.user_id
            WHERE r.redemption_status != 'Withdraw' AND r.redemption_status != 'Cancelled'
        `;

        // Add search condition if search_key is provided
        if (search_key) {
            baseQuery += ` AND (
                u.username LIKE '%${search_key}%' OR 
                u.email LIKE '%${search_key}%' OR 
                u.uuid LIKE '%${search_key}%' OR u.mobile LIKE '%${search_key}%'
            )`;
        }

        // Add date range filter if dates are provided
        if (from_date && end_date) {
            baseQuery += ` AND r.createdAt BETWEEN '${from_date}' AND '${end_date}'`;
        } else if (from_date) {
            baseQuery += ` AND r.createdAt >= '${from_date}'`;
        } else if (end_date) {
            baseQuery += ` AND r.createdAt <= '${end_date}'`;
        }

        // For CSV export - return all records without pagination
        // if (csvtype === 'export') {
        //   const exportData = await sequelize.query(
        //       `${baseQuery} ORDER BY r.created_at DESC`,
        //       { type: sequelize.QueryTypes.SELECT }
        //   );
        //
        //   // Format data for CSV
        //   const csvData = exportData.map(item => ({
        //     'Transaction ID': item.transaction_id,
        //     'User Name': item.display_name,
        //     'Email': item.email,
        //     'Phone': item.phone,
        //     'Amount': item.amount,
        //     'Status': item.redemption_status,
        //     'Request Date': item.created_at,
        //     'Processed Date': item.updated_at
        //   }));
        //
        //   // Set headers for CSV response
        //   res.setHeader('Content-Type', 'text/csv');
        //   res.setHeader('Content-Disposition', 'attachment; filename=pending_withdrawals.csv');
        //
        //   // Convert to CSV and send
        //   const csv = json2csv.parse(csvData);
        //   return res.status(200).send(csv);
        // }

        // Get paginated data with count
        let getUserData = await sequelize.query(
            `${baseQuery} ORDER BY r.createdAt DESC LIMIT ${limit} OFFSET ${offset}`,
            {type: sequelize.QueryTypes.SELECT}
        );

        const getCount = await sequelize.query(
            `SELECT COUNT(*) as total
             FROM (${baseQuery}) as count_query`,
            {type: sequelize.QueryTypes.SELECT}
        );

        if (getUserData.length === 0) {
            responseData.msg = 'Data not found';
            return responseHelper.error(res, responseData, 201);
        }

        // getUserData = getUserData.map(async (element, i) => {
        //     element.user_id = element.username;
        //     return element;
        // })
        const totalCount = getCount[0].total;
       // getUserData = await Promise.all(getUserData);

        responseData.msg = 'Pending Withdrawal List!!!';
        responseData.count = totalCount;
        responseData.data = getUserData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        console.error('Error in pendingWithdrawal:', error);
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const todayWithdrawal = async (req, res) => {
    let responseData = {};
    try {
        const {page = 1, search_key = '', from_date, end_date, csvtype} = req.query;
        const {limit, offset} = getPagination(page);

        // Base query with JOIN to users table
        let baseQuery = `
            SELECT r.*, u.username,u.uuid, u.email, u.mobile
            FROM redemptions r
                     JOIN users u ON r.user_id = u.user_id
            WHERE r.redemption_status = 'Withdraw'
        `;

        // Add search condition if search_key is provided
        if (search_key) {
            baseQuery += ` AND (
                u.username LIKE '%${search_key}%' OR 
                u.uuid LIKE '%${search_key}%' OR 
                u.email LIKE '%${search_key}%' OR 
                u.mobile LIKE '%${search_key}%'
            )`;
        }

        // Add date range filter if dates are provided
        if (from_date && end_date) {
            baseQuery += ` AND r.createdAt BETWEEN '${from_date}' AND '${end_date}'`;
        } else if (from_date) {
            baseQuery += ` AND r.createdAt >= '${from_date}'`;
        } else if (end_date) {
            baseQuery += ` AND r.createdAt <= '${end_date}'`;
        }
        // Get paginated data with count
        let getUserData = await sequelize.query(
            `${baseQuery} ORDER BY r.createdAt DESC LIMIT ${limit} OFFSET ${offset}`,
            {type: sequelize.QueryTypes.SELECT}
        );

        const getCount = await sequelize.query(
            `SELECT COUNT(*) as total
             FROM (${baseQuery}) as count_query`,
            {type: sequelize.QueryTypes.SELECT}
        );

        if (getUserData.length === 0) {
            responseData.msg = 'Data not found';
            return responseHelper.error(res, responseData, 201);
        }

        // getUserData = getUserData.map(async (element, i) => {
        //     element.user_id = element.username;
        //     return element;
        // })
        const totalCount = getCount[0].total;
        //getUserData = await Promise.all(getUserData);

        responseData.msg = 'Today Withdrawal List!!!';
        responseData.count = totalCount;
        responseData.data = getUserData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        console.error('Error in pendingWithdrawal:', error);
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const todayDeposit = async (req, res) => {
    let responseData = {};
    try {
        const {page = 1, search_key = '', from_date, end_date, csvtype} = req.query;
        const {limit, offset} = getPagination(page);

        // Base query with JOIN to users table
        let baseQuery = `
            SELECT t.*, u.username,u.uuid, u.email, u.mobile
            FROM transactions t
                     JOIN users u ON t.user_id = u.user_id
            WHERE t.other_type= 'Deposit' AND t.transaction_status='SUCCESS'
        `;

        // Add search condition if search_key is provided
        if (search_key) {
            baseQuery += ` AND (
                u.username LIKE '%${search_key}%' OR 
                u.uuid LIKE '%${search_key}%' OR 
                u.email LIKE '%${search_key}%' OR 
                u.mobile LIKE '%${search_key}%'
            )`;
        }

        // Add date range filter if dates are provided
        if (from_date && end_date) {
            baseQuery += ` AND t.createdAt BETWEEN '${from_date}' AND '${end_date}'`;
        } else if (from_date) {
            baseQuery += ` AND t.createdAt >= '${from_date}'`;
        } else if (end_date) {
            baseQuery += ` AND t.createdAt <= '${end_date}'`;
        }
        // Get paginated data with count
        let getUserData = await sequelize.query(
            `${baseQuery} ORDER BY t.createdAt DESC LIMIT ${limit} OFFSET ${offset}`,
            {type: sequelize.QueryTypes.SELECT}
        );

        const getCount = await sequelize.query(
            `SELECT COUNT(*) as total
             FROM (${baseQuery}) as count_query`,
            {type: sequelize.QueryTypes.SELECT}
        );

        if (getUserData.length === 0) {
            responseData.msg = 'Data not found';
            return responseHelper.error(res, responseData, 201);
        }

        // getUserData = getUserData.map(async (element, i) => {
        //     element.user_id = element.username;
        //     return element;
        // })
        const totalCount = getCount[0].total;
        //getUserData = await Promise.all(getUserData);

        responseData.msg = 'Total Deposit List!!!';
        responseData.count = totalCount;
        responseData.data = getUserData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        console.error('Error in pendingWithdrawal:', error);
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const changeWithDrawlStatus = async (req, res) => {
    let responseData = {};
    try {
        let requestId = req.body.request_id;
        let requestStatus = req.body.status;
        let redemeptionData = await adminService.getWithdrawlRequestById({redemption_id: requestId});

        if (!redemeptionData) {
            responseData.msg = 'No Data Found';
            return responseHelper.error(res, responseData, 201);
        }
        let data = {
            redemption_status: requestStatus
        }

        let userId = redemeptionData.user_id;
        let userD = await userService.getUserDetailsById({user_id: userId});
        let userWallet = await userService.getUserWalletDetailsById({user_id: userId});

        let orderId = 'order_' + new Date().getTime();
        let redemAmount = redemeptionData.redeem_amount;
        if (requestStatus != 'Withdraw') {
            await adminService.updateRedemption({redemption_status: requestStatus}, {redemption_id: requestId})
            responseData.msg = 'Status changed';
            return responseHelper.success(res, responseData);
        }
        let getBankDetails = await userService.getUserBankDetailsById({user_id: userId});
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
        let savewalet = await userService.updateUserWallet(walletData, {user_wallet_id: userWallet.user_wallet_id});

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
        let save = await adminService.updateRedemption(redemData, {redemption_id: requestId});
        let saveTransactions = await userService.createTransaction(dataTransactions);


        // await adminService.updateRedemption(data, {redemption_id: requestId})
        responseData.msg = 'Status changed';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const totalWinning = async (req, res) => {
    let responseData = {};
    try {
        const {game_type, page, search_key, from_date, end_date, csvtype} = req.query;
        const {limit, offset} = getPagination(page, csvtype);
        let query = `transactions.is_admin='0' AND (transactions.other_type='Winning' OR transactions.other_type='Table Commision')`;
        if (req.query.user_id) {
            query += ` AND transactions.user_id='${req.query.user_id}'`;
        }
        if (game_type) {
            query += ` AND transactions.category='${search_key}'`;
        }
        if (from_date && end_date) {
            let fromDate = moment(from_date).format('YYYY-MM-DD');
            let endDate = moment(end_date).format('YYYY-MM-DD');
            console.log('d');
            query += ` AND DATE(transactions.createdAt) BETWEEN '${fromDate}' AND '${endDate}'`;
        }

        if (search_key) {
            // let gameCategory = await sequelize.query(`Select *  from game_categories where name like '%${search_key}%'`, {type: sequelize.QueryTypes.SELECT});
            // if (gameCategory.length > 0) {
            //     query += ` AND game_histories.game_type like '%${gameCategory[0].game_type_id}%'`;
            // } else {
            query += ` AND (users.username like '%${search_key}%' OR users.uuid like '%${search_key}%' OR users.referral_code like '%${search_key}%' OR users.full_name like '%${search_key}%' OR transactions.category like '%${search_key}%')`;
            // }
        }
        query += ` order by transaction_id DESC`;
        let response = await sequelize.query(`Select transactions.amount,
                                                     transactions.createdAt,
                                                     transactions.category,
                                                     transactions.commission,
                                                     transactions.table_id,
                                                     transactions.game_id,
                                                     transactions.user_id,
                                                     users.username,
                                                     users.uuid
                                              from transactions
                                                       join users on transactions.user_id = users.user_id
                                              where ${query} LIMIT ${offset}
                                                  , ${limit}`, {type: sequelize.QueryTypes.SELECT});
        let responseTotalCount = await sequelize.query(`Select transactions.*
                                                        from transactions
                                                                 join users on transactions.user_id = users.user_id
                                                        where ${query}`, {type: sequelize.QueryTypes.SELECT});
        let totalCount = responseTotalCount.length;

        if (responseTotalCount == 0) {
            responseData.msg = 'Data not found';
            return responseHelper.error(res, responseData, 201);
        }
        let sum = 0;
        response = response.map(async (element, i) => {
            sum += parseFloat(element.amount)
            return element;
        })
        response = await Promise.all(response);
        return res.status(200).send({
            message: 'Total Winning List!!!',
            statusCode: 200,
            status: true,
            totalCount: totalCount,
            totalAmount: sum.toFixed(2),
            data: response,
        })
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const ledgerDetails = async (req, res) => {
    let responseData = {};
    try {
        let query, query1, query2, query3, query4, queryWallet
        if (req.query.user_id) {
            queryWallet = `user_id='${req.query.user_id}'`;
            query = `redemption_status != 'Withdraw' AND redemption_status != 'Cancelled' AND user_id='${req.query.user_id}'`;
            query1 = `redemption_status = 'Withdraw' AND user_id='${req.query.user_id}'`;
            query2 = `(other_type='Winning' OR other_type='Table Commision') AND amount > 0 AND user_id='${req.query.user_id}'`;
            query3 = `transaction_status = 'SUCCESS' AND other_type='Deposit' AND user_id='${req.query.user_id}'`;
            query4 = `transaction_status = 'SUCCESS' AND (other_type='Winning' OR other_type='Table Commision') AND user_id='${req.query.user_id}'`;
        } else {
            queryWallet = `1=1`
            query = `redemption_status != 'Withdraw' AND redemption_status != 'Cancelled'`;
            query1 = `redemption_status = 'Withdraw'`;
            query2 = `(other_type='Winning' OR other_type='Table Commision') AND amount > 0`;
            query3 = `transaction_status = 'SUCCESS' AND other_type='Deposit'`;
            query4 = `transaction_status = 'SUCCESS' AND (other_type='Winning' OR other_type='Table Commision')`;
        }

        let userWallet = await sequelize.query(`Select SUM(win_amount)   as winAmount,
                                                       SUM(real_amount)  as realAmount,
                                                       SUM(bonus_amount) as bonusAmount
                                                from user_wallets
                                                where ${queryWallet}`, {type: sequelize.QueryTypes.SELECT});
        let pendingWithdraw = await sequelize.query(`Select SUM(redeem_amount) as totalPending
                                                     from redemptions
                                                     where ${query}`, {type: sequelize.QueryTypes.SELECT});
        let TotalWithdraw = await sequelize.query(`Select SUM(redeem_amount) as totalWithdraw,
                                                          SUM(tds_amount)    as totalTds
                                                   from redemptions
                                                   where ${query1}`, {type: sequelize.QueryTypes.SELECT});
        let TotalWinning = await sequelize.query(`Select SUM(amount) as totalWinning
                                                  from transactions
                                                  where ${query2}`, {type: sequelize.QueryTypes.SELECT});
        let TotalDeposit = await sequelize.query(`Select SUM(amount) as totalDeposit, SUM(gst_amount) as totalGst
                                                  from transactions
                                                  where ${query3}`, {type: sequelize.QueryTypes.SELECT});
        let TotalCommission = await sequelize.query(`Select SUM(commission) as totalCommission
                                                     from transactions
                                                     where ${query4}`, {type: sequelize.QueryTypes.SELECT});
        console.log(userWallet)
        responseData.msg = 'Cash Transaction List!!!';
        responseData.data = {
            totalPending: (pendingWithdraw[0].totalPending) ? parseFloat(pendingWithdraw[0].totalPending) : 0.00,
            totalWithdraw: (TotalWithdraw[0].totalWithdraw) ? parseFloat(TotalWithdraw[0].totalWithdraw) : 0.00,
            totalTds: (TotalWithdraw[0].totalTds) ? parseFloat(TotalWithdraw[0].totalTds) : 0.00,
            totalGst: (TotalDeposit[0].totalGst) ? parseFloat(TotalDeposit[0].totalGst) : 0.00,
            totalWinning: (userWallet[0].winAmount) ? parseFloat(userWallet[0].winAmount) : 0.00,
            totalDeposit: (req.query.user_id && userWallet[0].realAmount) ? userWallet[0].realAmount : parseFloat(TotalDeposit[0].totalDeposit),
            totalBonus: (userWallet[0].bonusAmount) ? parseFloat(userWallet[0].bonusAmount) : 0.00,
            totalCommission: (TotalCommission[0].totalCommission) ? parseFloat(TotalCommission[0].totalCommission) : 0.00
        }
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const totalWithdrawal = async (req, res) => {
    let responseData = {};
    try {
        const {page, search_key, from_date, end_date, csvtype} = req.query;
        const {limit, offset} = getPagination(page, csvtype);
        let query = `redemption_status='Withdraw'`;
        if (req.query.user_id) {
            query += ` AND redemptions.user_id='${req.query.user_id}'`;
        }
        if (from_date && end_date) {
            let fromDate = moment(from_date).format('YYYY-MM-DD');
            let endDate = moment(end_date).format('YYYY-MM-DD');
            console.log('d');
            query += ` AND DATE(redemptions.createdAt) BETWEEN '${fromDate}' AND '${endDate}'`;
        }

        if (search_key) {
            query += ` AND (users.username like '%${search_key}%' OR users.referral_code like '%${search_key}%' OR users.full_name like '%${search_key}%' OR game_histories.table_name like '%${search_key}%' OR game_histories.table_id like '%${search_key}%')`;
        }
        query += ` order by redemption_id DESC`;
        let response = await sequelize.query(`Select redemptions.redemption_id,
                                                     redemptions.transaction_id,
                                                     redemptions.redeem_amount,
                                                     redemptions.bank_reason,
                                                     redemptions.tds_amount,
                                                     redemptions.createdAt,
                                                     redemptions.updatedAt,
                                                     redemptions.redemption_status,
                                                     users.username
                                              from redemptions
                                                       join users on redemptions.user_id = users.user_id
                                              where ${query} LIMIT ${offset}
                                                  , ${limit}`, {type: sequelize.QueryTypes.SELECT});
        let responseTotalCount = await sequelize.query(`Select redemptions.*
                                                        from redemptions
                                                                 join users on redemptions.user_id = users.user_id
                                                        where ${query}`, {type: sequelize.QueryTypes.SELECT});
        let totalCount = responseTotalCount.length;

        if (responseTotalCount == 0) {
            responseData.msg = 'Data not found';
            return responseHelper.error(res, responseData, 201);
        }
        let sum = 0;
        response = response.map(async (element, i) => {
            sum += parseFloat(element.redeem_amount)
            return element;
        })
        response = await Promise.all(response);
        return res.status(200).send({
            message: 'Total Deposit List!!!',
            statusCode: 200,
            status: true,
            totalCount: totalCount,
            totalAmount: sum.toFixed(2),
            data: response,
        })
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const tdsSummary = async (req, res) => {
    let responseData = {};
    try {
        const {page, search_key, from_date, end_date, csvtype} = req.query;
        const {limit, offset} = getPagination(page, csvtype);
        let query = `redemption_status='Withdraw'`;
        if (req.query.user_id) {
            query += ` AND redemptions.user_id='${req.query.user_id}'`;
        }
        if (from_date && end_date) {
            let fromDate = moment(from_date).format('YYYY-MM-DD');
            let endDate = moment(end_date).format('YYYY-MM-DD');
            console.log('d');
            query += ` AND DATE(redemptions.createdAt) BETWEEN '${fromDate}' AND '${endDate}'`;
        }

        if (search_key) {
            query += ` AND (users.username like '%${search_key}%' OR users.referral_code like '%${search_key}%' OR users.full_name like '%${search_key}%' OR game_histories.table_name like '%${search_key}%' OR game_histories.table_id like '%${search_key}%')`;
        }
        query += ` order by redemption_id DESC`;
        let response = await sequelize.query(`Select redemptions.redemption_id,
                                                     redemptions.transaction_id,
                                                     redemptions.redeem_amount,
                                                     redemptions.bank_reason,
                                                     redemptions.tds_amount,
                                                     redemptions.user_id,
                                                     redemptions.createdAt,
                                                     redemptions.updatedAt,
                                                     redemptions.redemption_status,
                                                     users.username
                                              from redemptions
                                                       join users on redemptions.user_id = users.user_id
                                              where ${query} LIMIT ${offset}
                                                  , ${limit}`, {type: sequelize.QueryTypes.SELECT});
        let responseTotalCount = await sequelize.query(`Select redemptions.*
                                                        from redemptions
                                                                 join users on redemptions.user_id = users.user_id
                                                        where ${query}`, {type: sequelize.QueryTypes.SELECT});
        let totalCount = responseTotalCount.length;

        if (responseTotalCount == 0) {
            responseData.msg = 'Data not found';
            return responseHelper.error(res, responseData, 201);
        }
        let sum = 0;
        response = response.map(async (element, i) => {
            sum += parseFloat(element.tds_amount)
            return element;
        })
        response = await Promise.all(response);
        return res.status(200).send({
            message: 'Total Deposit List!!!',
            statusCode: 200,
            status: true,
            totalCount: totalCount,
            totalAmount: sum.toFixed(2),
            data: response,
        })
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const totalDeposit = async (req, res) => {
    let responseData = {};
    try {
        const {page, search_key, from_date, end_date, csvtype} = req.query;
        const {limit, offset} = getPagination(page, csvtype);
        let query = `other_type='Deposit' AND transaction_status='SUCCESS' AND is_admin=0`;
        if (req.query.user_id) {
            query += ` AND transactions.user_id='${req.query.user_id}'`;
        }
        if (from_date && end_date) {
            let fromDate = moment(from_date).format('YYYY-MM-DD');
            let endDate = moment(end_date).format('YYYY-MM-DD');
            console.log('d');
            query += ` AND DATE(transactions.createdAt) BETWEEN '${fromDate}' AND '${endDate}'`;
        }

        if (search_key) {
            query += ` AND (users.username like '%${search_key}%' OR users.referral_code like '%${search_key}%' OR users.full_name like '%${search_key}%' OR game_histories.table_name like '%${search_key}%' OR game_histories.table_id like '%${search_key}%')`;
        }
        query += ` order by transaction_id DESC`;
        let response = await sequelize.query(`Select transactions.amount,
                                                     transactions.gst_amount,
                                                     transactions.createdAt,
                                                     transactions.transaction_status,
                                                     transactions.order_id,
                                                     users.username
                                              from transactions
                                                       join users on transactions.user_id = users.user_id
                                              where ${query} LIMIT ${offset}
                                                  , ${limit}`, {type: sequelize.QueryTypes.SELECT});
        let responseTotalCount = await sequelize.query(`Select transactions.*
                                                        from transactions
                                                                 join users on transactions.user_id = users.user_id
                                                        where ${query}`, {type: sequelize.QueryTypes.SELECT});
        let totalCount = responseTotalCount.length;

        if (responseTotalCount == 0) {
            responseData.msg = 'Data not found';
            return responseHelper.error(res, responseData, 201);
        }
        let sum = 0;
        response = response.map(async (element, i) => {
            sum += parseFloat(element.amount)
            return element;
        })
        response = await Promise.all(response);
        return res.status(200).send({
            message: 'Total Deposit List!!!',
            statusCode: 200,
            status: true,
            totalCount: totalCount,
            totalAmount: sum.toFixed(2),
            data: response,
        })
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const gstSummary = async (req, res) => {
    let responseData = {};
    try {
        const {page, search_key, from_date, end_date, csvtype} = req.query;
        const {limit, offset} = getPagination(page, csvtype);
        let query = `other_type='Deposit' AND transaction_status='SUCCESS'`;
        if (req.query.user_id) {
            query += ` AND transactions.user_id='${req.query.user_id}'`;
        }
        if (from_date && end_date) {
            let fromDate = moment(from_date).format('YYYY-MM-DD');
            let endDate = moment(end_date).format('YYYY-MM-DD');
            console.log('d');
            query += ` AND DATE(transactions.createdAt) BETWEEN '${fromDate}' AND '${endDate}'`;
        }

        if (search_key) {
            query += ` AND (users.username like '%${search_key}%' OR users.referral_code like '%${search_key}%' OR users.full_name like '%${search_key}%' OR game_histories.table_name like '%${search_key}%' OR game_histories.table_id like '%${search_key}%')`;
        }
        query += ` order by transaction_id DESC`;
        let response = await sequelize.query(`Select transactions.amount,
                                                     transactions.gst_amount,
                                                     transactions.createdAt,
                                                     transactions.transaction_status,
                                                     transactions.user_id,
                                                     users.username,
                                                     users.uuid
                                              from transactions
                                                       join users on transactions.user_id = users.user_id
                                              where ${query} LIMIT ${offset}
                                                  , ${limit}`, {type: sequelize.QueryTypes.SELECT});
        let responseTotalCount = await sequelize.query(`Select transactions.*
                                                        from transactions
                                                                 join users on transactions.user_id = users.user_id
                                                        where ${query}`, {type: sequelize.QueryTypes.SELECT});
        let totalCount = responseTotalCount.length;

        if (responseTotalCount == 0) {
            responseData.msg = 'Data not found';
            return responseHelper.error(res, responseData, 201);
        }
        let sum = 0;
        response = response.map(async (element, i) => {
            sum += parseFloat(element.gst_amount)
            return element;
        })
        response = await Promise.all(response);
        return res.status(200).send({
            message: 'Total Deposit List!!!',
            statusCode: 200,
            status: true,
            totalCount: totalCount,
            totalAmount: sum.toFixed(2),
            data: response,
        })
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const addDeposit = async (req, res) => {
    let responseData = {};
    try {
        let userId = req.body.user_id;
        let amount = req.body.amount;
        let winamount = req.body.win_amount;
        let check = await userService.getUserWalletDetailsById({user_id: userId});
        if (check) {
            let walletD = parseFloat(check.real_amount) + parseFloat(amount);
            let winWalletD = parseFloat(check.win_amount) + parseFloat(winamount);
            await userService.updateUserWallet({real_amount: walletD, win_amount: winWalletD}, {user_id: userId})
        }
        if (amount) {
            let transaction = {
                user_id: userId,
                type: "CR",
                other_type: 'Deposit By Admin',
                reference: 'Deposit',
                amount: amount,
                transaction_status: 'SUCCESS',
                is_deposit: 1
            }
            await userService.createTransaction(transaction);
        }
        if (winamount) {
            let transaction1 = {
                user_id: userId,
                type: "CR",
                other_type: 'Deposit By Admin',
                reference: 'Winning',
                amount: winamount,
                transaction_status: 'SUCCESS',
                is_deposit: 1
            }
            await userService.createTransaction(transaction1);
        }

        responseData.msg = 'Deposit Added';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const cashTransaction = async (req, res) => {
    let responseData = {};
    try {
        const {game_type,page = 1, search_key = '', from_date, end_date, csvtype} = req.query;
        const {limit, offset} = getPagination(page);
        let getUserData;
        let baseQuery;
        let getCount;
        if (game_type) {
            baseQuery = `SELECT t.*, u.username, u.email, u.mobile
            FROM transactions t
                     JOIN users u ON t.user_id = u.user_id
            WHERE t.other_type!= 'Coin' AND t.category='${game_type}'`;
        } else {
            baseQuery = `SELECT t.*, u.username, u.email, u.mobile
            FROM transactions t
                     JOIN users u ON t.user_id = u.user_id
            WHERE t.other_type!= 'Coin'`;
        }
        // Add search condition if search_key is provided
        if (search_key) {
            baseQuery += ` AND (
                u.username LIKE '%${search_key}%' OR 
                u.email LIKE '%${search_key}%' OR 
                u.mobile LIKE '%${search_key}%'
            )`;
        }

        // Add date range filter if dates are provided
        if (from_date && end_date) {
            baseQuery += ` AND t.createdAt BETWEEN '${from_date}' AND '${end_date}'`;
        } else if (from_date) {
            baseQuery += ` AND t.createdAt >= '${from_date}'`;
        } else if (end_date) {
            baseQuery += ` AND t.createdAt <= '${end_date}'`;
        }
        // Get paginated data with count
        getUserData = await sequelize.query(
            `${baseQuery} ORDER BY t.createdAt DESC LIMIT ${limit} OFFSET ${offset}`,
            {type: sequelize.QueryTypes.SELECT}
        );

        getCount = await sequelize.query(
            `SELECT COUNT(*) as total
             FROM (${baseQuery}) as count_query`,
            {type: sequelize.QueryTypes.SELECT}
        )
        if (getUserData.length == 0) {
            responseData.msg = 'Data not found';
            return responseHelper.error(res, responseData, 201);
        }

        const totalCount = getCount[0].total;
        responseData.msg = 'Cash Transaction List!!!';
        responseData.count = totalCount;
        responseData.data = getUserData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const bonusUpdate = async (req, res) => {
    let responseData = {};
    try {
        const {welcome_bonus, referral_bonus, deposit_bonus, registration_bonus, bet_bonus_amount} = req.body;
        let info = req.body
        console.log("re.user", req.user);
        const checkBonus = await adminService.getReferralBonus();
        if (!checkBonus) {
            // info.added_by = req.user.admin_id
            console.log(info);
            await adminService.createBonusSetting(info);
        } else {
            console.log(info);
            // info.updated_by = req.user.admin_id
            console.log(info);
            await adminService.updateBonusSetting(info, {refer_bonus_id: checkBonus.refer_bonus_id});
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

const getLudoUsers = async (req, res) => {
    let responseData = {};
    try {
        // Fetch ludo game history
        let ludoGameHistory = await adminService.getLudoGameHistory();

        // Extract unique user IDs
        let userIds = [...new Set(ludoGameHistory.map(game => game.userId))];

        // Initialize an empty array to store user data
        let users = [];

        // Loop through each userId and fetch user data
        for (let userId of userIds) {
            let user = await adminService.getUserDetailsById({user_id: userId});
            if (user) {
                // Decrypt email and mobile or set them to null if not present
                let decryptedEmail = user.email ? await decryptData(user.email) : null;
                let decryptedMobile = user.mobile ? await decryptData(user.mobile) : null;

                // Push relevant user details into users array
                users.push({
                    user_id: user.user_id,
                    fullname: user.full_name,
                    username: user.username,
                    email: decryptedEmail,
                    mobile: decryptedMobile,
                    profile_image: user.profile_image,
                    number_of_win_games: user.number_of_win_games,
                    amount_win_in_game: user.amount_win_in_game,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                });
            }
        }

        // Send success response
        responseData.data = users;
        return responseHelper.success(res, responseData, 200);

    } catch (error) {
        // Send error response in case of failure
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

// const getPoolUsers = async (req, res) => {
//   let responseData = {};
//   try {
//     // Fetch pool game history
//     let poolGameHistory = await adminService.getPoolGameHistory();

//     // Extract unique user IDs
//     let userIds = [...new Set(poolGameHistory.map(game => game.userId))];

//     // Initialize an empty array to store user data
//     let users = [];

//     // Loop through each userId and fetch user data
//     for (let userId of userIds) {
//       let user = await adminService.getUserDetailsById({ user_id: userId });
//       if (user) {
//         // Decrypt email and mobile or set them to null if not present
//         let decryptedEmail = user.email ? await decryptData(user.email) : null;
//         let decryptedMobile = user.mobile ? await decryptData(user.mobile) : null;

//         // Push relevant user details into users array
//         users.push({
//           user_id: user.user_id,
//           username: user.username,
//           email: decryptedEmail,
//           mobile: decryptedMobile,
//           profile_image: user.profile_image,
//           number_of_win_games: user.number_of_win_games,
//           amount_win_in_game: user.amount_win_in_game,
//         });
//       }
//     }

//     responseData.data = users;
//     return responseHelper.success(res, responseData, 200);

//   } catch (error) {
//     // Send error response in case of failure
//     responseData.msg = error.message;
//     return responseHelper.error(res, responseData, 500);
//   }
// };

const gameWiseUserStatus = async (req, res) => {
    let responseData = {};
    try {
        let userId = req.body.user_id;
        let gameId = req.body.game_id;
        let status = req.body.status;
        let type = req.body.type;
        let blockTime = req.body.block_time;
        let is_blocked_until_unblock=req.body.is_blocked_until_unblock;
        let blockTimeInt = blockTime.replace(/[^\d.]/g, ' ');
        var now = new Date().getTime()
        let time = Math.floor(now / 1000);
        let min;
        if (blockTimeInt == 24) {
            min = 86400;
        } else {
            min = 1800;
        }


        if(status==="Active"){
            const check = await adminService.getUserStatus({ user_id: userId, game_id: gameId });
            if (!check) {
                responseData.msg = 'User status not found';
                return responseHelper.error(res, responseData, 404);
            }
            let updatedData=await adminService.updateUserStatus({
                user_game_status: status,
                block_time: null,
                block_timestamp: null,
                is_blocked_until_unblock: false,
                updatedAt: new Date()
            }, {
                user_game_status_id: check.user_game_status_id
            });
            responseData.data=updatedData,
            responseData.msg = 'User unblocked successfully';
            return responseHelper.success(res, responseData);
        }
        let blockTimeStamp = parseInt(time) + parseInt(min);
        let data = {
            user_id: userId,
            game_id: gameId,
            type: type,
            block_time: blockTime,
            block_timestamp: blockTimeStamp,
            user_game_status: status,
            is_blocked_until_unblock:is_blocked_until_unblock,
            update_at: new Date()
        }


        let check = await adminService.getUserStatus({user_id: userId, game_id: gameId});
        if (check && parseInt(check.block_timestamp) > parseInt(time) || check &&check.is_blocked_until_unblock=="1") {
            responseData.data=check,
            responseData.msg = 'User Already Blocked!!!';
            return responseHelper.error(res, responseData, 201);
        } else if (check && parseInt(check.block_timestamp) < parseInt(time)|| (check && check.user_game_status=="Active" )) {
            let updatedData=await adminService.updateUserStatus(data, {user_game_status_id: check.user_game_status_id})
            responseData.data=updatedData,
            responseData.msg = 'User Blocked successfully!!!';
            return responseHelper.success(res, responseData);
        } else {
            let updatedData=await adminService.addUserStatus(data)
            responseData.data=updatedData,
            responseData.msg = 'User Blocked successfully!!!';
            return responseHelper.success(res, responseData);
        }


    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}


const getAllpockerSuspiciousActions = async (req, res) => {
    let responseData = {};
    try {
        let page = req.query.page || 1;
        let search_key = req.query.search_key || "";
        let size = parseInt(req.query.rows_per_page, 10) || 10;
        let from_date = req.query.from_date || null;
        let end_date = req.query.end_date || null;

        const {limit, offset} = getPagination(page, size);
        // Get total count with filters
        let totalCountResult = await adminService.getSuspiciousActionsCount(search_key, from_date, end_date);
        let totalCount = totalCountResult[0]?.count || 0;
        let totalPages = Math.ceil(totalCount / limit);

        // Fetch filtered data
        let allSuspiciousActionsData = await adminService.getAllpockerSuspiciousActions({
            limit,
            offset,
            search_key,
            from_date,
            end_date
        });

        if (!allSuspiciousActionsData || allSuspiciousActionsData.length === 0) {
            responseData.msg = "There are no suspicious actions found";
            return responseHelper.success(res, responseData);
        }

        // Process and add table_name from game_json_data
        allSuspiciousActionsData = allSuspiciousActionsData.map(action => {
            try {
                const gameData = JSON.parse(action.game_json_data || "{}");
                action.table_name = gameData.room_name || "Unknown";
            } catch (err) {
                console.error("Error parsing game_json_data:", err);
                action.table_name = "Unknown";
            }
            return action;
        });

        responseData.msg = "All data fetched successfully";
        responseData.data = {totalCount, totalPages, limit, allSuspiciousActionsData};
        return responseHelper.success(res, responseData);

    } catch (error) {
        console.error("Error fetching suspicious actions:", error);
        responseData.msg = error.message || "Something went wrong";
        return responseHelper.error(res, responseData, 500);
    }
};

const gameWiseCommission = async (req, res) => {
    let responseData = {};
    try {
  
        const query = `
            SELECT 
                SUM(CASE WHEN category = 'Poker' AND other_type = 'Table Commision' THEN commission ELSE 0 END) AS pokerCommission,
                SUM(CASE WHEN category = 'Rummy' AND other_type = 'commission' THEN commission ELSE 0 END) AS rummyCommission,
                SUM(CASE WHEN category = 'Ludo' AND other_type = 'Winning' THEN commission ELSE 0 END) AS ludoCommission,
                SUM(CASE WHEN category = 'Pool' AND other_type = 'commission' THEN amount ELSE 0 END) AS poolCommission
            FROM europaGame.transactions
        `;

        const [result] = await db.sequelize.query(query, {
            type: db.sequelize.QueryTypes.SELECT
        });
        const ludoCommission = parseFloat(result.ludoCommission) || 0;
        const poolCommission = parseFloat(result.poolCommission) || 0;
        const rummyCommission = parseFloat(result.rummyCommission) || 0;
        const pokerCommission = parseFloat(result.pokerCommission) || 0;

        const totalCommision = ludoCommission + poolCommission + rummyCommission + pokerCommission;
        responseData.msg = "All data fetched successfully";
        responseData.data = {
             ludoCommission: ludoCommission.toFixed(2),
            pokerCommission: pokerCommission.toFixed(2),
            poolCommission: poolCommission.toFixed(2),
            rummyCommission: rummyCommission.toFixed(2),
            totalCommission: totalCommision.toFixed(2)
        };

        return responseHelper.success(res, responseData);

    } catch (error) {
      console.error("Error fetching game-wise commission:", error);
      responseData.msg = error.message || "Something went wrong";
      return responseHelper.error(res, responseData, 500);
    }
  };

const liveUserCount = async (req, res) => {
    let responseData = {};
    try {

        let newdate = moment(new Date(), 'DD/MM/YYYY').format('YYYY-MM-DD')
        let response = await sequelize.query(`Select live_users.id
                                              from live_users
                                              where DATE (live_users.createdAt)='${newdate}' AND live_users.game_type='Fantasy'
                                              group by live_users.user_id`, {type: sequelize.QueryTypes.SELECT});
        let response1 = await sequelize.query(`Select live_users.id
                                               from live_users
                                               where DATE (live_users.createdAt)='${newdate}' AND live_users.game_type='Poker'
                                               group by live_users.user_id`, {type: sequelize.QueryTypes.SELECT});
        let response2 = await sequelize.query(`Select live_users.id
                                               from live_users
                                               where DATE (live_users.createdAt)='${newdate}' AND live_users.game_type='Rummy'
                                               group by live_users.user_id`, {type: sequelize.QueryTypes.SELECT});
        let response3 = await sequelize.query(`Select live_users.id
                                               from live_users
                                               where DATE (live_users.createdAt)='${newdate}' AND live_users.game_type='Ludo'
                                               group by live_users.user_id`, {type: sequelize.QueryTypes.SELECT});
        console.log('response2.length', response1.length)
        responseData.msg = 'User List';
        responseData.data = {
            fantasy_user: response.length,
            poker_user: response1.length,
            rummy_user: response2.length,
            ludo_user: response3.length
        };
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const getGameHistoryData = async (req, res) => {
    try {
        const {game_type, page, search_key, from_date, end_date} = req.query;
        const {limit, offset} = getPagination(page);

        // Initialize WHERE conditions and replacements
        const whereConditions = [];
        const replacements = {limit, offset};

        // Add conditions based on query parameters
        if (game_type) {
            whereConditions.push('gh.game_category = :game_type');
            replacements.game_type = game_type;

            if (game_type == 2) {
                whereConditions.push('gh.game_type NOT IN (81, 82, 83)');
            }
        }

        if (from_date && end_date) {
            whereConditions.push('DATE(gh.createdAt) BETWEEN :fromDate AND :endDate');
            replacements.fromDate = moment(from_date).format('YYYY-MM-DD');
            replacements.endDate = moment(end_date).format('YYYY-MM-DD');
        }

        if (search_key) {
            const gameTypes = await sequelize.query(
                `SELECT game_type_id
                 FROM game_types
                 WHERE name LIKE :searchKey`,
                {replacements: {searchKey: `%${search_key}%`}, type: sequelize.QueryTypes.SELECT}
            );

            if (gameTypes.length > 0) {
                whereConditions.push('gh.game_type = :gameTypeId');
                replacements.gameTypeId = gameTypes[0].game_type_id;
            } else {
                whereConditions.push(
                    `(u.username LIKE :searchKey OR 
                     u.referral_code LIKE :searchKey OR 
                     u.full_name LIKE :searchKey OR 
                     gh.table_name LIKE :searchKey OR 
                     gh.table_id LIKE :searchKey)`
                );
                replacements.searchKey = `%${search_key}%`;
            }
        }

        // Build the final query
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Get table_ids with pagination
        const tableIdsResult = await sequelize.query(
            `SELECT DISTINCT gh.table_id, gh.table_name, gh.game_type, gh.blind, gh.createdAt, gh.updatedAt
             FROM game_histories gh
                      JOIN users u ON gh.user_id = u.user_id
                 ${whereClause}
             ORDER BY gh.game_history_id DESC
                 LIMIT :limit
             OFFSET :offset`,
            {replacements, type: sequelize.QueryTypes.SELECT}
        );

        // Get total count
        const countResult = await sequelize.query(
            `SELECT COUNT(DISTINCT gh.table_id) as totalCount
             FROM game_histories gh
                      JOIN users u ON gh.user_id = u.user_id
                 ${whereClause}`,
            {replacements, type: sequelize.QueryTypes.SELECT}
        );

        // Get detailed history for each table
        const tableDetails = await Promise.all(
            tableIdsResult.map(async ({table_id, table_name, game_type, blind, createdAt, updatedAt}) => {
                // Get game history for the table
                const gameHistory = await userService.getGameHistoryByQuery({table_id});

                // Get game type name
                const getGameType = await adminService.getGameTypeByQuery({game_type_id: game_type});

                // Enrich each game history entry with username
                const enrichedHistory = await Promise.all(
                    gameHistory.map(async (history) => {
                        const user = await adminService.getUserDetailsById({user_id: history.user_id});
                        return {
                            ...history,
                            community_card: JSON.parse(history.community_card),
                            hands_record: JSON.parse(history.hands_record),
                            hand_history: JSON.parse(history.hand_history),
                            username: user?.username || 'Unknown'  // Add username to each entry
                        };
                    })
                );

                return {
                    table_id,
                    table_name,
                    blind,
                    createdAt,
                    updatedAt,
                    game_category: getGameType?.name || '',
                    users: enrichedHistory  // Now includes usernames
                };
            })
        );

        return res.status(200).json({
            success: true,
            count: countResult[0]?.totalCount || 0,
            data: tableDetails
        });

    } catch (error) {
        console.error('Error fetching game history:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
const commissionSummary = async (req, res) => {
    let responseData = {};
    try {
        const { page, search_key, from_date, end_date,csvtype} = req.query;
        const {limit, offset} = getPagination(page,csvtype);
        let query = `(other_type='Winning' OR other_type='Table Commision') AND transaction_status='SUCCESS'`;
        if(req.query.user_id){
            query += ` AND transactions.user_id='${req.query.user_id}'`;
        }
        if (from_date && end_date) {
            let fromDate = moment(from_date).format('YYYY-MM-DD');
            let endDate = moment(end_date).format('YYYY-MM-DD');
            console.log('d');
            query += ` AND DATE(transactions.createdAt) BETWEEN '${fromDate}' AND '${endDate}'`;
        }

        if (search_key) {
            query += ` AND (users.username like '%${search_key}%' OR users.referral_code like '%${search_key}%' OR users.full_name like '%${search_key}%' OR game_histories.table_name like '%${search_key}%' OR game_histories.table_id like '%${search_key}%')`;
        }
        query += ` order by transaction_id DESC`;
        let response = await sequelize.query(`Select transactions.amount,transactions.category,transactions.commission,transactions.user_id,transactions.createdAt,transactions.transaction_status, users.uuid, users.username  from transactions join users on transactions.user_id = users.user_id where ${query}  LIMIT ${offset}, ${limit}`, {type: sequelize.QueryTypes.SELECT});
        let responseTotalCount = await sequelize.query(`Select transactions.*  from transactions join users on transactions.user_id = users.user_id where ${query}`, {type: sequelize.QueryTypes.SELECT});
        let totalCount = responseTotalCount.length;

        if (responseTotalCount == 0) {
            responseData.msg = 'Data not found';
            return responseHelper.error(res, responseData, 201);
        }
        let sum = 0;
        response = response.map(async (element, i) => {
            sum += parseFloat(element.commission);
            const commission = parseFloat(element.commission);
            const amount = parseFloat(element.amount);
            console.log(parseFloat(element.bet_amount))
            if (parseFloat(element.bet_amount) > 0) {
                element.bet_amount = element.bet_amount;
            }else{
                element.bet_amount = Math.abs(commission + amount);
            }
            return element;
        })
        response = await Promise.all(response);
        return res.status(200).send({
            message: 'Total Commission List!!!',
            statusCode: 200,
            status: true,
            totalCount: totalCount,
            totalAmount: sum.toFixed(2),
            data: response,
        })
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const getCommissionByTableId = async (req, res) => {
    let responseData = {};
    try {
        let tableRoundId = req.query.table_round_id;
        if (!tableRoundId) {
            return responseHelper.error(res, { msg: "table_round_id is required" }, 400);
        }

        let transactionData = await userService.getTransactionData({ reference: tableRoundId });
        console.log("transactionData--->",transactionData);

        if (!transactionData || transactionData.length === 0) {
            return responseHelper.error(res, { msg: "No transactions found" }, 404);
        }

        let totalCommission = 0;
        let totalWinnings = 0;

        for (let txn of transactionData) {
            totalCommission += parseFloat(txn.commission || 0);
            const amount = parseFloat(txn.amount || 0);
            if (amount >= 0) {
                totalWinnings += amount;
            }
        }

        responseData = {
            msg: "Commission summary fetched successfully",
            status: true,
            data: {
                table_round_id: tableRoundId,
                total_commission: totalCommission,
                total_winnings: totalWinnings
            }
        };

        return res.status(200).send(responseData);

    } catch (error) {
        console.error("Error fetching getCommissionByTableId:", error);
        responseData.msg = error.message || "Something went wrong";
        return responseHelper.error(res, responseData, 500);
    }
};




module.exports = {
    commissionSummary,
    adminLogin,
    addRole,
    roleList,
    roleById,
    updateRoleById,
    activeRoleList,
    changeRoleStatus,
    changePassword,
    dashboard,
    userList,
    userDetail,
    createGame,
    gameList,
    getGameTables,
    getUserGames,
    gameDetail,
    updateGame,
    userKycDetail,
    userBankAccount,
    filterUser,
    activeUserList,
    todayUserList,
    updateUserProfile,
    addGameCategory,
    updategameCategoryById,
    gameCategoryList,
    gameCategoryById,
    addGameType,
    updategameTypeById,
    gameTypeList,
    gameTypeById,
    userActivity,
    adminActivity,
    userLoginActivity,
    changeGameCategoryStatus,
    changeGameTypeStatus,
    changeGameStatus,
    getGameFields,
    getActiveGameCategoryList,
    getProfile,
    activeUserListNew,
    forgotPassword,
    verifyOtpForForgotPassword,
    resetPassword,
    addPriceStructure,
    priceStructureList,
    priceStructureById,
    updatePriceStructureById,
    addBlindStructure,
    blindStructureList,
    blindStructureById,
    updateBlindStructureById,
    getClubList,
    getClubDetail,
    createVipPriviledge,
    updateVipPriviledge,
    getVipPriviledgeById,
    getAllVipPriviledge,
    addClubLevel,
    updateClubLevel,
    getClubLevelById,
    getAllClubLevel,
    deleteBlindStructure,

    addShop,
    updateShop,
    getShopById,
    getAllShop,

    addMission,
    updateMission,
    getMissionById,
    getAllMission,
    deletePriceStructure,
    changeVipPriviledgeStatus,
    changeShopStatus,
    memberDetails,
    changeClubStatus,

    uploadImage,
    addModule,
    delModule,
    addRoleModule,
    deleteRoleModule,
    addUserRole,
    deleteUserRole,
    getAllModules,
    updateModule,
    updateRoleModules,
    updateUserRole,

    addMemberRole,
    addclubModule,
    addclubMemberRoleModule,
    running_tables_rummy,
    add_avatar,
    get_all_avatars,
    delete_avatar,
    sendNotification,
    getWinningAmount,
    getGameWiseUsers,
    getGameHistory,
    getRummyGameHistoryByTableId,
    getLeaderBoardData,
    getRunningTable,
    getTotalTable,
    addBanner,
    updateBannerById,
    bannerList,
    bannerById,
    changeBannerStatus,

    createTournament,
    tournamentDetail,
    tournamentList,
    updateTournament,
    updateTournamentStatus,
    cancelTournament,
    getTypeListByName,

    pendingWithdrawal,
    todayWithdrawal,
    changeWithDrawlStatus,
    todayDeposit,
    totalWinning,
    cashTransaction,
    getBonusData,
    bonusUpdate,
    getLudoUsers,
    // getPoolUsers
    gameWiseUserStatus,
    getAllpockerSuspiciousActions,
    gameWiseCommission,
    ledgerDetails,
    tdsSummary,
    gstSummary,
    totalWithdrawal,
    totalDeposit,
    addDeposit,
    liveUserCount,
    getGameHistoryData,
    getCommissionByTableId,
}
