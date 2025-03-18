const pokerService = require('../services/pokerService');
const ClubService = require('../services/clubService');
const responseHelper = require("../helpers/customResponse");
const {unlockBalanceOfUser, addPrizeMoney} = require("./userController");
const Sequelize = require("sequelize");
const {getGameTypeModalDataByQuery} = require("../services/pokerService");
const Op = Sequelize.Op;
const ChatModel = require("../models/chatMessage");
const db = require("../helpers/db");
const {sequelize} = require("../models");
const userController = require("./userController");
const {sendLiveNotification, emitClubList,sendLiveClumMembersCount} = require("../helpers/redis")
const adminService = require("../services/adminService");
const zlib = require("zlib");
const {encryptData, makeString, decryptData} = require("../utils");
const userService = require("../services/userService");
const {getRedisClient} = require("../helpers/redis");
//Create Club
const createClub = async (req, res) => {
    let responseData = {};
    try {
        let {club_name} = req.body;
        let userId = req.user.user_id;
        let getData = await ClubService.getClubByClubId({where:{club_adminId: userId}, raw:true});
        if (getData) {
            responseData.msg = 'Cannot Create More Than One Club';
            return responseHelper.success(res, responseData, 201);
        }
        let clubUniqueId = 'CLUB_' + Date.now();
        let club = await ClubService.createClub({club_name, club_unique_id: clubUniqueId, club_adminId: userId})
        let joinClubData = await ClubService.joinClub({
            clubId: club.clubId,
            is_club_admin: true,
            user_id: userId,
            amount: 10000,
            is_approve: '1'
        })
        let chipsObj = {
            club_id: club.clubId,
            user_id: userId,
            amount: 10000,
            type: 'CR',
            is_club_admin: true
        }
        await ClubService.createClubTradeHistory(chipsObj)

        responseData.msg = 'Club Created Successfully';
        responseData.data = club;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const updateClub = async (req, res) => {
    let responseData = {};
    try {
        let {club_id, club_name, club_notice} = req.body;
        let userId = req.user.user_id;
        let getData = await ClubService.getClubByClubId({where:{clubId: club_id}, raw:true});
        if (!getData) {
            responseData.msg = 'Club not found';
            return responseHelper.success(res, responseData, 201);
        }
        let club = await ClubService.updateClub({club_name, club_notice}, {where: {clubId: club_id}})
        responseData.msg = 'Club Updated Successfully';
        responseData.data = club;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

//Get Club Details
const getClubByClubId = async (req, res) => {
    let responseData = {};
    try {
        let getData = await ClubService.getClubByClubId({where:{clubId: req.params.clubId}, raw:true});
        if (!getData) {
            responseData.msg = 'No Club Found With This Address';
            return responseHelper.success(res, responseData, 201);
        }

        responseData.msg = 'Club fetched Successfully';
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

//User Joined Clubs List
const getJoindClubByUserId = async (req, res) => {
    let responseData = {};
    try {
        let getData = await ClubService.getClubByUserId({where:{user_id: req.user.user_id, is_approve:'1'}, raw:true});
        if (getData.length==0) {
            responseData.msg = 'No Club Joined Yet ';
            return responseHelper.success(res, responseData, 201);
        }
        getData = getData.map(async(element) => {
            let clubDetail = await ClubService.getClubByClubId({where:{clubId: element.clubId}, raw:true});
            element.club_name = (clubDetail) ? clubDetail.club_name : '';
            element.club_unique_id = (clubDetail) ? clubDetail.club_unique_id : '';
            element.club_adminId = (clubDetail) ? clubDetail.club_adminId : '';
            return element;
        })
        getData = await Promise.all(getData);
        responseData.msg = 'Club fetched Successfully';
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

// to send request to join a club 
const sendClubJoinReq = async (req, res) => {
    let responseData = {};
    try {
        let getData = await ClubService.getClubByClubId({where:{club_unique_id: req.body.clubId}, raw:true});
        if (!getData) {
            responseData.msg = 'No Club Found With This Address';
            return responseHelper.success(res, responseData, 201);
        }
        console.log('',req.user.user_id, getData.clubId)
        let check = await ClubService.getRequestSent({where: {user_id: req.user.user_id, clubId: getData.clubId}, raw:true});
        console.log('',req.user.user_id, getData.clubId, check)
        if (check) {
            responseData.msg = 'Already sent';
            return responseHelper.success(res, responseData, 201);
        }
        let joinClubData = await ClubService.joinClub({
            clubId: getData.clubId,
            is_club_admin: false,
            user_id: req.user.user_id
        })

        //Send Notification
        let notificationObject = {
            sender_user_id: req.user.user_id,
            receiver_user_id: getData.club_adminId,
            message: 'You have received new request of club - ' + getData.club_name + '!!!'
        }
        await sendNotification(notificationObject)
        responseData.msg = 'Request Send Successfully';
        responseData.data = joinClubData;

        //Send Live Notification count
        await sendLiveNotification(getData.club_adminId);
        await sendLiveClumMembersCount (getData.club_adminId,getData.clubId );
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

//Send Notification function
const sendNotification = async (data) => {
    let responseData = {};
    try {
        await ClubService.saveNotification(data);
        return true;
    } catch (error) {
        return false;
    }
}

//Get User Notifications
const getNotificationByUserId = async (req, res) => {
    let responseData = {};
    try {
        console.log(req.user.user_id)
        let result = await ClubService.getNotificationByUserId({where:{receiver_user_id: req.user.user_id}, raw:true});
        if (result.length==0) {
            responseData.msg = 'No Notification Yet ';
            return responseHelper.success(res, responseData, 201);
        }
        result = await Promise.all(result.map(async (element) => {
            let getUserDetail = await adminService.getUserDetailsById({user_id: req.user.user_id})
            return {...element,username: (getUserDetail) ? getUserDetail.username : '',profile_url: (getUserDetail && getUserDetail.profile_image) ? getUserDetail.profile_image : ''}
        }))
        responseData.msg = 'Notification fetched Successfully';
        responseData.data = result;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

//Status change for sending joined request
const changeStatusOfJoinedUsers = async (req, res) => {
    let responseData = {};
    try {
        let {registeration_id, status} = req.body;

        let getData = await ClubService.getJoinClubByClubId({registeration_Id: registeration_id});
        if (!getData) {
            responseData.msg = 'No Club Found With This Address';
            return responseHelper.success(res, responseData, 201);
        }
        let statusObj = {
            is_approve: status
        }
        await ClubService.updateJoinClub(statusObj, {where: {registeration_Id: registeration_id}});
        //Send Notification
        let msg;
        if (status == 1) {
            msg = 'Your request has been accepted';
        } else {
            msg = 'Your request hase been cancelled';
        }
        let notificationObject = {
            sender_user_id: req.user.user_id,
            receiver_user_id: getData.user_id,
            message: msg
        }
        await sendNotification(notificationObject)
        responseData.msg = 'Status Changed Successfully';
        responseData.data = {};
        if (status == 1) {
            await emitClubList(getData.user_id);
        }
        await sendLiveNotification(getData.user_id);
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

//Get Approved and pending Member list by club
const getMemberList = async (req, res) => {
    let responseData = {};
    try {
        let result;
        const clubId = req.query.clubId;
        if (req.query.type == 1) {
            result = await ClubService.getMemberList({where: {is_approve: '1', clubId: clubId}, raw:true});
        } else {
            result = await ClubService.getMemberList({where: {is_approve: '0', clubId: clubId}, raw:true});
        }
        if (result.length == 0) {
            responseData.msg = 'No Member found';
            return responseHelper.success(res, responseData, 201);
        }

        result = await Promise.all(result.map(async (element) => {
            let getUserDetail = await adminService.getUserDetailsById({user_id: element.user_id})
            return {...element,username: (getUserDetail) ? getUserDetail.username : '',profile_url: (getUserDetail && getUserDetail.profile_image) ? getUserDetail.profile_image : ''}
        }))
        responseData.msg = 'Member list';
        responseData.data = result;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const searchClub = async (req, res) => {
    let responseData = {};
    try {
        let getData = await ClubService.getClubList({
            where: {
                club_unique_id: {
                    [Op.like]: '%' + req.query.search_key + '%'
                }
            }
        });
        if (!getData) {
            responseData.msg = 'No Club Joined Yet ';
            return responseHelper.success(res, responseData, 201);
        }
        responseData.msg = 'Club fetched Successfully';
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const readNotification = async (req, res) => {
    let responseData = {};
    try {
        await ClubService.updateNotification({is_read: '1'}, {where: {receiver_user_id: req.user.user_id}});
        responseData.msg = 'Notification update done';
        responseData.data = {};
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const getGameType = async (req, res) => {
    let responseData = {};
    try {
        let result = await ClubService.getGameTypeList({where: {game_type_status: '1', club_type: 1}});
        if (result.length == 0) {
            responseData.msg = 'No game type found';
            return responseHelper.success(res, responseData, 201);
        }
        responseData.msg = 'Game type list';
        responseData.data = result;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const getClubFields = async (req, res) => {
    let responseData = {};
    try {
        let gameType = req.query.name;
        let game_type_id = req.query.game_type_id;
        let parent_type = req.query.parent_type;
        let sng_type_id = await ClubService.getClubGametypeId({
            where: {parent_type: parent_type, club_type: 2},
            attributes: ['game_type_id']
        })
        let spinup_type_id = await ClubService.getClubGametypeId({
            where: {parent_type: parent_type, club_type: 3},
            attributes: ['game_type_id']
        })
        let mtt_regular_type_id = await ClubService.getClubGametypeId({
            where: {parent_type: parent_type, club_type: 4},
            attributes: ['game_type_id']
        })
        let mtt_setellite_type_id = await ClubService.getClubGametypeId({
            where: {parent_type: parent_type, club_type: 5},
            attributes: ['game_type_id']
        })
        // game_type_id
        let fields = {};
        if (gameType == 'Poker') {
            fields.ring_fields = [
                {
                    room_name: ""
                },
                {
                    minimum_player_range: 2
                },
                {
                    maximum_player_range: 8
                },
                {
                    minimum_player: 2
                },
                {
                    maximum_player: 4
                },
                {
                    minimum_buyin_range: 100
                },
                {
                    maximum_buyin_range: 3000000
                },
                {
                    minimum_buyin: 100
                },
                {
                    maximum_buyin: 500
                },
                {
                    small_blind_min_range: 10
                },
                {
                    small_blind_max_range: 1000
                },
                {
                    small_blind: 100
                },
                {
                    action_time: 10
                },
                {
                    exclusive_table: true
                },
                {
                    password: ""
                },
                {
                    big_blind_min_range: 20
                },
                {
                    big_blind_max_range: 2000
                },
                {
                    big_blind: 200
                },
                {
                    vpip_lower_range: 0
                },
                {
                    vpip_upper_range: 100
                },
                {
                    vpip: 10
                },
                {
                    vpip_level_lower_range: 0
                },
                {
                    vpip_level_upper_range: 100
                },
                {
                    vpip_level: 0
                },
                {
                    auto_start: true
                },
                {
                    auto_start_player: 2
                },
                {
                    auto_extension: true
                },
                {
                    auto_extension_time_lower_range: 0
                },
                {
                    auto_extension_time_upper_range: 100
                },
                {
                    auto_extension_time: 30
                },
                {
                    auto_open: true
                },
                {
                    runmulti_time: true
                },
                {
                    fee: 5
                },
                {
                    cap: 3
                },
                {
                    call_time: true
                },
                {
                    call_time_duration: 5
                },
                {
                    straddle: true
                },
                {
                    authorized_to_buyIn: true
                },
                {
                    ip_restriction: true
                },
                {
                    ban_chatting: true
                },
                {
                    waiting_list: true
                },
                {
                    random_sitin: true
                },
                {
                    gps: true
                },
                {
                    run_twice: 1 // 1--> always , 2--> optional on every hand
                },
                {
                    rabbit_hunting: true
                },
                {
                    time_bank: true
                },
                {
                    time_bank_timer_lower_range: 0
                },
                {
                    time_bank_timer_upper_range: 60
                },
                {
                    time_bank_timer: 30
                },
                {
                    time_bank_cards_lower_range: 0
                },
                {
                    time_bank_cards_upper_range: 10
                },
                {
                    time_bank_cards: 3
                },
                {
                    time_bank_refresh: true
                },
                {
                    time_bank_refresh_interval: 30
                },
                {
                    time_bank_max_cards: 3
                },
                {
                    no_rathol: true,
                },
                {
                    no_rathol_time_lower_range: 0.5
                },
                {
                    no_rathol_time_upper_range: 12
                },
                {
                    no_rathol_time: 0.5
                },
                {
                    muck_loosing_hand: true
                },
                {
                    record_privacy: true
                },
                {
                    mute_viewer: true
                },
                {
                    table_time: 0.5
                }
            ];
            fields.ring_type_id = parseInt(game_type_id);
            fields.sng_fields = [
                {
                    room_name: ""
                },
                {
                    maximum_player: 3
                },
                {
                    action_time: 10
                },
                {
                    exclusive_table: true
                },
                {
                    password: ""
                },
                {
                    buy_in: 0
                },
                {
                    starting_chips_min: 100
                },
                {
                    starting_chips_max: 5000
                },
                {
                    blinds_up_min: 3
                },
                {
                    blinds_up_max: 10
                },
                {
                    blind_structure: 'Standard'
                },
                {
                    prize_structure: 'Standard'
                },
                {
                    auto_open: true
                },
                {
                    authorized_to_register: 10
                },
                {
                    gps_restriction: false
                },
                {
                    ip_restriction: true
                },
                {
                    ban_chatting: true
                },
                {
                    mute_viewer: false
                },
                {
                    region_restriction: true
                },
                {
                    muck_loosing_hand: true
                },
                {
                    time_bank: true
                },
                {
                    time_bank_timer: 30
                },
                {
                    time_bank_cards: 3
                },
                {
                    time_bank_max_cards: 3
                }
            ];
            fields.sng_type_id = sng_type_id['game_type_id'];
            fields.spinup_fields = [
                {
                    room_name: ""
                },
                {
                    maximum_player: 3
                },
                {
                    action_time: 10
                },
                {
                    exclusive_table: true
                },
                {
                    password: ""
                },
                {
                    buy_in: 0
                },
                {
                    starting_chips_min: 100
                },
                {
                    starting_chips_max: 5000
                },
                {
                    blinds_up_min: 3
                },
                {
                    blinds_up_max: 10
                },
                {
                    max_multiplier: 100
                },
                {
                    blind_structure: 'Standard'
                },
                {
                    auto_open: true
                },
                {
                    authorized_to_register: true
                },
                {
                    gps_restriction: false
                },
                {
                    ip_restriction: true
                },
                {
                    ban_chatting: false
                }
            ];
            fields.spinup_type_id = spinup_type_id['game_type_id'];
            fields.mtt_setellite_fields = [
                {
                    room_name: ""
                },
                {
                    maximum_player: 3
                },
                {
                    action_time: 10
                },
                {
                    exclusive_table: true
                },
                {
                    password: ""
                },
                {
                    buy_in: 0
                },
                {
                    rebuy_in: 0
                },
                {
                    add_on: 0
                },
                {
                    rebuy_time: 2
                },
                {
                    rebuy_multiplier: 1.0
                },
                {
                    add_on_value: true
                },
                {
                    rebuy_period: true
                },
                {
                    until_level: 0
                },
                {
                    rebuy_period_level: 0
                },
                {
                    ko_bounty: true
                },
                {
                    ko_bounty_value: "Mystrery"
                },
                {
                    bounty_buy_in_value: "1/4"
                },
                {
                    early_bird: true
                },
                {
                    prize_pool: "Top Heavy",
                },
                {
                    gtd_prize_pool: true
                },
                {
                    start_time: ""
                },
                {
                    blind_structure: "Standard"
                },
                {
                    auto_start: true
                },
                {
                    no_of_playres: 2
                },
                {
                    starting_chips_min: 10
                },
                {
                    starting_chips_max: 5000
                },
                {
                    blinds_up_min: 10
                },
                {
                    blinds_up_max: 5000
                },
                {
                    later_registration_min: 10
                },
                {
                    later_registration_max: 5000
                },
                {
                    min_player: 0
                },
                {
                    max_player: 10
                },
                {
                    disable_ante: false
                },
                {
                    authorized_to_register: true
                },
                {
                    ban_chatting: false
                },
                {
                    mute_viewer: false
                },
                {
                    time_bank: true
                },
                {
                    muck_loosing_hand: true
                },
                {
                    break: true
                },
                {
                    break_min: 0
                },
                {
                    break_max: 30
                },
                {
                    set_start_time: ""
                },
                {
                    entry_ticket: ""
                }
            ];
            fields.mtt_setellite_type_id = mtt_setellite_type_id['game_type_id'];
            fields.mtt_regulaar_fields = [
                {
                    room_name: ""
                },
                {
                    maximum_player: 3
                },
                {
                    action_time: 10
                },
                {
                    exclusive_table: true
                },
                {
                    password: ""
                },
                {
                    buy_in: 0
                },
                {
                    rebuy_in: 0
                },
                {
                    add_on: 0
                },
                {
                    rebuy_time: 2
                },
                {
                    rebuy_multiplier: 1.0
                },
                {
                    add_on_value: true
                },
                {
                    re_entry_limit: 3
                },
                {
                    set_different_buy_in: true
                },
                {
                    first_re_entry_limit: 100
                },
                {
                    first_prize: 90
                },
                {
                    first_fee: 10
                },
                {
                    second_re_entry_limit: 100
                },
                {
                    second_prize: 90
                },
                {
                    second_fee: 10
                },
                {
                    third_re_entry_limit: 100
                },
                {
                    third_prize: 90
                },
                {
                    third_fee: 10
                },
                {
                    rebuy_period: true
                },
                {
                    until_level: 0
                },
                {
                    rebuy_period_level: 0
                },
                {
                    ko_bounty: true
                },
                {
                    ko_bounty_value: "Mystrery"
                },
                {
                    bounty_buy_in_value: "1/4"
                },
                {
                    early_bird: true
                },
                {
                    prize_pool: "Top Heavy",
                },
                {
                    gtd_prize_pool: true
                },
                {
                    start_time: ""
                },
                {
                    blind_structure: "Standard"
                },
                {
                    auto_start: true
                },
                {
                    no_of_playres: 2
                },
                {
                    starting_chips_min: 10
                },
                {
                    starting_chips_max: 5000
                },
                {
                    blinds_up_min: 10
                },
                {
                    blinds_up_max: 5000
                },
                {
                    later_registration_min: 10
                },
                {
                    later_registration_max: 5000
                },
                {
                    min_player: 0
                },
                {
                    max_player: 10
                },
                {
                    disable_ante: false
                },
                {
                    authorized_to_register: true
                },
                {
                    ban_chatting: false
                },
                {
                    mute_viewer: false
                },
                {
                    time_bank: true
                },
                {
                    muck_loosing_hand: true
                },
                {
                    break: true
                },
                {
                    break_min: 0
                },
                {
                    break_max: 30
                },
                {
                    set_start_time: ""
                },
                {
                    entry_ticket: ""
                }

            ];
            fields.mtt_regular_type_id = mtt_regular_type_id['game_type_id'];
        }
        responseData.msg = 'Get Form Fields';
        responseData.data = fields;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const addClubChips = async (req, res) => {
    let responseData = {};
    try {
        const {clubId, chipsData} = req.body;
        let getData = await ClubService.getClubByClubId({where:{clubId: clubId}, raw:true});
        if (!getData) {
            responseData.msg = 'No Club Found With This Address';
            return responseHelper.success(res, responseData, 201);
        }

        let ownerClubChips = await ClubService.getJoinClubByClubId({
            where: {
                clubId: clubId,
                user_id: getData.club_adminId
            }
        })
        let sum = 0
        for(let i=0;i<chipsData.length;i++){
            sum += parseFloat(chipsData[i].amount)
        }
        console.log(sum);
        if (parseFloat(ownerClubChips.amount) <= parseFloat(sum)) {
            responseData.msg = 'Insufficient amount';
            return responseHelper.success(res, responseData, 201);
        }

        chipsData.map(async(ele) => {
            let userId = ele.userId;
            let amount = ele.amount;
            let userClubChips = await ClubService.getJoinClubByClubId({where: {clubId: clubId, user_id: userId}, raw:true})
            if(userClubChips){
                let clubChipsObj = {
                    chips: parseFloat(userClubChips.chips) + parseFloat(amount)
                }
                await ClubService.updateJoinClub(clubChipsObj, {where: {registeration_Id: userClubChips.registeration_Id}})
                let chipsObj = {
                    club_id: clubId,
                    user_id: userId,
                    amount: amount,
                    is_club_admin: false,
                    type: 'CR'
                }
                await ClubService.createClubTradeHistory(chipsObj)

                /*Owner Chips Update*/
                let ownerClubChipsObj = {
                    amount: parseFloat(ownerClubChips.amount) - parseFloat(amount)
                }
                await ClubService.updateJoinClub(ownerClubChipsObj, {where: {registeration_Id: ownerClubChips.registeration_Id}})

                let ownerChipsObj = {
                    club_id: clubId,
                    user_id: getData.club_adminId,
                    amount: parseFloat(amount),
                    is_club_admin: true,
                    type: 'DR'
                }
                await ClubService.createClubTradeHistory(ownerChipsObj)

                let notificationObject = {
                    sender_user_id: req.user.user_id,
                    receiver_user_id: userId,
                    message: 'Received '+amount+' chips from ' + getData.club_name + '!!!',
                    status: 'Chips Received'
                }
                await sendNotification(notificationObject)
            }
        })

        responseData.msg = 'Chips added done';
        responseData.data = {};
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const claimClubChips = async (req, res) => {
    let responseData = {};
    try {
        const {clubId, chipsData} = req.body;
        let getData = await ClubService.getClubByClubId({where:{clubId: clubId}, raw:true});
        if (!getData) {
            responseData.msg = 'No Club Found With This Address';
            return responseHelper.success(res, responseData, 201);
        }
        chipsData.map(async(ele) => {
            let userId = ele.userId;
            let amount = ele.amount;
            let userClubChips = await ClubService.getJoinClubByClubId({where: {clubId: clubId, user_id: userId}})
            if (userClubChips && parseFloat(userClubChips.chips) >= parseFloat(amount)) {
                let clubChipsObj = {
                    chips: parseFloat(userClubChips.chips) - parseFloat(amount)
                }
                await ClubService.updateJoinClub(clubChipsObj, {where: {registeration_Id: userClubChips.registeration_Id}})
                let chipsObj = {
                    club_id: clubId,
                    user_id: userId,
                    amount: amount,
                    is_club_admin: false,
                    type: 'DR'
                }
                await ClubService.createClubTradeHistory(chipsObj)

                /*Owner Chips Update*/
                let ownerClubChips = await ClubService.getJoinClubByClubId({
                    where: {
                        clubId: clubId,
                        user_id: getData.club_adminId
                    }
                })
                let ownerClubChipsObj = {
                    amount: parseFloat(ownerClubChips.amount) + parseFloat(amount)
                }
                await ClubService.updateJoinClub(ownerClubChipsObj, {where: {registeration_Id: ownerClubChips.registeration_Id}})

                let ownerChipsObj = {
                    club_id: clubId,
                    user_id: getData.club_adminId,
                    amount: parseFloat(amount),
                    is_club_admin: true,
                    type: 'CR'
                }
                await ClubService.createClubTradeHistory(ownerChipsObj)
                let notificationObject = {
                    sender_user_id: req.user.user_id,
                    receiver_user_id: userId,
                    message: getData.club_name+' Claimed '+amount+' chips',
                    status: 'Chips Claimed'
                }
                await sendNotification(notificationObject)
            }
        })
        responseData.msg = 'Chips claim done';
        responseData.data = {};
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
// To create a club table or club template
const createClubTable = async (req, res) => {
    let is_template = req.params.is_template;
    let responseData = {};
    try {
        let {game_category_id, game_type_id, game_json_data, club_id,is_template} = req.body;
        game_json_data["is_table_started_by_owner"] = false ;
        let data = {
            game_category_id: game_category_id,
            game_type_id: game_type_id,
            game_name: "",
            game_json_data: JSON.stringify(game_json_data),
            added_by: req.user.user_id,
            club_id: club_id,
            is_club_template:is_template,
            game_blind_id: game_json_data.game_blind_id ? parseInt(game_json_data.game_blind_id) : null,
            game_prize_id: game_json_data.game_prize_id ? parseInt(game_json_data.game_prize_id) : null,
        }
        let game_type = await adminService.getGameTypeByQuery({game_type_id: game_type_id});
        if (game_type && game_type.club_type == 2) {
            data.is_single_table = true;
        }
        if (game_type && (game_type.club_type == 4 || game_type.club_type == 5)) {
            data.is_tournament = true;
        }
        if (is_template == 1) data.is_club_template = is_template;
        let save = await adminService.createGame(data);
        responseData.msg = 'TABLE CREATED';
        await (await getRedisClient()).del("CLUBROOM"+club_id);
        return responseHelper.success(res, responseData);
    } catch (error) {
        console.log(error);
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const getClubTradeHistory = async (req, res) => {
    let responseData = {};
    try {
        let clubId = req.query.clubId;
        let userId = req.user.user_id;
        let results = await ClubService.getUserClubAllTradeHistory({
            where: {
                user_id: userId,
                club_id: clubId,
                is_club_admin: true
            }
        });
        if (results.length == 0) {
            responseData.msg = 'No history found';
            return responseHelper.success(res, responseData, 201);
        }
        responseData.msg = 'Trade History';
        responseData.data = results;
        return responseHelper.success(res, responseData);

    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const getClubTradeDetails = async (req, res) => {
    let responseData = {};
    try {
        const clubId = req.query.clubId;
        const userId = req.user.user_id;
        let getData = await ClubService.getClubByClubId({where:{clubId: clubId}, raw:true});
        if (!getData) {
            responseData.msg = 'No Club Found With This Address';
            return responseHelper.success(res, responseData, 201);
        }

        let getOwnerData = await ClubService.getJoinClubByClubId({where:{clubId: clubId, user_id: userId}, raw:true});
        let memberChips = await ClubService.getClubByUserId({where:{clubId: clubId}, raw:true});
        let memChips = 0;
        if (memberChips.length > 0) {
            for (let i = 0; i < memberChips.length; i++) {
                memChips += parseFloat(memberChips[i].chips);
            }
        }
        let result = {
            owner_total: getOwnerData.amount,
            owner_chips: getOwnerData.chips,
            member_chips: memChips,
        }

        responseData.msg = 'Trade Details';
        responseData.data = result;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const searchMember = async (req, res) => {
    let responseData = {};
    try {
        let search_key = req.query.search_key;
        let clubId = req.query.clubId;
        let results = await sequelize.query(`Select users.username, club_registered_users.registeration_Id, 
       club_registered_users.clubId, 
       club_registered_users.user_id, 
       club_registered_users.is_club_admin, club_registered_users.chips,  club_registered_users.amount,  club_registered_users.createdAt,  club_registered_users.updatedAt, club_registered_users.is_approve
                                             from club_registered_users
                                                      join users on club_registered_users.user_id = users.user_id
                                             where users.username like '%${search_key}%'
                                               AND club_registered_users.clubId = '${clubId}'`, {type: sequelize.QueryTypes.SELECT});
        responseData.msg = 'Search Members';
        responseData.data = results;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const filterMember = async (req, res) => {
    let responseData = {};
    try {
        let clubId = req.query.clubId
        let type = req.query.type;
        let subType = req.query.sub_type;
        let result;
        if (type == 1) {
            result = await sequelize.query(`Select users.username, club_registered_users.registeration_Id,
                                                   club_registered_users.clubId,
                                                   club_registered_users.user_id,
                                                   club_registered_users.is_club_admin,club_registered_users.chips,  club_registered_users.amount,  club_registered_users.createdAt,  club_registered_users.updatedAt, club_registered_users.is_approve
                                            from club_registered_users
                                                     join users on club_registered_users.user_id = users.user_id
                                            where club_registered_users.clubId = '${clubId}'
                                            ORDER BY club_registered_users.createdAt ${subType}`, {type: sequelize.QueryTypes.SELECT});
        } else if (type == 2) {
            result = await sequelize.query(`Select users.username, club_registered_users.registeration_Id,
                                                   club_registered_users.clubId,
                                                   club_registered_users.user_id,
                                                   club_registered_users.is_club_admin,club_registered_users.chips,  club_registered_users.amount,  club_registered_users.createdAt,  club_registered_users.updatedAt, club_registered_users.is_approve
                                            from club_registered_users
                                                     join users on club_registered_users.user_id = users.user_id
                                            where club_registered_users.clubId = '${clubId}'
                                            ORDER BY club_registered_users.chips ${subType}`, {type: sequelize.QueryTypes.SELECT});
        } else if (type == 3) {

        } else if (type == 4) {

        }

        responseData.msg = 'Search Members';
        responseData.data = result;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const templateList = async (req, res) => {
    let responseData = {};
    try {
        let clubId = req.query.clubId;
        let userId = req.user.user_id;
        let getData = await ClubService.getAllGameList({
            club_id: clubId,
            is_club_template: 1,
            added_by: userId,
            game_status: {[Op.ne]: '3'}
        });
        if (getData.length == 0) {
            responseData.msg = 'Template List not found';
            return responseHelper.error(res, responseData, 201);
        }
        getData = getData.map(async (element, i) => {
            let str = JSON.parse(element.game_json_data, true);
            element.dataValues.game_json_data = str;
            return element;
        })
        getData = await Promise.all(getData);
        responseData.msg = 'Template List';
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const templateDetail = async (req, res) => {
    let responseData = {};
    try {
        let gameId = req.params.id;
        let getData = await ClubService.getGameByQuery({game_id: gameId});
        if (!getData) {
            responseData.msg = 'Template not found';
            return responseHelper.error(res, responseData, 201);
        }
        let str = getData.game_json_data;
        getData.game_json_data = JSON.parse(str, true);
        responseData.msg = 'Template Detail';
        responseData.data = getData;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const updateTemplate = async (req, res) => {
    let responseData = {};
    try {
        let {game_id, game_category_id, game_type_id, game_json_data, is_template} = req.body;
        let data = {
            game_category_id: game_category_id,
            game_type_id: game_type_id,
            game_name: "",
            game_json_data: JSON.stringify(game_json_data),
            updated_by: req.user.admin_id
        }
        let getData = await ClubService.getGameByQuery({game_id: game_id});
        if (!getData) {
            responseData.msg = 'Template not found';
            return responseHelper.error(res, responseData, 201);
        }
        if (is_template == 0) data.is_club_template = is_template;
        let updateData = await ClubService.updateGameById(data, {game_id: game_id});
        responseData.msg = 'Template Update Successfully';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const deleteTemplate = async (req, res) => {
    let responseData = {};
    try {
        let id = req.params.id;
        let getData = await ClubService.getGameByQuery({game_id: id});
        if (!getData) {
            responseData.msg = 'Template not found';
            return responseHelper.error(res, responseData, 201);
        }
        let data = {
            game_status: '3'
        }
        await ClubService.updateGameById(data, {game_id: id});
        responseData.msg = 'Template deleted Successfully';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}
const getClubDetails = async (clubDataRequest) => {
    let responseData = {};
    try {
        let getData = await ClubService.getClubByClubId({where:{clubId: clubDataRequest.clubId}, raw:true});
        if (!getData) {
            throw new Error("Details not found");
        }

        return {
            status: true,
            message: "Club details",
            clubId: getData.clubId,
            clubOwnerId: getData.club_adminId,
            clubUniqueId: getData.club_unique_id
        }
    } catch (error) {
        return {
            status: false,
            message: error.message
        }
    }
}
const getAllCLubsDetails = async (clubDataRequest) =>{
    try {
        let getData = await ClubService.getAllClubs({});
        if (!getData) {
            throw new Error("Details not found");
        }
        let clubs = [];
        getData.map((e)=>{
         
             let a = {
                status: true,
                message: "Club details",
                clubId: e.clubId,
                clubOwnerId: e.club_adminId,
                clubUniqueId: e.club_unique_id
            };
           clubs.push(a);
        })
        //  res.json({message:'Success', data:response})
        return {clubs};
    } catch (error) {
        return {
            status: false,
            message: error.message
        }
    }
}
const getClubgames = async (req, res) => {
    let club_id = req.query.club_id
    let responseData = {};
    try {
       let game_category = await pokerService.getGameCategoryByQuery({
          type: "poker"
       });
       console.log({
           game_category_id: game_category.game_category_id,
           game_status: {[Op.or]: ['1','2']},
           club_id,
           is_club_template:0
       });
       let games = await ClubService.getClubGamesByQuery({
          game_category_id: game_category.game_category_id,
          game_status: {[Op.or]: ['1','2']},
          club_id,
          is_club_template:0
       });
       let game_type_by_id = {};
       games = games.map(async (game) => {
          if (game_type_by_id[game.game_type_id]) {
             game.game_type = game_type_by_id[game.game_type_id];
          } else {
             let game_type = await pokerService.getGameTypeModalDataByQuery({game_type_id: game.game_type_id});
             game_type_by_id[game.game_type_id] = game_type;
             game.game_type = game_type;
          }
          game.game_json_data = JSON.parse(game.game_json_data);
          let game_tables = await pokerService.getGameTableModalDataByQuery({
             game_id: game.game_id,
             game_table_status: "Active"
          });
          if (game.game_blind_id) {
             let game_blind_structure = await pokerService.getOneBlindStructureModalDataByQuery({
                blind_id: game.game_blind_id
             });
             if (game_blind_structure) {
                game_blind_structure = game_blind_structure.blind_structure_json_data;
             }
             game.game_blind_structure_json_data = JSON.parse(game_blind_structure);
          }
          if (game.game_prize_id) {
             let game_price_structure = await pokerService.getOnePriceStructureModalDataByQuery({
                price_id: game.game_prize_id
             });
             if (game_price_structure) {
                game_price_structure = game_price_structure.price_structure_json_data;
             }
             game.game_price_json_data = JSON.parse(game_price_structure);
          }
          let totalPlayers = 0;
          // to get count of total player of a particular room 
          for (const game_table of game_tables) {
             let tableRoundData = await pokerService.getTableRoundByQuery({
                game_table_id: game_table.game_table_id,
                table_round_status: "Active"
             });
             if (tableRoundData) {
                let table_attributes = JSON.parse(tableRoundData.table_attributes);
                totalPlayers += table_attributes.players.length;
             }
          }
          game.totalPlayers = totalPlayers;
          return game;
       });
       games = await Promise.all(games);
       responseData.msg = 'Game List';
       responseData.data = games;
       return responseHelper.success(res, responseData);
    } catch (error) {
       console.log("Error in get games ", error);
       responseData.msg = error.message;
       return responseHelper.error(res, responseData, 500);
    }
 }

const createAgent = async (req, res) => {
    let responseData = {};
    try {
        let {club_id, name, email, mobile, chips} = req.body;
        mobile = await encryptData(mobile);
        let checkMobile = await userService.getUserDetailsByQuery({mobile: mobile, is_mobile_verified: 1});

        if (checkMobile.length) {
            responseData.msg = 'Mobile number already registered';
            return responseHelper.error(res, responseData, 201);
        }
        email = await encryptData(email);
        let query1 = {email: email}
        let checkEmail = await userService.getUserDetailsById(query1);
        if (checkEmail) {
            responseData.msg = 'Email is already registered';
            return responseHelper.error(res, responseData, 201);
        }
        let reqObj = {
            mobile: mobile,
            ip: '',
            full_name: name,
            username: makeString(5).toUpperCase(),
            device_type: 'Android',
            email: email,
            is_mobile_verified: 1,
            user_status: '1',
            is_agent: '1',
            referral_code: makeString(6).toUpperCase()
        };
        let newUser = await userService.createUser(reqObj);

        let joinClubData = await ClubService.joinClub({
            clubId: club_id,
            is_club_admin: true,
            user_id: newUser.user_id,
            amount: 0,
            chips: chips,
            is_approve: '1'
        })

        let clubAgent = {
            club_id: club_id,
            agent_id: newUser.user_id
        }
        await ClubService.createClubAgent(clubAgent);
        responseData.msg = 'Agent created successfully';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const agentList = async (req, res) => {
    let responseData = {};
    try {
        let clubId = req.query.club_id;
        let result = await ClubService.getAgentList({club_id: clubId});
        result = result.map(async (element) => {
            let agentD = await userService.getUserDetailsById({user_id: element.agent_id});
            element.agent_name = agentD.full_name,
            element.email = (agentD.email) ? await decryptData(agentD.email) : '',
            element.mobile = await decryptData(agentD.mobile)
        })
        result = await Promise.all(result);
        responseData.msg = 'Agent list';
        responseData.data = result;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const deleteAgent = async (req, res) => {
    let responseData = {};
    try{
        let agentId = req.query.agent_id;
        await userService.updateUserByQuery({user_status:'2'},{user_id:agentId})
        responseData.msg = 'Agent deleted';
        return responseHelper.success(res, responseData);
    }catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const deleteMember = async (req, res) => {
    let responseData = {};
    try{
        let memberId = req.query.member_id;
        let clubId = req.query.club_id;
        await ClubService.deleteMember({where:{user_id:memberId, clubId:clubId}})
        responseData.msg = 'Member deleted';
        return responseHelper.success(res, responseData);
    }catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const agentDetail = async (req, res) => {
    let responseData = {};
    try{
        let agentId = req.query.agent_id;
        let type = req.query.type;
        let result = {
            total_fee: 0,
            last_week: 0,
            this_week: 0,
            spinup_buy_in:0,
            fee:0
        }

        responseData.msg = 'Agent details';
        responseData.data = result;
        return responseHelper.success(res, responseData);
    }catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const memberDetails = async (req, res) => {
    let responseData = {};
    try{
        let memberId = req.query.member_id;
        let type = req.query.type;
        let memberD = await userService.getUserDetailsById({user_id: memberId});
        if(type==1){

        }else if(type==2){

        }else{

        }
        let result = {
            username: memberD.username,
            profile_pic: memberD.profile_pic,
            winning: 0,
            hands: 0,
            bb_100: 0,
            mtt_winnings: 0,
            spinup_buy_in:0,
            fee:0
        }

        responseData.msg = 'Member details';
        responseData.data = result;
        return responseHelper.success(res, responseData);
    }catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}

const memberListByAgent = async (req, res) => {
    let responseData = {};
    try {
        const memberId = req.query.member_id;
        let getData = await ClubService.getJoinClubByClubId({user_id: memberId});
        if (!getData) {
            responseData.msg = 'No Club Found With This Address';
            return responseHelper.success(res, responseData, 201);
        }
        let result = await ClubService.getMemberList({where: {is_approve: '1', clubId: getData.clubId}});
        if (result.length == 0) {
            responseData.msg = 'No Member found';
            return responseHelper.success(res, responseData, 201);
        }

        result = result.map(async (element) => {
            let getUserDetail = await adminService.getUserDetailsById({user_id: element.user_id})
            element.username = (getUserDetail) ? getUserDetail.username : '';
            return element;
        })
        result = await Promise.all(result);
        responseData.msg = 'Member list';
        responseData.data = result;
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const getAllClubLevel = async (req, res) => {
    let responseData = {};
    try{
        let check = await adminService.getAllClubLevel({})
        if(check.length==0){
            responseData.msg = 'Data not found';
            return responseHelper.error(res, responseData, 201);
        }
        responseData.msg = 'Club Level list';
        responseData.data = check;
        return responseHelper.success(res, responseData);
    }catch(error){
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
}

const deleteClub = async (req, res) => {
    let responseData = {};
    try{
        let clubId = req.query.club_id;
        await ClubService.deleteClubRegisterData({where:{clubId:clubId}})
        await ClubService.deleteClubTradeData({where:{club_id:clubId}})
        await ClubService.deleteClubData({where:{clubId:clubId}})
        responseData.msg = 'Club deleted';
        return responseHelper.success(res, responseData);
    }catch (error) {
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500);
    }
}
// in table rounds table  tableAttributes.players.stack is denoting userstack amount before starting that round 
const getHandHistoryByTableId = async (req, res) => {
    let responseData = {};
    try {
       let user_id = req.user.user_id;
       let table_id = req.params.table_id;
       let page = req.query.page || 1;
       let tableRoundData = await pokerService.getTableRoundByQueryWithOrderAndLimit({
          game_table_id: table_id,
          table_round_status: "Completed"
       }, [["table_round_id", "DESC"]], 1, (page - 1));
       if (!tableRoundData || tableRoundData.length === 0) {
          throw new Error("Table not found");
       }
       let totalTableRounds = await pokerService.countTableRoundByQuery({
          game_table_id: table_id,
          table_round_status: "Completed"
       });
       let tableRound = tableRoundData[0];
       tableRound.table_attributes = JSON.parse(tableRound.table_attributes);
       tableRound.hand_histories = JSON.parse(tableRound.hand_histories);
       let bettingPlayersIds = new Set(); // in set we are putting betting players Id's
       tableRound.hand_histories.forEach(handHistory => {
          if (handHistory && handHistory.userBetRecords) {
             handHistory.userBetRecords.forEach(userBetRecord => {
                if (userBetRecord && userBetRecord.userId) {
                   bettingPlayersIds.add("" + userBetRecord.userId);
                }
             });
          }
       });
 
       const getUserTotalBets = (userId)=>{
          let bet = 0;
          tableRound.hand_histories.forEach(handHistory => {
             if (handHistory && handHistory.userBetRecords) {
                handHistory.userBetRecords.forEach(userBetRecord => {
                   if (userBetRecord && userBetRecord.userId && userBetRecord.userId == userId) {
                      bet+=parseInt(userBetRecord.betAmount)
                   }
                });
             }
          });
          return bet;
       }
       tableRound.table_attributes.players = tableRound.table_attributes.players.map(player => {
          if (!player) {
             return null;
          }
          if (!bettingPlayersIds.has("" + player.userId)) {
             return null;
          }
          return player;
       }).filter(player => player);
       tableRound.result_json = JSON.parse(tableRound.result_json);
       let winnerSet = new Set();
       tableRound.result_json.winners.forEach(winner => {
          winnerSet.add("" + winner);
       })
       tableRound.result_json.players = tableRound.result_json.players.map(player => {
          if (player && (!player.cards || player.cards.length === 0)
              && !bettingPlayersIds.has("" + player.userId)) {
             return null;
          }
          if (player && player.isMuckEnabled && player.isMuckEnabled === true
              && parseInt(player.userId) !== user_id && !winnerSet.has("" + player.userId)) {
             if (player.cards) {
                player.cards = player.cards.map(card => {
                   card.cardRank = "X";
                   card.cardSuit = "X";
                   return card;
                });
             }
          }
          let playerFromTableRound = tableRound.table_attributes.players
              .find(tablePlayer => tablePlayer.userId === player.userId);
          if (playerFromTableRound) {
             player.chips = (winnerSet.has(""+player.userId))?getUserTotalBets(player.userId): 0 - getUserTotalBets(player.userId); // initially it was player.chips - playerFromTableRound.stack;
             return player;
          }
          return null;
       }).filter(player => player);
       let potTotal = parseInt("" + 0);
       tableRound.result_json.pots.forEach(pot => {
          potTotal += parseInt(pot.amount);
       });
       tableRound.potTotal = potTotal;
       responseData.msg = 'hand history';
       responseData.data = {
          page: totalTableRounds - (page - 1),
          count: totalTableRounds,
          currentPage: page,
          ...tableRound
       };
       return responseHelper.success(res, responseData);
    } catch (error) {
       console.log("Error in get hand history by table id ", error);
       responseData.msg = error.message;
       return responseHelper.error(res, responseData, 500);
    }
 }
const getHandHistoryByTableRoundId=async(req,res)=>{
    let responseData={};
    try {
        let user_id = req.query.user_id;
        let table_round_id = req.params.table_round_id;
        let page = req.query.page || 1;
        let tableRoundData = await pokerService.getTableRoundByQueryWithOrderAndLimit({
            table_round_id:table_round_id ,
           table_round_status: "Completed"
        }, [["table_round_id", "DESC"]], 1, (page - 1));
        if (!tableRoundData || tableRoundData.length === 0) {
           throw new Error("Table round not found");
        }
        let totalTableRounds = await pokerService.countTableRoundByQuery({
            table_round_id: table_round_id,
           table_round_status: "Completed"
        });
        let tableRound = tableRoundData[0];
        tableRound.table_attributes = JSON.parse(tableRound.table_attributes);
        tableRound.hand_histories = JSON.parse(tableRound.hand_histories);
        let bettingPlayersIds = new Set(); // in set we are putting betting players Id's
        tableRound.hand_histories.forEach(handHistory => {
           if (handHistory && handHistory.userBetRecords) {
              handHistory.userBetRecords.forEach(userBetRecord => {
                 if (userBetRecord && userBetRecord.userId) {
                    bettingPlayersIds.add("" + userBetRecord.userId);
                 }
              });
           }
        });
  
        const getUserTotalBets = (userId)=>{
           let bet = 0;
           tableRound.hand_histories.forEach(handHistory => {
              if (handHistory && handHistory.userBetRecords) {
                 handHistory.userBetRecords.forEach(userBetRecord => {
                    if (userBetRecord && userBetRecord.userId && userBetRecord.userId == userId) {
                       bet+=parseInt(userBetRecord.betAmount)
                    }
                 });
              }
           });
           return bet;
        }
        tableRound.table_attributes.players = tableRound.table_attributes.players.map(player => {
           if (!player) {
              return null;
           }
           if (!bettingPlayersIds.has("" + player.userId)) {
              return null;
           }
           return player;
        }).filter(player => player);
        tableRound.result_json = JSON.parse(tableRound.result_json);
        let winnerSet = new Set();
        tableRound.result_json.winners.forEach(winner => {
           winnerSet.add("" + winner);
        })
        tableRound.result_json.players = tableRound.result_json.players.map(player => {
           if (player && (!player.cards || player.cards.length === 0)
               && !bettingPlayersIds.has("" + player.userId)) {
              return null;
           }
           if (player && player.isMuckEnabled && player.isMuckEnabled === true
               && parseInt(player.userId) !== user_id && !winnerSet.has("" + player.userId)) {
              if (player.cards) {
                 player.cards = player.cards.map(card => {
                    card.cardRank = "X";
                    card.cardSuit = "X";
                    return card;
                 });
              }
           }
           let playerFromTableRound = tableRound.table_attributes.players
               .find(tablePlayer => tablePlayer.userId === player.userId);
           if (playerFromTableRound) {
              player.chips = (winnerSet.has(""+player.userId))?getUserTotalBets(player.userId): 0 - getUserTotalBets(player.userId); // initially it was player.chips - playerFromTableRound.stack;
              return player;
           }
           return null;
        }).filter(player => player);
        let potTotal = parseInt("" + 0);
        tableRound.result_json.pots.forEach(pot => {
           potTotal += parseInt(pot.amount);
        });
        tableRound.potTotal = potTotal;
        responseData.msg = 'hand history';
        responseData.data = {
           page: totalTableRounds - (page - 1),
           count: totalTableRounds,
           currentPage: page,
           ...tableRound
        };
        return responseHelper.success(res, responseData);
     }catch (error) {
        console.log("Error in get hand history by table id ", error);
        responseData.msg = error.message
        return responseHelper.error(res, responseData, 500); 
    }
}

 const getClubGameResultByTableId = async (req, res) => {
    let responseData = {};
    try {
       let table_id = req.params.table_id;
       let user = req.user;
       let game_type = await db.game_type.findOne({
          where: {}
       });
       let gameType = await db.game_type.findOne({
          where: {
             game_type_id: {
                [Op.in]: sequelize.literal(
                    `(SELECT game_type_id FROM games INNER JOIN game_tables 
                        ON games.game_id = game_tables.game_id WHERE game_tables.game_table_id = ${table_id})`
                ),
             },
          },
          raw: true,
       });
       if (!gameType) {
          throw new Error("Game type not found");
       }
       let tableRoundData = await pokerService.getTableRoundByQuery({
          game_table_id: table_id,
          table_round_status: "Active"
       });
       let table_attributes = JSON.parse(tableRoundData.table_attributes);
       let players = table_attributes.players.map(player => {
          return player.userId
       });
       let lockedBalanceHistories = await userService.getLockedBalanceHistory({
          user_id: players,
          table_id: table_id,
          status: "unsettled"
       });
       console.log("lockedBalanceHistories",lockedBalanceHistories);
       let data = await lockedBalanceHistories.map(async lockedBalanceHistory => {
          let user = await userService
              .getUserDetailsById({user_id: lockedBalanceHistory.user_id});
          return {
             user_id: lockedBalanceHistory.user_id,
             buy_in: lockedBalanceHistory.buy_in_club_amount,
             winnings: lockedBalanceHistory.locked_club_amount
                 - lockedBalanceHistory.buy_in_club_amount,
             username: (gameType.name.startsWith("ANONYMOUS")) ? "XXXXX" : user.username,
          }
       });
       let result = await Promise.all(data);
       let userSessionStats = await pokerService.getPokerSessionStatsDataByQuery({
          user_id: user.user_id,
       });
       let sessionStats = {};
       if (userSessionStats) {
          let handsPlayed = userSessionStats.hands_played;
          sessionStats.flops_seen = (userSessionStats.flops_seen / handsPlayed) * 100;
          sessionStats.onSB = (userSessionStats.sb_count / handsPlayed) * 100;
          sessionStats.onBB = (userSessionStats.bb_count / handsPlayed) * 100;
          sessionStats.other = (handsPlayed - (userSessionStats.sb_count + userSessionStats.bb_count)) / handsPlayed * 100;
          sessionStats.handsWon = (userSessionStats.hands_won / handsPlayed) * 100;
          sessionStats.showDown = (userSessionStats.showdown_count / handsPlayed) * 100;
          sessionStats.noShowDown = ((userSessionStats.hands_won - userSessionStats.showdown_count)
              / handsPlayed) * 100;
       }
       responseData.msg = 'game result';
       responseData.data = {sessionStats, result};
       return responseHelper.success(res, responseData);
    } catch (error) {
       console.log("Error in get game result by table id ", error);
       responseData.msg = error.message;
       return responseHelper.error(res, responseData, 500);
    }
 }

 const clubData = async (req, res) => {
    let responseData = {};
    try {
        let club_id = req.params.club_id;
        let clubData = await ClubService.getLockedBalanceHistory({ club_id: club_id });

        // Calculate the total round count
        let totalRoundCount = clubData.reduce((total, item) => total + item.round_count, 0);
        console.log("totalRoundCount-->", totalRoundCount);

        responseData.msg = "Club data fetched successfully";
        responseData.data = {totalRoundCount};

        return responseHelper.success(res, responseData);
    } catch (error) {
        console.log("Error in getting table data ", error);
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};

const removalOfPlayer = async (req, res) => {
    let responseData = {};
    try {
        let memberId = req.query.member_id;
        let clubId = req.query.club_id;
        let adminId=req.user.user_id;
        console.log("adminId",adminId);



        // Fetch the player data
        let playerData = await ClubService.getClubByUserId({ where: { user_id: memberId, clubId: clubId }, raw: true });
        if (!playerData) {
            throw new Error('Player not found in the club');
        }
        const playerChips = playerData.Chips;

        // Fetch the club admin data
        let adminData = await ClubService.getClubByUserId({ where: { clubId: clubId, is_club_admin: '1' }, raw: true });
        if (!adminData) {
            throw new Error('Club admin not found');
        }
        const adminChips = adminData.amount;

        // Update the admin's chips
        await ClubService.updateMember({ amount: adminChips + playerChips }, { where: { user_id: adminData.user_id, clubId: clubId } });

        // Remove the player from the club
        await ClubService.deleteMember({ where: { user_id: memberId, clubId: clubId } });
        let getUserDetail = await adminService.getUserDetailsById({user_id: req.user.user_id})
let admin_name=req.user.username;
let player_name=getUserDetail.username;

let notificationObject = {
    sender_user_id: adminData.user_id,
    receiver_user_id: memberId,
    message: `${player_name} was removed by ${admin_name} and ${playerChips} chips were returned to the club.`,
    status: 'Player Removed'
};
await sendNotification(notificationObject);
        responseData.msg = 'Member removed and chips transferred to club admin';
        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};
// const handHistoryadmin=async(req,res)=>{
//     let responseData={}
//     try {
//         let userId = req.query.member_id;
//         let clubId = req.query.club_id;
//         console.log("abhay");
//         // const {clubId,userId}=req.body;

//         if(!clubId ||!userId){
//                 responseData.msg = 'clubId and userId both are required';
//                 return responseHelper.success(res, responseData, 201);
//         }
//         let clubData=await ClubService.getClubGamesByQuery({club_id:clubId})
//                 // Filter only the required fields from clubData
//                 let filteredClubData = clubData.map(game => {
//                     let gameJsonData = JSON.parse(game.game_json_data);
//                     return {
//                         game_id:game. game_id,
//                         club_id: game.club_id,
//                         room_name: gameJsonData.room_name,
//                         selected_small_blind: gameJsonData.selected_small_blind,
//                         selected_big_blind: gameJsonData.selected_big_blind
//                     };
//                 });
//                 game_id=filteredClubData.game_id;
//                 console.log("game_id",game_id);
//         let lockBalanceHistoryData=await ClubService.getLockedBalanceHistory({user_id:userId,club_id:clubId,game_id:game_id})
//         console.log("lockBalanceHistoryData-->",lockBalanceHistoryData);

//          responseData.msg = "hand history data fetched successfully";
         
//          responseData.data = {filteredClubData};
//         return responseHelper.success(res, responseData);
//     } catch (error) {
//         responseData.msg = error.message;
//         return responseHelper.error(res, responseData, 500);
//     }
// }

const handHistoryAdmin = async (req, res) => {
    let responseData = {};
    try {
        let userId = req.query.member_id;
        let clubId = req.query.club_id;
        console.log("abhay");

        if (!clubId || !userId) {
            responseData.msg = 'clubId and userId both are required';
            return responseHelper.success(res, responseData, 201);
        }

        let clubData = await ClubService.getClubGamesByQuery({ club_id: clubId });
        console.log("clubData-->", clubData);

        // Filter only the required fields from clubData
        let filteredClubData = await Promise.all(clubData.map(async (game) => {
            let gameJsonData = JSON.parse(game.game_json_data);
            
            // Fetch lock balance history data for the current game, user, and club
            let lockBalanceHistoryData = await ClubService.getLockedBalanceHistory({
                user_id: userId,
                club_id: clubId,
                game_id: game.game_id
            });

            // Calculate the total round count
            let totalRoundCount = lockBalanceHistoryData.reduce((total, record) => total + record.round_count, 0);

            // Find the latest updatedAt timestamp
            let latestUpdatedAt = lockBalanceHistoryData.reduce((latest, record) => {
                return new Date(record.updatedAt) > new Date(latest) ? record.updatedAt : latest;
            }, lockBalanceHistoryData[0]?.updatedAt || null);

            return {
                game_id: game.game_id,
                club_id: game.club_id,
                room_name: gameJsonData.room_name,
                selected_small_blind: gameJsonData.selected_small_blind,
                selected_big_blind: gameJsonData.selected_big_blind,
                hands: totalRoundCount,
                updatedAt: latestUpdatedAt
            };
        }));

        responseData.msg = "Hand history data fetched successfully";
        responseData.data = {filteredClubData};

        return responseHelper.success(res, responseData);
    } catch (error) {
        responseData.msg = error.message;
        return responseHelper.error(res, responseData, 500);
    }
};






module.exports = {
    createClub,
    updateClub,
    getClubByClubId,
    getJoindClubByUserId,
    sendClubJoinReq,
    getNotificationByUserId,
    changeStatusOfJoinedUsers,
    getMemberList,
    memberDetails,
    searchClub,
    readNotification,
    getGameType,
    addClubChips,
    claimClubChips,
    getClubFields,
    createClubTable,
    getClubTradeHistory,
    getClubTradeDetails,
    searchMember,
    filterMember,
    getClubDetails,
    templateList,
    templateDetail,
    updateTemplate,
    getClubgames,
    deleteTemplate,
    createAgent,
    agentList,
    agentDetail,
    deleteAgent,
    memberListByAgent,
    deleteMember,
    getAllCLubsDetails,
    getAllClubLevel,
    deleteClub,
    getHandHistoryByTableId,
    getHandHistoryByTableRoundId,
    getClubGameResultByTableId,
    clubData,
    removalOfPlayer,
    handHistoryAdmin
}