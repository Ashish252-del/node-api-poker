const ClubService = require('../services/clubService');
const responseHelper = require("../helpers/customResponse");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const db = require("../helpers/db");
const {sequelize} = require("../models");

//Create Union
const createUnion = async (req, res) => {
    let responseData = {};
    try {
        let {union_name} = req.body;
        let userId = req.user.user_id;
        let getData = await ClubService.getUnionById({union_adminId: userId});
        if (getData) {
            responseData.msg = 'Cannot Create More Than One union';
            return responseHelper.success(res, responseData, 201);
        }
        let unionUniqueId = 'CLUB_' + Date.now();
        let club = await ClubService.createUnion({union_name, union_unique_id: unionUniqueId, union_adminId: userId})
        // let joinClubData = await ClubService.joinClub({
        //     clubId: club.clubId,
        //     is_club_admin: true,
        //     user_id: userId,
        //     amount: 10000,
        //     is_approve: '1'
        // })
        // let chipsObj = {
        //     club_id: club.clubId,
        //     user_id: userId,
        //     amount: 10000,
        //     type: 'CR',
        //     is_club_admin: true
        // }
        //await ClubService.createClubTradeHistory(chipsObj)

        responseData.msg = 'Union Created Successfully';
        responseData.data = club;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const updateUnion = async (req, res) => {
    let responseData = {};
    try {
        let {id, union_name, union_notice} = req.body;
        let userId = req.user.user_id;
        let getData = await ClubService.getUnionById({id: id});
        if (!getData) {
            responseData.msg = 'Union not found';
            return responseHelper.success(res, responseData, 201);
        }
        let result = await ClubService.updateUnion({union_name, union_notice}, {where: {id: id}})
        responseData.msg = 'Union Updated Successfully';
        responseData.data = result;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const getUnionById = async (req, res) => {
    let responseData = {};
    try {
        let {id, union_name, union_notice} = req.body;
        let userId = req.user.user_id;
        let getData = await ClubService.getUnionById({id: id});
        if (!getData) {
            responseData.msg = 'Union not found';
            return responseHelper.success(res, responseData, 201);
        }
        responseData.msg = 'Union Updated Successfully';
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}


module.exports = {
    createUnion,
    updateUnion,
    getUnionById
}