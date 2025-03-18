const pokerService = require('../services/pokerService');
const userService = require('../services/userService');
const responseHelper = require("../helpers/customResponse");
const { unlockBalanceOfUser, unlockBalanceOfUserForClub, addPrizeMoney } = require("./userController");
const Sequelize = require("sequelize");
const { getGameTypeModalDataByQuery ,saveTableCommission} = require("../services/pokerService");
const Op = Sequelize.Op;
const ChatModel = require("../models/chatMessage");
const db = require("../helpers/db");
const { sequelize } = require("../models");
const userController = require("./userController");
const { getRedisClient } = require("../helpers/redis");
const { updateMember, createTableCommisionRecord, getClubByUserId } = require("../services/clubService");
const { geAdminDetailsById, updateAdminByQuery } = require('../services/adminService');

const getPokerTableRoomData = async (tableRoomDataRequest) => {
   try {
      let gameModalData = await pokerService
         .getGameModalDataByQuery({ game_id: tableRoomDataRequest.roomId });
      if (!gameModalData) {
         throw new Error("Game table not found");
      }
      let gameTypeModalData = await pokerService.getGameTypeModalDataByQuery({
         game_type_id: gameModalData.game_type_id
      });
      let game_type_name = gameTypeModalData.name;
      let roomAttributes = gameModalData.game_json_data;
      let roomAttributesObj = JSON.parse(roomAttributes);
      let buyin;
      if (roomAttributesObj.minimum_buyin) {
         buyin = roomAttributesObj.minimum_buyin;
      } else {
         buyin = roomAttributesObj.maximum_buyin;
      }
      let game_blind_structure;
      console.log(" blind_id is ", gameModalData.game_blind_id, " game_prize_id is ", gameModalData.game_prize_id);
      if (roomAttributesObj.game_blind_id) {
         game_blind_structure = await pokerService.getOneBlindStructureModalDataByQuery({
            blind_id: roomAttributesObj.game_blind_id
         });
         if (game_blind_structure) {
            game_blind_structure = JSON.stringify(game_blind_structure.blind_structure_json_data);
         }
      }
      let game_price_structure;
      if (roomAttributesObj.game_prize_id) {
         game_price_structure = await pokerService.getOnePriceStructureModalDataByQuery({
            price_id: roomAttributesObj.game_prize_id
         });
         if (game_price_structure) {
            game_price_structure = JSON.stringify(game_price_structure.price_structure_json_data);
         }
      }
      console.log("prize str is ", game_price_structure, " blind str is ", game_blind_structure);
      let obj = {
         maximum_buyin: roomAttributesObj.maximum_buyin,
         buyIn: buyin,
         smallBlind: roomAttributesObj.small_blind,
         bigBlind: roomAttributesObj.big_blind,
         maxPlayers: game_type_name.toLowerCase().startsWith("tournament") ? roomAttributesObj.maximum_player_in_table
            : roomAttributesObj.maximum_player,
         minPlayers: roomAttributesObj.minimum_player,
         animation: roomAttributesObj.animation,
         fee: roomAttributesObj.commission === undefined ? 0 : roomAttributesObj.commission ?? 0,
         cap: roomAttributesObj.commission_cap === undefined ? 0 : roomAttributesObj.commission_cap,
         commission: roomAttributesObj.commission === undefined ? 0 : roomAttributesObj.commission,
         commission_cap: roomAttributesObj.commission_cap === undefined ? 0 : roomAttributesObj.commission_cap,
         turn_timmer: roomAttributesObj.turn_timmer,
         action_timer: roomAttributesObj.action_time == undefined ? 0 : roomAttributesObj.action_time,
         game_timmer: roomAttributesObj.game_timmer,
         prize_money: roomAttributesObj.prize_money === undefined ? 0 : roomAttributesObj.prize_money,
         default_stack: roomAttributesObj.default_stack === undefined ? 0 : roomAttributesObj.default_stack,
         game_blind_structure: game_blind_structure,
         game_prize_structure: game_price_structure,
         rebuy_in_until_level: roomAttributesObj.rebuy_in_until_level === undefined ? 0 : roomAttributesObj.rebuy_in_until_level,
         add_on_until_level: roomAttributesObj.add_on_until_level === undefined ? 0 : roomAttributesObj.add_on_until_level,
         room_name: roomAttributesObj.room_name,
         club_id: (gameModalData.club_id && gameModalData.club_id != 0) ? gameModalData.club_id : 0,
         private_table_code: (gameModalData.private_table_code && gameModalData.private_table_code != 0) ? gameModalData.private_table_code : 0,
         status: true,
         message: "Room data fetched successfully"
      }
      if (gameModalData.club_id && gameModalData.club_id != 0) return addRoomAttributes(obj, gameModalData, roomAttributesObj);
      return obj;
      // return {
      //    buyIn: buyin,
      //    smallBlind: roomAttributesObj.small_blind,
      //    bigBlind: roomAttributesObj.big_blind,
      //    maxPlayers: game_type_name.toLowerCase().startsWith("tournament") ? roomAttributesObj.maximum_player_in_table
      //        : roomAttributesObj.maximum_player,
      //    minPlayers: roomAttributesObj.minimum_player,
      //    animation: roomAttributesObj.animation,
      //    commission: roomAttributesObj.commission === undefined ? 0 : roomAttributesObj.commission,
      //    commission_cap: roomAttributesObj.commission_cap === undefined ? 0 : roomAttributesObj.commission_cap,
      //    turn_timmer: roomAttributesObj.turn_timmer,
      //    action_timer:roomAttributesObj.action_time==undefined? 0:roomAttributesObj.action_time,
      //    game_timmer: roomAttributesObj.game_timmer,
      //    prize_money: roomAttributesObj.prize_money === undefined ? 0 : roomAttributesObj.prize_money,
      //    default_stack: roomAttributesObj.default_stack === undefined ? 0 : roomAttributesObj.default_stack,
      //    game_blind_structure: game_blind_structure,
      //    game_prize_structure: game_price_structure,
      //    rebuy_in_until_level: roomAttributesObj.rebuy_in_until_level === undefined ? 0 : roomAttributesObj.rebuy_in_until_level,
      //    add_on_until_level: roomAttributesObj.add_on_until_level === undefined ? 0 : roomAttributesObj.add_on_until_level,
      //    room_name: roomAttributesObj.room_name,
      //    club_id :(gameModalData.club_id && gameModalData.club_id!=0) ? gameModalData.club_id:0,
      //    private_table_code :(gameModalData.private_table_code && gameModalData.private_table_code!=0)?gameModalData.private_table_code:0,
      //    status: true,
      //    message: "Room data fetched successfully",
      //    selected_small_blind: roomAttributesObj.selected_small_blind === undefined ? 0 : roomAttributesObj.selected_small_blind,
      //    selected_big_blind: roomAttributesObj.selected_big_blind === undefined ? 0 : roomAttributesObj.selected_big_blind,
      //    selected_maximum_player: roomAttributesObj.selected_maximum_player === undefined ? 0 : roomAttributesObj.selected_maximum_player,
      //    selected_buyin: roomAttributesObj.selected_buyin === undefined ? 0 : roomAttributesObj.selected_buyin,
      //    password: roomAttributesObj.password === undefined ? '' : roomAttributesObj.password,
      //    game_type_name: game_type_name,
      //    minimum_buyin: roomAttributesObj.minimum_buyin === undefined ? 0 : roomAttributesObj.minimum_buyin,
      //    maximum_buyin: roomAttributesObj.maximum_buyin === undefined ? 0 : roomAttributesObj.maximum_buyin,
      //    exclusive_table:roomAttributesObj.exclusive_table === undefined ? false: roomAttributesObj.exclusive_table,
      //    auto_start: roomAttributesObj.auto_start === undefined ? false: roomAttributesObj.auto_start,
      //    auto_start_player:roomAttributesObj.auto_start_player === undefined ? 2: roomAttributesObj.auto_start_player

      // }
   } catch (error) {
      console.log("Error in lock balance of user ", error);
      return {
         status: false,
         message: error.message
      }
   }
}

const UpdateTableRoomDataForClub = async (tableRoomDataRequest) => {
   try {
      // will write this controller 
      let userId = tableRoomDataRequest.userId;
      let roomId = tableRoomDataRequest.roomId;
      let updatedObj = JSON.parse(tableRoomDataRequest.roomAttributes);
      let gameModalData = await pokerService
         .getGameModalDataByQuery({ game_id: roomId });
      if (!gameModalData) {
         throw new Error("Game table not found");
      }
      let roomAttributes = gameModalData.game_json_data;
      let roomAttributesObj = JSON.parse(roomAttributes);
      for (let key in updatedObj) {
         if (roomAttributesObj[key] != undefined) roomAttributesObj[key] = updatedObj[key];
      }
      gameModalData.game_json_data = JSON.stringify(roomAttributesObj);
      await pokerService.updateGameByQuery(gameModalData, { game_id: roomId });
      await (await getRedisClient()).del("CLUBROOM" + tableRoomDataRequest.club_id);
      return { message: "Success" };
   } catch (error) {
      console.error(error);
      return { message: error.message }
   }
}

// game_table_status == active means there are less player on table than maximum player 
// when a table become full we marked game_table_status as full hence 
// this will be execute when someone will send join event means will take seat on table 
const getOrCreateTable = async (joinTableDataRequest) => {
   try {
      if (!joinTableDataRequest.userId) {
         throw new Error("User id is required");
      }
      let userData = await userService.getUserDetailsById({ user_id: joinTableDataRequest.userId });
      if (!userData) {
         throw new Error("User not found");
      }
      // to get table by tableId
      let pokerTable = await pokerService.getOneGameTableModalDataByQuery({
         game_table_id: joinTableDataRequest.tableId
      });
      if (!pokerTable) {
         throw new Error("Table not found");
      }
      let gameModalData = await pokerService.getGameModalDataByQuery({ game_id: pokerTable.game_id });
      let clubId = 0;
      // if it is a club room then set the club_id
      if (gameModalData.club_id && gameModalData.club_id != 0) {
         clubId = gameModalData.club_id
      }
      let gameType = await getGameTypeModalDataByQuery({
         game_type_id: gameModalData.game_type_id
      });
      let game_type_name = gameType.name;
      // if ((pokerTable.game_table_status !== "Active" && gameModalData.is_single_table)
      // || gameModalData.is_game_finished) {
      //    throw new Error("Game is finished");
      // }
      let roomAttributes = gameModalData.game_json_data;
      let roomAttributesObj = JSON.parse(roomAttributes);
      let maxPlayers = roomAttributesObj.maximum_player;
      let tableRoundData = await pokerService.getTableRoundByQuery({
         game_table_id: joinTableDataRequest.tableId,
         table_round_status: "Active"
      });
      let table_attributes = JSON.parse(tableRoundData.table_attributes);
      // if table is not active then create a new table and table round and return response along with new tableId
      if (pokerTable.game_table_status !== "Active") {
         //TODO : check for tableRoundData being null no active table founds 
         let tableData = {
            roomId: table_attributes.roomId,
            players: [{
               userId: joinTableDataRequest.userId,
               userName: game_type_name.startsWith("ANONYMOUS") ? "XXXXX" : userData.username,
               stack: joinTableDataRequest.chips
            }],
            //  leftPlayers: [],
            maxPlayers: table_attributes.maxPlayers,
            minPlayers: table_attributes.minPlayers,
            minimum_buyin: table_attributes.minimum_buyin,
            maximum_buyin: table_attributes.maximum_buyin,
            smallBlind: table_attributes.small_blind,
            bigBlind: table_attributes.big_blind,
         }
         let pokerTableData = {
            game_id: pokerTable.game_id,
            table_name: pokerTable.table_name,
            game_table_status: "Active",
            game_category: "Poker",
            club_id: clubId
         }
         pokerTable = await pokerService.createGameTableModalData(pokerTableData);
         pokerTable = pokerTable.toJSON();
         let tableRoundData = {
            game_table_id: pokerTable.game_table_id,
            table_attributes: JSON.stringify(tableData),
            result_json: JSON.stringify({}),
            table_round_status: "Active",
         }
         await pokerService.createTableRoundModalData(tableRoundData);
         return {
            status: true,
            message: "Table created successfully",
            tableId: pokerTable.game_table_id,
            roomId: gameModalData.game_id,
            gameType: gameType.name
         }
      } else {
         // in case not tableRound data found with active status then also create new one with same game_table_id
         if (!tableRoundData) {
            tableRoundData = {
               game_table_id: pokerTable.game_table_id,
               table_attributes: JSON.stringify({
                  roomId: joinTableDataRequest.tableId,
                  players: [],
                  //                  leftPlayers: [],
                  maxPlayers: maxPlayers,
                  minPlayers: roomAttributesObj.minimum_player
               }),
               result_json: JSON.stringify({}),
               table_round_status: "Active",
            }
         }
         let tableAttributes = tableRoundData.table_attributes;
         let tableAttributesObj = JSON.parse(tableAttributes);
         if (tableAttributesObj.players.length >= maxPlayers) {
            throw new Error("Table is full");
         }
         if (tableAttributesObj.players.find(player => player.userId === joinTableDataRequest.userId)) {
            return {
               status: true,
               message: "Table joined successfully",
               tableId: tableRoundData.game_table_id,
               roomId: pokerTable.game_id,
               gameType: gameType.name
            }
         }
         tableAttributesObj.players.push({
            userId: joinTableDataRequest.userId,
            userName: game_type_name.startsWith("ANONYMOUS") ? "XXXXX" : userData.username,
            stack: joinTableDataRequest.chips
         });
         // in case by the joining of new player table becomes full then we will mark game_table_status as full
         if (tableAttributesObj.players.length === maxPlayers) {
            console.log("Table with id ", tableRoundData.game_table_id, " is full");
            pokerTable.game_table_status = "Full";
            await pokerService.updateGameTableModalDataByQuery({
               game_table_status: "Full"
            }, {
               game_table_id: pokerTable.game_table_id
            });
         }
         tableRoundData.table_attributes = JSON.stringify(tableAttributesObj);
         await pokerService.updateTableRoundModalDataByQuery({
            table_attributes: tableRoundData.table_attributes,
         }, {
            table_round_id: tableRoundData.table_round_id
         });
         return {
            status: true,
            message: "Table joined successfully",
            tableId: tableRoundData.game_table_id,
            roomId: pokerTable.game_id,
            gameType: gameType.name
         }
      }
   } catch (error) {
      console.log("Error in lock balance of user ", error);
      return {
         status: false,
         message: error.message
      }
   }
}

const getOrCreateMultiTable = async (joinMultiTableDataRequest) => {
   try {
      console.log("joinMultiTableDataRequest is ", joinMultiTableDataRequest)
      if (!joinMultiTableDataRequest.userId) {
         throw new Error("User id is required");
      }
      if (!joinMultiTableDataRequest.gameId) {
         throw new Error("gameId id is required");
      }
      let userData = await userService.getUserDetailsById({ user_id: joinMultiTableDataRequest.userId });
      if (!userData) {
         throw new Error("User not found");
      }
      let game_id = joinMultiTableDataRequest.gameId;
      let gameModalData = await pokerService.getGameModalDataByQuery({ game_id: joinMultiTableDataRequest.gameId });
      if (!gameModalData) {
         throw new Error("Game table not found");
      }
      let clubId = 0;
      // if it is a club room then set the club_id
      if (gameModalData.club_id && gameModalData.club_id != 0) {
         clubId = gameModalData.club_id
      }
      let gameType = await getGameTypeModalDataByQuery({
         game_type_id: gameModalData.game_type_id
      });
      let game_type_name = gameType.name;
      let roomAttributes = gameModalData.game_json_data;
      let roomAttributesObj = JSON.parse(roomAttributes);
      let maxPlayers = roomAttributesObj.maximum_player;
      // getting all tables of that particular room whose game_table_status are active 
      let game_tables = await pokerService.getGameTableModalDataByQuery({
         game_id,
         game_table_status: "Active"
      });
      // in case no active table found then create new one and send response 
      if (game_tables.length === 0) {
         let tableData = {
            roomId: game_id,
            players: [],
            maxPlayers: maxPlayers,
            minPlayers: roomAttributesObj.minimum_player,
            minimum_buyin: roomAttributesObj.minimum_buyin,
            maximum_buyin: roomAttributesObj.maximum_buyin,
            smallBlind: roomAttributesObj.small_blind,
            bigBlind: roomAttributesObj.big_blind,
         }
         // if it is a club room then set the club_id
         if (gameModalData.club_id && gameModalData.club_id != 0) tableData.club_id = gameModalData.club_id
         let pokerTableData = {
            game_id: game_id,
            table_name: roomAttributesObj.room_name,
            game_table_status: "Active",
            game_category: "Poker",
            club_id: clubId
         }
         // creating a table 
         let pokerTable = await pokerService.createGameTableModalData(pokerTableData);
         pokerTable = pokerTable.toJSON();
         console.log("pokerTable after creation in multitable ", pokerTable);
         // creatung a tableRond with active status --> tableRond will consist all the information abour table like how many players are there on table 
         let tableRoundData = {
            game_table_id: pokerTable.game_table_id,
            table_attributes: JSON.stringify(tableData),
            result_json: JSON.stringify({}),
            table_round_status: "Active",
         }
         await pokerService.createTableRoundModalData(tableRoundData);
         tableData.game_type_name = game_type_name;
         tableData.table_name = roomAttributesObj.room_name;

         pokerTable.tableAttributes = JSON.stringify(tableData);
         // send response by grpc and return 
         return pokerTable;
      }
      for (let i = 0; i < game_tables.length; i++) {
         let game_table = game_tables[i];
         // fetching table round of a particular game which is active 
         let tableRoundData = await pokerService.getTableRoundByQuery({
            game_table_id: game_table.game_table_id,
            table_round_status: "Active"
         });
         if (tableRoundData) {
            game_table.table_attributes = tableRoundData.table_attributes;
            let tableAttributes = tableRoundData.table_attributes;
            let tableAttributesObj = JSON.parse(tableAttributes);
            if (tableAttributesObj.players.length >= maxPlayers) continue;
            if (tableAttributesObj.players.find(player => player.userId === joinMultiTableDataRequest.userId)) continue;
            // write logic to send by grpc 
            tableAttributesObj.game_type_name = game_type_name;
            tableAttributesObj.table_name = roomAttributesObj.room_name;
            game_table.table_attributes = JSON.stringify(tableAttributesObj);
            return game_table;
         } else {
            // if table round is not active then create new one 
            game_table.table_attributes = {
               roomId: game_id,
               players: [],
               maxPlayers: maxPlayers,
               minPlayers: roomAttributesObj.minimum_player,
               game_type_name: game_type_name,
               table_name: roomAttributesObj.room_name
            }
            let tableData = {
               roomId: game_id,
               players: [],
               maxPlayers: maxPlayers,
               minPlayers: roomAttributesObj.minimum_player,
               minimum_buyin: roomAttributesObj.minimum_buyin,
               maximum_buyin: roomAttributesObj.maximum_buyin,
               smallBlind: roomAttributesObj.small_blind,
               bigBlind: roomAttributesObj.big_blind,

            }
            // if it is a club room then set the club_id
            if (gameModalData.club_id && gameModalData.club_id != 0) tableData.club_id = gameModalData.club_id
            tableRoundData = {
               game_table_id: game_table.game_table_id,
               table_attributes: JSON.stringify(tableData),
               result_json: JSON.stringify({}),
               table_round_status: "Active",
            }
            await pokerService.createTableRoundModalData(tableRoundData);
            tableData.game_type_name = game_type_name;
            tableData.table_name = roomAttributesObj.room_name;
            // game_table.table_attributes = JSON.stringify(game_table.table_attributes) // commented this 
            game_table.tableAttributes = JSON.stringify(tableData);
            // write logic to send by grpc 
            return game_table;
         }
      }
      // in case no active table found or playerIs already on active tables then create new one and send response 
      let tableData = {
         roomId: game_id,
         players: [],
         maxPlayers: maxPlayers,
         minPlayers: roomAttributesObj.minimum_player,
         minimum_buyin: roomAttributesObj.minimum_buyin,
         maximum_buyin: roomAttributesObj.maximum_buyin,
         smallBlind: roomAttributesObj.small_blind,
         bigBlind: roomAttributesObj.big_blind,
      }
      // if it is a club room then set the club_id
      let clubIds = 0;
      if (gameModalData.club_id && gameModalData.club_id != 0) {
         tableData.club_id = gameModalData.club_id
         clubIds = gameModalData.club_id
      }
      let pokerTableData = {
         game_id: game_id,
         table_name: roomAttributesObj.room_name,
         game_table_status: "Active",
         game_category: "Poker",
         club_id: clubIds
      }
      // creating a table 
      let pokerTable = await pokerService.createGameTableModalData(pokerTableData);
      pokerTable = pokerTable.toJSON();
      console.log("pokerTable after creation in multitable ", pokerTable);
      // creatung a tableRond with active status --> tableRond will consist all the information abour table like how many players are there on table 
      let tableRoundData = {
         game_table_id: pokerTable.game_table_id,
         table_attributes: JSON.stringify(tableData),
         result_json: JSON.stringify({}),
         table_round_status: "Active",
      }
      await pokerService.createTableRoundModalData(tableRoundData);
      tableData.game_type_name = game_type_name;
      tableData.table_name = roomAttributesObj.room_name;

      pokerTable.tableAttributes = JSON.stringify(tableData);
      // send response by grpc and return 
      return pokerTable;
   } catch (error) {
      console.log("Error in joinMultiTable  ", error);
      return {
         status: false,
         message: error.message
      }
   }
}

const getOrCreateMultiTableForClub = async (joinMultiTableDataRequest) => {
   try {
      console.log("joinMultiTableDataRequest is ", joinMultiTableDataRequest)
      if (!joinMultiTableDataRequest.userId) {
         throw new Error("User id is required");
      }
      if (!joinMultiTableDataRequest.gameId) {
         throw new Error("gameId id is required");
      }
      let userData = await userService.getUserDetailsById({ user_id: joinMultiTableDataRequest.userId });
      if (!userData) {
         throw new Error("User not found");
      }
      let game_id = joinMultiTableDataRequest.gameId;
      let gameModalData = await pokerService.getGameModalDataByQuery({ game_id: joinMultiTableDataRequest.gameId });
      if (!gameModalData) {
         throw new Error("Game table not found");
      }
      let clubId = 0;
      // if it is a club room then set the club_id
      if (gameModalData.club_id && gameModalData.club_id != 0) {
         clubId = gameModalData.club_id
      }
      let gameType = await getGameTypeModalDataByQuery({
         game_type_id: gameModalData.game_type_id
      });
      let game_type_name = gameType.name;
      let roomAttributes = gameModalData.game_json_data;
      let roomAttributesObj = JSON.parse(roomAttributes);
      let maxPlayers = roomAttributesObj.maximum_player;
      // getting all tables of that particular room whose game_table_status are active 
      let game_tables = await pokerService.getGameTableModalDataByQuery({
         game_id,
         game_table_status: "Active"
      });
      // in case no active table found then create new one and send response 
      if (game_tables.length === 0) {
         let tableData = {
            roomId: game_id,
            players: [],
            maxPlayers: maxPlayers,
            minPlayers: roomAttributesObj.minimum_player,
            minimum_buyin: roomAttributesObj.minimum_buyin,
            maximum_buyin: roomAttributesObj.maximum_buyin,
            smallBlind: roomAttributesObj.small_blind,
            bigBlind: roomAttributesObj.big_blind,
         }
         // if it is a club room then set the club_id
         if (gameModalData.club_id && gameModalData.club_id != 0) tableData.club_id = gameModalData.club_id
         let pokerTableData = {
            game_id: game_id,
            table_name: roomAttributesObj.room_name,
            game_table_status: "Active",
            game_category: "Poker",
            club_id: clubId
         }
         // creating a table 
         let pokerTable = await pokerService.createGameTableModalData(pokerTableData);
         pokerTable = pokerTable.toJSON();
         console.log("pokerTable after creation in multitable ", pokerTable);
         // creatung a tableRond with active status --> tableRond will consist all the information abour table like how many players are there on table 
         let tableRoundData = {
            game_table_id: pokerTable.game_table_id,
            table_attributes: JSON.stringify(tableData),
            result_json: JSON.stringify({}),
            table_round_status: "Active",
         }
         await pokerService.createTableRoundModalData(tableRoundData);
         tableData.game_type_name = game_type_name;
         tableData.table_name = roomAttributesObj.room_name;

         pokerTable.tableAttributes = JSON.stringify(tableData);
         // send response by grpc and return 
         return addRoomAttributes(pokerTable, gameModalData, roomAttributesObj);
      }
      for (let i = 0; i < game_tables.length; i++) {
         let game_table = game_tables[i];
         // fetching table round of a particular game which is active 
         let tableRoundData = await pokerService.getTableRoundByQuery({
            game_table_id: game_table.game_table_id,
            table_round_status: "Active"
         });
         if (tableRoundData) {
            game_table.table_attributes = tableRoundData.table_attributes;
            let tableAttributes = tableRoundData.table_attributes;
            let tableAttributesObj = JSON.parse(tableAttributes);
            // if (tableAttributesObj.players.length >= maxPlayers)  continue;
            // if (tableAttributesObj.players.find(player => player.userId === joinMultiTableDataRequest.userId)) continue;
            // write logic to send by grpc 
            tableAttributesObj.game_type_name = game_type_name;
            tableAttributesObj.table_name = roomAttributesObj.room_name;
            game_table.table_attributes = JSON.stringify(tableAttributesObj);
            return addRoomAttributes(game_table, gameModalData, roomAttributesObj);
         } else {
            // if table round is not active then create new one 
            game_table.table_attributes = {
               roomId: game_id,
               players: [],
               maxPlayers: maxPlayers,
               minPlayers: roomAttributesObj.minimum_player,
               game_type_name: game_type_name,
               table_name: roomAttributesObj.room_name
            }
            let tableData = {
               roomId: game_id,
               players: [],
               maxPlayers: maxPlayers,
               minPlayers: roomAttributesObj.minimum_player,
               minimum_buyin: roomAttributesObj.minimum_buyin,
               maximum_buyin: roomAttributesObj.maximum_buyin,
               smallBlind: roomAttributesObj.small_blind,
               bigBlind: roomAttributesObj.big_blind,

            }
            // if it is a club room then set the club_id
            if (gameModalData.club_id && gameModalData.club_id != 0) tableData.club_id = gameModalData.club_id
            tableRoundData = {
               game_table_id: game_table.game_table_id,
               table_attributes: JSON.stringify(tableData),
               result_json: JSON.stringify({}),
               table_round_status: "Active",
            }
            await pokerService.createTableRoundModalData(tableRoundData);
            tableData.game_type_name = game_type_name;
            tableData.table_name = roomAttributesObj.room_name;
            // game_table.table_attributes = JSON.stringify(game_table.table_attributes) // commented this 
            game_table.tableAttributes = JSON.stringify(tableData);
            // write logic to send by grpc 
            return addRoomAttributes(game_table, gameModalData, roomAttributesObj);
         }
      }
      // in case no active table found or playerIs already on active tables then create new one and send response 
      let tableData = {
         roomId: game_id,
         players: [],
         maxPlayers: maxPlayers,
         minPlayers: roomAttributesObj.minimum_player,
         minimum_buyin: roomAttributesObj.minimum_buyin,
         maximum_buyin: roomAttributesObj.maximum_buyin,
         smallBlind: roomAttributesObj.small_blind,
         bigBlind: roomAttributesObj.big_blind,
      }
      // if it is a club room then set the club_id
      let clubIds = 0;
      if (gameModalData.club_id && gameModalData.club_id != 0) {
         tableData.club_id = gameModalData.club_id
         clubIds = gameModalData.club_id
      }
      let pokerTableData = {
         game_id: game_id,
         table_name: roomAttributesObj.room_name,
         game_table_status: "Active",
         game_category: "Poker",
         club_id: clubIds
      }
      // creating a table 
      let pokerTable = await pokerService.createGameTableModalData(pokerTableData);
      pokerTable = pokerTable.toJSON();
      console.log("pokerTable after creation in multitable ", pokerTable);
      // creatung a tableRond with active status --> tableRond will consist all the information abour table like how many players are there on table 
      let tableRoundData = {
         game_table_id: pokerTable.game_table_id,
         table_attributes: JSON.stringify(tableData),
         result_json: JSON.stringify({}),
         table_round_status: "Active",
      }
      await pokerService.createTableRoundModalData(tableRoundData);
      tableData.game_type_name = game_type_name;
      tableData.table_name = roomAttributesObj.room_name;

      pokerTable.tableAttributes = JSON.stringify(tableData);
      // send response by grpc and return 
      return addRoomAttributes(pokerTable, gameModalData, roomAttributesObj);
   } catch (error) {
      console.log("Error in joinMultiTable  ", error);
      return {
         status: false,
         message: error.message
      }
   }
}

function addRoomAttributes(obj, gameModalData, roomAttributesObj) {
   return {
      ...obj,
      selected_small_blind: roomAttributesObj.small_blind === undefined ? 0 : roomAttributesObj.small_blind,
      selected_big_blind: roomAttributesObj.big_blind === undefined ? 0 : roomAttributesObj.big_blind,
      selected_maximum_player: roomAttributesObj.selected_maximum_player === undefined ? 0 : roomAttributesObj.selected_maximum_player,
      selected_buyin: roomAttributesObj.selected_buyin === undefined ? 0 : roomAttributesObj.selected_buyin,
      password: roomAttributesObj.password === undefined ? '' : roomAttributesObj.password,
      exclusive_table: roomAttributesObj.exclusive_table === undefined ? false : roomAttributesObj.exclusive_table,
      action_time: roomAttributesObj.action_time == undefined ? 0 : roomAttributesObj.action_time,
      record_privacy: roomAttributesObj.record_privacy == undefined ? false : roomAttributesObj.record_privacy,
      auto_start: roomAttributesObj.auto_start === undefined ? false : roomAttributesObj.auto_start,
      auto_start_player: roomAttributesObj.auto_start_player === undefined ? 2 : roomAttributesObj.auto_start_player,
      is_table_started_by_owner: roomAttributesObj.is_table_started_by_owner === undefined ? false : roomAttributesObj.is_table_started_by_owner,
      ban_chatting: roomAttributesObj.ban_chatting === undefined ? false : roomAttributesObj.ban_chatting,
      runmulti_time: roomAttributesObj.runmulti_time === undefined ? false : roomAttributesObj.runmulti_time,
      run_twice: (roomAttributesObj.run_twice) ? roomAttributesObj.run_twice : false,
      run_twice_value: (roomAttributesObj.run_twice_value) ? roomAttributesObj.run_twice_value : "",
      turn_timmer: roomAttributesObj.turn_timmer,
      auto_extension: roomAttributesObj.auto_extension === undefined ? false : roomAttributesObj.auto_extension,
      auto_extension_time: roomAttributesObj.auto_extension_time === undefined ? 0 : roomAttributesObj.auto_extension_time,
      auto_open: roomAttributesObj.auto_open === undefined ? false : roomAttributesObj.auto_open,
      table_time: roomAttributesObj.table_time === undefined ? null : roomAttributesObj.table_time,
      authorized_to_buyIn: roomAttributesObj.authorized_to_buyIn === undefined ? null : roomAttributesObj.authorized_to_buyIn,
      added_by: gameModalData.added_by == undefined ? null : gameModalData.added_by,
      isGameStarted: false,
      isGameEnded: false,
      tableTimeCounter: (roomAttributesObj.table_time) ? (roomAttributesObj.table_time * 60 * 60) : 0,
      tableTimeCounterStarted: false,
      straddle: (roomAttributesObj.straddle) ? roomAttributesObj.straddle : false
   }
}
const createTableAndJoinTournament = async (joinTournamentDataRequest) => {
   try {
      let game_id = joinTournamentDataRequest.gameId;
      let gameModalData = await pokerService
         .getGameModalDataByQuery({ game_id });
      let roomAttributes = gameModalData.game_json_data;
      let roomAttributesObj = JSON.parse(roomAttributes);
      let maxPlayers = roomAttributesObj.maximum_player_in_table;
      if (!gameModalData) {
         throw new Error("Game table not found");
      }
      let tableData = {
         roomId: game_id,
         players: [],
         maxPlayers: maxPlayers,
         minPlayers: roomAttributesObj.minimum_player,
         minimum_buyin: roomAttributesObj.minimum_buyin,
         maximum_buyin: roomAttributesObj.maximum_buyin,
         smallBlind: roomAttributesObj.small_blind,
         bigBlind: roomAttributesObj.big_blind,
      }
      let pokerTableData = {
         game_id: game_id,
         table_name: roomAttributesObj.room_name,
         game_table_status: "Active",
         game_category: "Poker",
      }
      let pokerTable = await pokerService.createGameTableModalData(pokerTableData);
      pokerTable = pokerTable.toJSON();
      console.log("pokerTable after creation ", pokerTable);
      let tableRoundData = {
         game_table_id: pokerTable.game_table_id,
         table_attributes: JSON.stringify(tableData),
         result_json: JSON.stringify({}),
         table_round_status: "Active",
      }
      tableRoundData = await pokerService.createTableRoundModalData(tableRoundData);
      let tableAttributes = tableRoundData.table_attributes;
      let tableAttributesObj = JSON.parse(tableAttributes);
      for (let i = 0; i < joinTournamentDataRequest.userIds.length; i++) {
         let userId = joinTournamentDataRequest.userIds[i];
         let userData = await userService.getUserDetailsById({ user_id: userId });
         if (!userData) {
            throw new Error("User not found");
         }
         tableAttributesObj.players.push({
            userId: userId,
            userName: userData.username,
            stack: joinTournamentDataRequest.chips
         });
      }
      await pokerService.updateTableRoundModalDataByQuery({
         table_attributes: JSON.stringify(tableAttributesObj),
      }, {
         table_round_id: tableRoundData.table_round_id
      });
      return {
         status: true,
         message: "Table created successfully",
         tableId: tableRoundData.game_table_id,
         roomId: pokerTable.game_id,
      }
   } catch (error) {
      console.log("Error in createTableAndJoinTournament ", error);
      return {
         status: false,
         message: error.message
      }
   }
}

const updateStatusAndCloneTable = async (request) => {
   try {
      // to get table by tableId
      const pokerTable = await pokerService.getOneGameTableModalDataByQuery({
         game_table_id: request.tableId
      });

      if (!pokerTable) {
         throw new Error("Table not found");
      }

      // update table status to completed if auto open is false 
      if (!request.autoOpen)  await pokerService.updateGameByQuery({ game_status: "3" }, { game_id: pokerTable.game_id });
      await pokerService.updateGameTableModalDataByQuery({
         game_table_status: "Completed"
      }, { game_table_id: pokerTable.game_table_id });
      let gameModalData = await pokerService.getGameModalDataByQuery({ game_id: pokerTable.game_id });
      if (gameModalData && gameModalData.club_id) {
         await (await getRedisClient()).del(`CLUBROOM${gameModalData.club_id}`);
      }
      console.log("request.autoOpen", request.autoOpen, typeof (request.autoOpen))
      if (!request.autoOpen) return { message: "Table Completed." };

      let clubId = 0;
      // if it is a club room then set the club_id
      if (gameModalData.club_id && gameModalData.club_id != 0) {
         clubId = gameModalData.club_id
      }

      const roomAttributesObj = JSON.parse(gameModalData.game_json_data);

      // creating a new table with same config
      const newTbl = (await pokerService.createGameTableModalData({
         game_id: pokerTable.game_id,
         table_name: pokerTable.table_name,
         game_table_status: "Active",
         game_category: "Poker",
         club_id: clubId
      })).toJSON();

      await pokerService.createTableRoundModalData({
         game_table_id: newTbl.game_table_id,
         table_attributes: JSON.stringify({
            roomId: pokerTable.game_id,
            players: [],
            //  leftPlayers: [],
            maxPlayers: roomAttributesObj.maximum_player,
            minPlayers: roomAttributesObj.minimum_player
         }),
         result_json: JSON.stringify({}),
         table_round_status: "Active",
      })

      return {
         message: "Table cloned successfully"
      }
   } catch (error) {
      console.log("Error in lock balance of user ", error);
      return {
         message: error.message
      }
   }
}

const mergeTable = async (joinTournamentDataRequest) => {
   try {
      let game_id = joinTournamentDataRequest.gameId;
      let gameModalData = await pokerService
         .getGameModalDataByQuery({ game_id });
      let roomAttributes = gameModalData.game_json_data;
      let roomAttributesObj = JSON.parse(roomAttributes);
      let maxPlayers = roomAttributesObj.maximum_player_in_table;
      if (!gameModalData) {
         throw new Error("Game table not found");
      }
      let tableData = {
         roomId: game_id,
         players: [],
         maxPlayers: maxPlayers,
         minPlayers: roomAttributesObj.minimum_player,
         minimum_buyin: roomAttributesObj.minimum_buyin,
         maximum_buyin: roomAttributesObj.maximum_buyin,
         smallBlind: roomAttributesObj.small_blind,
         bigBlind: roomAttributesObj.big_blind,
      }
      let pokerTableData = {
         game_id: game_id,
         table_name: roomAttributesObj.room_name,
         game_table_status: "Active",
         game_category: "Poker",
      }
      let pokerTable = await pokerService.createGameTableModalData(pokerTableData);
      pokerTable = pokerTable.toJSON();
      console.log("pokerTable after creation ", pokerTable);
      let tableRoundData = {
         game_table_id: pokerTable.game_table_id,
         table_attributes: JSON.stringify(tableData),
         result_json: JSON.stringify({}),
         table_round_status: "Active",
      }
      tableRoundData = await pokerService.createTableRoundModalData(tableRoundData);
      let tableAttributes = tableRoundData.table_attributes;
      let tableAttributesObj = JSON.parse(tableAttributes);
      for (let i = 0; i < joinTournamentDataRequest.playerAndStacks.length; i++) {
         let playerAndStack = joinTournamentDataRequest.playerAndStacks[i];
         let userData = await userService.getUserDetailsById({ user_id: playerAndStack.userId });
         if (!userData) {
            throw new Error("User not found");
         }
         tableAttributesObj.players.push({
            userId: playerAndStack.userId,
            userName: userData.username,
            stack: playerAndStack.chips
         });
      }
      await pokerService.updateTableRoundModalDataByQuery({
         table_attributes: JSON.stringify(tableAttributesObj),
      }, {
         table_round_id: tableRoundData.table_round_id
      });
      return {
         status: true,
         message: "Table created successfully",
         tableId: tableRoundData.game_table_id,
         roomId: pokerTable.game_id,
      }
   } catch (error) {
      console.log("Error in createTableAndJoinTournament ", error);
      return {
         status: false,
         message: error.message
      }
   }
}

const removePlayerFromTable = async (removePlayerDataRequest) => {
   try {
      let pokerTable = await pokerService.getOneGameTableModalDataByQuery({
         game_table_id: removePlayerDataRequest.tableId
      });
      if (!pokerTable) {
         throw new Error("Table not found");
      }
      let tableRoundData = await pokerService.getTableRoundByQuery({
         game_table_id: removePlayerDataRequest.tableId,
         table_round_status: "Active"
      });
      let table_attributes = JSON.parse(tableRoundData.table_attributes);
      let players = table_attributes.players;
      let playerIndex = players.findIndex(player => player.userId === removePlayerDataRequest.userId);
      if (playerIndex === -1) {
         throw new Error("Player not found");
      }
      players.splice(playerIndex, 1);
      table_attributes.players = players;
      tableRoundData.table_attributes = JSON.stringify(table_attributes);
      await pokerService.updateTableRoundModalDataByQuery({
         table_attributes: tableRoundData.table_attributes,

      }, {
         table_round_id: tableRoundData.table_round_id
      });
      return {
         status: true,
         message: "Player removed successfully",
      }
   } catch (error) {
      console.error("Error in removePlayerFromTable ", error);
      return {
         status: false,
         message: error.message
      }
   }
}

const savePokerResult = async (pokerResultRequest) => {
   try {
      if (!pokerResultRequest.tableId) {
         throw new Error("Table id is required");
      }
      let pokerTable = await pokerService.getOneGameTableModalDataByQuery({
         game_table_id: pokerResultRequest.tableId
      });

      if (!pokerTable) {
         throw new Error("Table not found");
      }
      let pokerRoom = await pokerService.getGameModalDataByQuery({
         game_id: pokerTable.game_id
      });
      let gameType = await getGameTypeModalDataByQuery({
         game_type_id: pokerRoom.game_type_id
      });
      let tableRoundData = await pokerService.getTableRoundByQuery({
         game_table_id: pokerResultRequest.tableId,
         table_round_status: "Active"
      });
      if (!tableRoundData) {
         throw new Error("Table round not found");
      }
      let clubId = (pokerRoom.club_id) ? pokerRoom.club_id : 0;
      let new_table_attributes = JSON.parse(tableRoundData.table_attributes);
      let old_table_attributes = JSON.parse(tableRoundData.table_attributes);
      old_table_attributes.players = old_table_attributes.players.map(async player => {
         let playerFromResult = pokerResultRequest.playerCardsAndChips
            .find(player1 => player1.userId === player.userId);
         if (playerFromResult) {
            return player;
         }
         if (clubId != 0) {
            console.log('clubId', clubId)
            console.log("savePokerResult-->unclocking amount");
            await unlockBalanceOfUserForClub({
               user_id: player.userId,
               amount: player.stack,
               tableId: pokerResultRequest.tableId,
               gameType: gameType.name,
               clubId: clubId
            });
         } else {
            console.log('clubId1', clubId)
            await unlockBalanceOfUser({
               user_id: player.userId,
               amount: player.stack,
               tableId: pokerResultRequest.tableId,
               gameType: gameType.name
            });
         }

         return null;
      }).filter(player => player);
      new_table_attributes.players = new_table_attributes.players.map(player => {
         let playerFromResult = pokerResultRequest.playerCardsAndChips
            .find(player1 => player1.userId === player.userId);
         if (playerFromResult) {
            player.stack = playerFromResult.chips;
            return player;
         }
         return null;
      }).filter(player => player);
      let newTableRoundData = {
         game_table_id: tableRoundData.game_table_id,
         table_attributes: JSON.stringify(new_table_attributes),
         table_round_status: "Active",
      };
      let resultJson = {
         winners: pokerResultRequest.winners,
         pots: pokerResultRequest.pots,
         players: pokerResultRequest.playerCardsAndChips,
         communityCards: pokerResultRequest.communityCards,
      }
      tableRoundData.result_json = JSON.stringify(resultJson);
      tableRoundData.hand_histories = JSON.stringify(pokerResultRequest.handHistories);
      tableRoundData.table_round_status = "Completed";
      await pokerService.updateTableRoundModalDataByQuery({
         result_json: tableRoundData.result_json,
         table_round_status: tableRoundData.table_round_status,
         hand_histories: tableRoundData.hand_histories
      }, {
         table_round_id: tableRoundData.table_round_id
      });
      pokerTable.game_table_status = "Active";
      await pokerService.updateGameTableModalDataByQuery({
         game_table_status: pokerTable.game_table_status
      }, {
         game_table_id: pokerTable.game_table_id
      });
      await pokerService.createTableRoundModalData(newTableRoundData);
      let winnerSet = new Set();
      pokerResultRequest.winners.forEach(winner => {
         winnerSet.add(winner);
      });
      let handHistories = pokerResultRequest.handHistories;
      for (let player of pokerResultRequest.playerCardsAndChips) {
         let winAmount = 0;
         let isSb = false;
         let isBb = false;
         let isBetPreFlop = false;
         let isRaisePreFlop = false;
         let isThirdBet = false;
         let isFoldAfterThirdBet = false; //TODO
         let isContinueBet = false;
         let isFoldAfterContinueBet = false; //TODO
         let isRaiseAtLastPosition = false;
         let isCheckAndThenRaise = false;
         let isPotOpenedPreFlop = false;
         let isCheckInFlop = false;

         let isRaiseByOtherPlayerAlready = false;

         let handHistory = {
            doesSeeFlop: player.doesSeeFlop,
            doesReachShowdown: player.doesReachShowdown
         };
         handHistory.hand = handHistories.map(handHistory => {
            let userBetRecords = handHistory.userBetRecords.map(userBetRecord => {
               if (userBetRecord.userId === player.userId) {
                  if (userBetRecord.action === "sb") {
                     isSb = true;
                  }
                  if (userBetRecord.action === "bb") {
                     isBb = true;
                  }
                  if (handHistory.bettingRound === "pre-flop" && (userBetRecord.action === "bet"
                     || userBetRecord.action === "call" || userBetRecord.action === "raise"
                     || userBetRecord.action === "all-in")) {
                     isBetPreFlop = true;
                  }
                  if (handHistory.bettingRound === "pre-flop" && userBetRecord.action === "raise") {
                     isRaisePreFlop = true;
                     if (isRaiseByOtherPlayerAlready) {
                        isThirdBet = true;
                     }
                  }
                  if (handHistory.bettingRound === "flop" && isRaisePreFlop && (userBetRecord.action === "bet"
                     || userBetRecord.action === "call" || userBetRecord.action === "raise"
                     || userBetRecord.action === "all-in")) {
                     isContinueBet = true;
                  }
                  if (handHistory.bettingRound === "flop" && userBetRecord.action === "check") {
                     isCheckInFlop = true;
                  }
                  if (handHistory.bettingRound === "flop" && userBetRecord.action === "raise" && isCheckInFlop) {
                     isCheckAndThenRaise = true;
                  }
                  if (handHistory.bettingRound === "pre-flop" && (player.playerPosition === "SB" || player.playerPosition === "CO"
                     || player.playerPosition === "BTN") && userBetRecord.action === "raise" && !isPotOpenedPreFlop) {
                     isRaiseAtLastPosition = true;
                  }
                  return userBetRecord;
               } else {
                  if (handHistory.bettingRound === "pre-flop" && userBetRecord.action === "raise") {
                     isRaiseByOtherPlayerAlready = true;
                  }
                  if (handHistory.bettingRound === "pre-flop" && (userBetRecord.action === "bet"
                     || userBetRecord.action === "call" || userBetRecord.action === "raise"
                     || userBetRecord.action === "all-in")) {
                     isPotOpenedPreFlop = true;
                  }
               }
            }).filter(userBetRecord => userBetRecord);
            return {
               userBetRecords,
               bettingRound: handHistory.bettingRound
            }
         });

         pokerResultRequest.pots.forEach(pot => {
            if (pot.winners.find(winner => winner === player.userId)) {
               winAmount += parseFloat("" + (parseFloat("" + pot.amount)
                  / parseFloat("" + pot.winners.length)));
            }
         });
         let totalBetAmount = 0;
         player.bets.forEach(bet => {
            totalBetAmount += parseFloat(bet);
         });
         if (winAmount > 0) {
            winAmount -= totalBetAmount;
         }
         let other_information = {
            bets: player.bets,
            folded: player.folded,
            allIn: player.allIn,
         }
         let blind = new_table_attributes.smallBlind + "/" + new_table_attributes.bigBlind;
         let game_history = {
            user_id: player.userId,
            table_id: pokerTable.game_table_id + "#" + tableRoundData.table_round_id,
            table_name: pokerTable.table_name,
            community_card: JSON.stringify(pokerResultRequest.communityCards),
            hands_record: JSON.stringify(player.cards),
            bet_amount: totalBetAmount,
            is_win: winnerSet.has(player.userId) ? '1' : '0',
            win_amount: winAmount,
            other_information: JSON.stringify(other_information),
            game_category: 2,
            game_type: pokerRoom.game_type_id,
            hand_history: JSON.stringify(handHistory),
            blind
         }
         console.log("---------coming pokerResultRequest -------", pokerResultRequest);
         await userService.saveGameHistory(game_history);

         let userSessionStats = await pokerService.getPokerSessionStatsDataByQuery({
            user_id: player.userId
         });
         if (userSessionStats) {
            userSessionStats.hands_played += 1;
            userSessionStats.flops_seen += (player.doesSeeFlop ? 1 : 0);
            userSessionStats.hands_won += (winnerSet.has(player.userId) ? 1 : 0);
            userSessionStats.showdown_count += (player.doesReachShowdown ? 1 : 0);
            userSessionStats.sb_count += (isSb ? 1 : 0);
            userSessionStats.bb_count += (isBb ? 1 : 0);

            await pokerService.updatePokerSessionStatsDataByQuery({
               hands_played: userSessionStats.hands_played,
               flops_seen: userSessionStats.flops_seen,
               hands_won: userSessionStats.hands_won,
               showdown_count: userSessionStats.showdown_count,
               sb_count: userSessionStats.sb_count,
               bb_count: userSessionStats.bb_count,
            }, {
               user_id: player.userId
            });
         } else {
            userSessionStats = {
               user_id: player.userId,
               hands_played: 1,
               flops_seen: handHistory.doesSeeFlop ? 1 : 0,
               hands_won: winnerSet.has(player.userId) ? 1 : 0,
               showdown_count: handHistory.doesReachShowdown ? 1 : 0,
               sb_count: isSb ? 1 : 0,
               bb_count: isBb ? 1 : 0,
            }
            await pokerService.createPokerSessionStatsData(userSessionStats);
         }
         let pokerUserStats = await pokerService.getPokerUserStatsDataByQuery({
            user_id: player.userId
         });
         if (pokerUserStats) {
            pokerUserStats.hands_played += 1;
            pokerUserStats.bet_preflop_count += (isBetPreFlop ? 1 : 0);
            pokerUserStats.preflop_raise_count += (isRaisePreFlop ? 1 : 0);
            pokerUserStats.third_bet_preflop_count += (isThirdBet ? 1 : 0);
            pokerUserStats.continuation_bet_count += (isContinueBet ? 1 : 0);
            pokerUserStats.raise_at_last_position_on_table_count += (isRaiseAtLastPosition ? 1 : 0);
            pokerUserStats.check_raise_flop_count += (isCheckAndThenRaise ? 1 : 0);
            pokerUserStats.showdown_count_after_flop += ((handHistory.doesSeeFlop && handHistory.doesReachShowdown)
               ? 1 : 0);
            pokerUserStats.won_at_showdown_count += ((handHistory.doesReachShowdown && winnerSet.has(player.userId))
               ? 1 : 0);
            await pokerService.updatePokerUserStatsDataByQuery({
               hands_played: pokerUserStats.hands_played,
               bet_preflop_count: pokerUserStats.bet_preflop_count,
               preflop_raise_count: pokerUserStats.preflop_raise_count,
               third_bet_preflop_count: pokerUserStats.third_bet_preflop_count,
               continuation_bet_count: pokerUserStats.continuation_bet_count,
               fold_on_3bet_preflop_count: 0,
               fold_on_continuation_bet_count: 0,
               raise_at_last_position_on_table_count: pokerUserStats.raise_at_last_position_on_table_count,
               check_raise_flop_count: pokerUserStats.check_raise_flop_count,
               showdown_count_after_flop: pokerUserStats.showdown_count_after_flop,
               won_at_showdown_count: pokerUserStats.won_at_showdown_count,
            }, {
               user_id: player.userId
            });
         } else {
            pokerUserStats = {
               user_id: player.userId,
               hands_played: 1,
               bet_preflop_count: isBetPreFlop ? 1 : 0,
               preflop_raise_count: isRaisePreFlop ? 1 : 0,
               third_bet_preflop_count: isThirdBet ? 1 : 0,
               continuation_bet_count: isContinueBet ? 1 : 0,
               raise_at_last_position_on_table_count: isRaiseAtLastPosition ? 1 : 0,
               check_raise_flop_count: isCheckAndThenRaise ? 1 : 0,
               showdown_count_after_flop: (handHistory.doesSeeFlop && handHistory.doesReachShowdown) ? 1 : 0,
               won_at_showdown_count: (handHistory.doesReachShowdown && winnerSet.has(player.userId)) ? 1 : 0,
            };
            await pokerService.createPokerUserStatsData(pokerUserStats);
         }
      }
      return {
         status: true,
         message: "Result saved successfully",
         isRoomDisabledOrDeleted: (pokerRoom.game_status === '0' || pokerRoom.game_status === '3') // sending response that is room is disabledordeleted
      }
   } catch (error) {
      console.log("Error in save poker result ", error);
      return {
         status: false,
         message: error.message
      }
   }
}

const leaveTable = async (leaveTableRequest) => {
   try {
      if (!leaveTableRequest.tableId) {
         throw new Error("Table id is required");
      }
      let pokerTable = await pokerService.getOneGameTableModalDataByQuery({
         game_table_id: leaveTableRequest.tableId
      });
      let game = await pokerService.getGameModalDataByQuery({ game_id: pokerTable.game_id });
      let gameType = await pokerService.getGameTypeModalDataByQuery({ game_type_id: game.game_type_id });

      if (!pokerTable) {
         throw new Error("Table not found");
      }
      let tableRoundData = await pokerService.getTableRoundByQuery({
         game_table_id: leaveTableRequest.tableId,
         table_round_status: "Active"
      });
      if (!tableRoundData) {
         throw new Error("Table round not found");
      }
      let clubId = (game.club_id) ? game.club_id : 0;
      if (!gameType.name.startsWith("SIT N GO") && !gameType.name.startsWith("TOURNAMENT")) {
         let res;
         if (clubId != 0) {
            console.log("leave table unlocking amount");
            res = await unlockBalanceOfUserForClub({
               user_id: leaveTableRequest.userId,
               amount: leaveTableRequest.amount,
               tableId: leaveTableRequest.tableId,
               gameType: gameType.name,
               clubId: clubId
            });
         } else {
            res = await unlockBalanceOfUser({
               user_id: leaveTableRequest.userId,
               amount: leaveTableRequest.amount,
               tableId: leaveTableRequest.tableId,
               gameType: gameType.name
            });
         }

         if (!res.status) {
            throw new Error(res.message);
         }
      }
      let tableAttributes = tableRoundData.table_attributes;
      let tableAttributesObj = JSON.parse(tableAttributes);
      let playerIndex = tableAttributesObj.players
         .findIndex(player => player.userId === leaveTableRequest.userId);
      if (playerIndex === -1) {
         throw new Error("Player not found");
      }
      let leftPlayer = tableAttributesObj.players.splice(playerIndex, 1)[0];
      // Add removed player to leftPlayers array
      // if (tableAttributesObj.leftPlayers != undefined)
      //    tableAttributesObj.leftPlayers.push(leftPlayer);
      tableRoundData.table_attributes = JSON.stringify(tableAttributesObj);
      await pokerService.updateTableRoundModalDataByQuery({
         table_attributes: tableRoundData.table_attributes,
      }, {
         table_round_id: tableRoundData.table_round_id
      });
      if (pokerTable.game_table_status === "Full") {
         pokerTable.game_table_status = "Active";
         await pokerService.updateGameTableModalDataByQuery({
            game_table_status: pokerTable.game_table_status,
         }, {
            game_table_id: pokerTable.game_table_id
         });
      }
      return {
         status: true,
         message: "Player left successfully",
      }
   } catch (error) {
      console.error("Error in leave table ", error);
      return {
         status: false,
         message: error.message
      }
   }
}

const isNewPlayer = async (data) => {
   try {
      if (!data.tableId) {
         throw new Error("Table id is required");
      }
      let userId = data.userId;
      let res = pokerService.getBuyInRequestInfo({ userId: userId, table_id: data.tableId })
      if (res && (res.request_status == "Accepted" || res.request_status == "Na")) return true;
      return false;
   } catch (error) {
      console.log("Error in checking new player: ", error);
      return {
         status: false,
         message: error.message
      }
   }
};


const updatePokerDump = async (updatePokerDumpRequest) => {
   try {
      let tableDump = await pokerService.getPokerDumpTableDataByQuery({
         id: 1
      });
      if (!tableDump) {
         tableDump = {
            id: 1,
            poker_data_dump: JSON.stringify(updatePokerDumpRequest.tables)
         }
         await pokerService.createPokerDumpTableData(tableDump);
         return {
            status: true,
            message: "Poker dump updated successfully",
         }
      }
      tableDump.poker_data_dump = JSON.stringify(updatePokerDumpRequest.tables);
      await pokerService.updatePokerTableDumpByQuery({
         poker_data_dump: tableDump.poker_data_dump
      }, {
         id: 1
      });
      return {
         status: true,
         message: "Poker dump updated successfully",
      }
   } catch (error) {
      console.log("Error in update poker dump ", error);
      return {
         status: false,
         message: error.message
      }
   }
}

const dumpSingleTable = async (tableReq) => {
   try {
      let table = tableReq.table;
      let tableDump = await pokerService.getPokerDumpTableDataByQuery({
         table_id: table.tableId
      });
      if (!tableDump) {
         tableDump = {
            table_id: table.tableId,
            poker_data_dump: JSON.stringify(table)
         }
         await pokerService.createPokerDumpTableData(tableDump);
         return {
            status: true,
            message: "Poker dump updated successfully",
         }
      }
      tableDump.poker_data_dump = JSON.stringify(table);
      await pokerService.updatePokerTableDumpByQuery({
         poker_data_dump: tableDump.poker_data_dump
      }, {
         table_id: table.tableId
      });
      return {
         status: true,
         message: "Poker dump updated successfully",
      }
   } catch (error) {
      console.log("Error in update poker dump ", error);
      return {
         status: false,
         message: error.message
      }
   }
}

const dumpChatMessages = async (chatMessages) => {
   try {
      if (!chatMessages || chatMessages.length === 0) {
         return {
            status: false,
            message: "No chat messages found"
         }
      }
      let tableId = chatMessages[0].tableId;
      let tableRound = await pokerService.getTableRoundByQuery({
         game_table_id: tableId,
         table_round_status: "Active"
      });
      if (!tableRound) {
         throw new Error("Table round not found");
      }
      let tableRoundId = tableRound.table_round_id;
      for (const chatMessage of chatMessages) {
         chatMessage.roundId = tableRoundId;
         let chatModal = new ChatModel({
            userId: chatMessage.userId,
            tableId: chatMessage.tableId,
            roundId: chatMessage.roundId,
            message: chatMessage.message,
         });
         await chatModal.save();
      }
      return {
         status: true,
         message: "Chat messages dumped successfully",
      }
   } catch (error) {
      console.log("Error in dump chat messages ", error);
      return {
         status: false,
         message: error.message
      }
   }
}

const getPokerDump = async () => {
   try {
      let tableDump = await pokerService.getAllPokerDumpTableDataByQuery({});
      if (!tableDump) {
         return {
            status: false,
            message: "Poker dump not found",
         }
      }
      let tables = tableDump.map(tableDump => {
         return JSON.parse(tableDump.poker_data_dump);
      });
      return {
         status: true,
         message: "Poker dump fetched successfully",
         data: { tables }
      }
   } catch (error) {
      console.log("Error in get poker dump ", error);
      return {
         status: false,
         message: error.message
      }
   }
}
// for every room there are tables in gameTable Modal --> for every table there is table round once a table round compltetes marked that status as completed
//                                                    --> After marking a tableround completed will create a new table round with active status 
const getGames = async (req, res) => {
   let responseData = {};
   try {
      let game_category = await pokerService.getGameCategoryByQuery({
         type: "poker"
      });
      let games = await pokerService.getGamesByQuery({
         game_category_id: game_category.game_category_id,
         game_status: {
            [Op.or]: ['1', '2'],
            club_id: 0
         }
      });
      let game_type_by_id = {};
      games = games.map(async (game) => {
         if (game_type_by_id[game.game_type_id]) {
            game.game_type = game_type_by_id[game.game_type_id];
         } else {
            let game_type = await pokerService.getGameTypeModalDataByQuery({ game_type_id: game.game_type_id });
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

const deactivateTournament = async (deactivateReq) => {
   let game_id = deactivateReq.gameId;
   let game = await pokerService.getGameModalDataByQuery({ game_id });
   if (!game) {
      return {
         status: false,
         message: "Game not found"
      }
   }
   if (game.is_tournament == 1) {
      game.game_status = "2";
      await pokerService.updateGameByQuery({
         game_status: game.game_status
      }, {
         game_id: game.game_id
      });
   }
   return {
      status: true,
      message: "Game deactivated successfully"
   }
}
// return a list of tables of a room if found otherwise create a single table and return 
// gameId is same as id of game created by admin on clubowner 
const getTablesByGameId = async (req, res) => {
   let responseData = {};
   try {
      let game_id = req.params.game_id;
      let gameModalData = await pokerService.getGameModalDataByQuery({ game_id });
      let roomAttributes = gameModalData.game_json_data;
      let roomAttributesObj = JSON.parse(roomAttributes);
      let maxPlayers = roomAttributesObj.maximum_player;
      if (!gameModalData) {
         throw new Error("Game table not found");
      }
      // getting all tables of that particular room whose game_table_status are active 
      let game_tables = await pokerService.getGameTableModalDataByQuery({
         game_id,
         game_table_status: "Active"
      });
      // In case don't found any active table of room 
      if (game_tables.length === 0) {
         let tableData = {
            roomId: game_id,
            players: [],
            maxPlayers: maxPlayers,
            minPlayers: roomAttributesObj.minimum_player,
            minimum_buyin: roomAttributesObj.minimum_buyin,
            maximum_buyin: roomAttributesObj.maximum_buyin,
            smallBlind: roomAttributesObj.small_blind,
            bigBlind: roomAttributesObj.big_blind
         }
         let clubId = 0;
         // if it is a club room then set the club_id
         if (gameModalData.club_id && gameModalData.club_id != 0) {
            tableData.club_id = gameModalData.club_id;
            tableData.table_time = roomAttributesObj.table_time;
            clubId = gameModalData.club_id;
         }
         let pokerTableData = {
            game_id: game_id,
            table_name: roomAttributesObj.room_name,
            game_table_status: "Active",
            game_category: "Poker",
            club_id: clubId
         }
         //  if (clubId != 0) tableData.leftPlayers = [];
         console.log('pokerTableData', pokerTableData)
         // creating a table 
         let pokerTable = await pokerService.createGameTableModalData(pokerTableData);
         pokerTable = pokerTable.toJSON();
         pokerTable.tableTimeCounter = (roomAttributesObj.table_time) ? (roomAttributesObj.table_time * 60 * 60) : 0;
         console.log("pokerTable after creation ", pokerTable);
         // creatung a tableRond with active status --> tableRond will consist all the information abour table like how many players are there on table 
         let tableRoundData = {
            game_table_id: pokerTable.game_table_id,
            table_attributes: JSON.stringify(tableData),
            result_json: JSON.stringify({}),
            table_round_status: "Active",
         }
         await pokerService.createTableRoundModalData(tableRoundData);
         game_tables.push(pokerTable);
      }
      for (let i = 0; i < game_tables.length; i++) {
         let game_table = game_tables[i];
         // console.log("game_table ", game_table);
         // fetching table round of a particular game which is active 
         let tableRoundData = await pokerService.getTableRoundByQuery({
            game_table_id: game_table.game_table_id,
            table_round_status: "Active"
         });
         if (tableRoundData) {
            game_table.table_attributes = JSON.parse(tableRoundData.table_attributes);
         } else {
            game_table.table_attributes = {
               roomId: game_id,
               players: [],
               maxPlayers: maxPlayers,
               minPlayers: roomAttributesObj.minimum_player,
            }
            let tableData = {
               roomId: game_id,
               players: [],
               maxPlayers: maxPlayers,
               minPlayers: roomAttributesObj.minimum_player,
               minimum_buyin: roomAttributesObj.minimum_buyin,
               maximum_buyin: roomAttributesObj.maximum_buyin,
               smallBlind: roomAttributesObj.small_blind,
               bigBlind: roomAttributesObj.big_blind,
            }
            // if it is a club room then set the club_id
            if (gameModalData.club_id && gameModalData.club_id != 0) {
               tableData.club_id = gameModalData.club_id
            }

            tableRoundData = {
               game_table_id: game_table.game_table_id,
               table_attributes: JSON.stringify(tableData),
               result_json: JSON.stringify({}),
               table_round_status: "Active",
            }
            await pokerService.createTableRoundModalData(tableRoundData);
         }
         game_table.tableTimeCounter = (roomAttributes.table_time) ? (roomAttributes.table_time * 60 * 60) : 0;
         game_tables[i] = game_table;
      }
      responseData.msg = 'Game List';
      responseData.data = game_tables;
      return responseHelper.success(res, responseData);
   } catch (error) {
      console.log("Error in get tables by game id ", error);
      responseData.msg = error.message;
      return responseHelper.error(res, responseData, 500);
   }
}

const getBlindStructureByGameId = async (req, res) => {
   let responseData = {};
   try {
      let game = await pokerService.getGameModalDataByQuery({
         game_id: req.params.game_id
      });
      if (!game) {
         throw new Error("Game not found");
      }
      if (!game.game_blind_id) {
         throw new Error("Blind structure not found");
      }
      let game_blind_structure = await pokerService.getOneBlindStructureModalDataByQuery({
         blind_id: game.game_blind_id
      });
      if (game_blind_structure) {
         game_blind_structure = game_blind_structure.blind_structure_json_data;
      }
      let blindStructure = JSON.parse(game_blind_structure);
      responseData.msg = 'Blind Structure';
      responseData.data = blindStructure;
      return responseHelper.success(res, responseData);
   } catch (error) {
      console.log("Error in get blind structure by game id ", error);
      responseData.msg = error.message;
      return responseHelper.error(res, responseData, 500);
   }
}

const getPrizeDataByGameId = async (req, res) => {
   let responseData = {};
   try {
      let game = await pokerService.getGameModalDataByQuery({
         game_id: req.params.game_id
      });
      if (!game) {
         throw new Error("Game not found");
      }
      if (!game.game_prize_id) {
         throw new Error("Prize data not found");
      }
      let game_price_structure = await pokerService.getOnePriceStructureModalDataByQuery({
         price_id: game.game_prize_id
      });
      if (game_price_structure) {
         game_price_structure = game_price_structure.price_structure_json_data;
      }
      let prizeData = JSON.parse(game_price_structure);
      let placesPaid = prizeData.length;
      let resData = {
         placesPaid,
         prizeData
      }
      responseData.msg = 'Prize Data';
      responseData.data = resData;
      return responseHelper.success(res, responseData);
   } catch (error) {
      console.log("Error in get prize data by game id ", error);
      responseData.msg = error.message;
      return responseHelper.error(res, responseData, 500);
   }
}

const getPlayersByGameId = async (req, res) => {
   let responseData = {};
   try {
      let game_id = req.params.game_id;
      let game = await pokerService.getGameModalDataByQuery({
         game_id: game_id
      });
      if (!game) {
         throw new Error("Game not found");
      }
      let game_type = await pokerService.getGameTypeModalDataByQuery({
         game_type_id: game.game_type_id
      });
      if (!game_type) {
         throw new Error("Game type not found");
      }
      if (game_type.name.toLowerCase().includes("tournament")) {
         let roomAttributesObj = JSON.parse(game.game_json_data);
         let players = roomAttributesObj.players || [];
         let returnPlayers = [];
         for (let player of players) {
            let user = await userService.getUserDetailsById(player);
            returnPlayers.push({
               userId: user.user_id,
               userName: user.username,
               stack: roomAttributesObj.minimum_buyin,
            });
         }
         responseData.msg = 'Players';
         responseData.data = returnPlayers;
         return responseHelper.success(res, responseData);
      } else {
         let game_table_data = await db.game_table.findOne({
            where: {
               game_id: game_id,
               game_table_status: "Active"
            },
            include: [{
               model: db.table_round,
               as: 'table_round_table_id_fkey',
               where: {
                  table_round_status: "Active"
               },
            }]
         });
         if (!game_table_data) {
            throw new Error("Game table not found");
         }
         console.log(game_table_data);
         let table_round_data = game_table_data.table_round_table_id_fkey[0];
         let table_attributes = JSON.parse(table_round_data.table_attributes);
         let players = table_attributes.players;
         players = players.map(player => {
            return player;
         });
         responseData.msg = 'Players';
         responseData.data = players;
         return responseHelper.success(res, responseData);
      }
   } catch (error) {
      console.log("Error in get players by game id ", error);
      responseData.msg = error.message;
      return responseHelper.error(res, responseData, 500);
   }
}

const registerTournament = async (req, res) => {
   let responseData = {};
   try {
      let { game_id } = req.body;
      let user_id = req.user.user_id;
      let game = await pokerService.getGameModalDataByQuery({
         game_id: game_id
      });
      if (!game) {
         throw new Error("Game not found");
      }
      let game_type = await pokerService.getGameTypeModalDataByQuery({
         game_type_id: game.game_type_id
      });
      if (!game_type) {
         throw new Error("Game type not found");
      }
      if (!game_type.name.toLowerCase().includes("tournament")) {
         throw new Error("Game is not tournament");
      }
      let roomAttributesObj = JSON.parse(game.game_json_data);
      let maxPlayers = roomAttributesObj.maximum_player;
      let players = roomAttributesObj.players || [];
      if (players.length >= maxPlayers) {
         throw new Error("Table is full");
      }
      if (players.find(player => player === user_id)) {
         throw new Error("Player Already registered");
      }
      let currentDate = new Date();
      let registration_start_date = new Date(roomAttributesObj.registration_start_date);
      let registration_end_date = new Date(roomAttributesObj.registration_end_date);
      if (currentDate < registration_start_date) {
         throw new Error("Registration not started");
      }
      if (currentDate > registration_end_date) {
         throw new Error("Registration closed");
      }
      let response = await userController.deductJoinFees({
         user_id,
         deductBalance: roomAttributesObj.minimum_buyin,
         tableId: game_id,
         lockAmount: 0
      });
      if (!response.status) {
         throw new Error(response.msg);
      }
      players.push(user_id);
      roomAttributesObj.players = players;
      let updateData = {
         game_json_data: JSON.stringify(roomAttributesObj)
      }
      let updateGame = await pokerService.updateGameByQuery(updateData, {
         game_id: game_id
      });
      await (await getRedisClient()).del("ROOM");
      return responseHelper.success(res, responseData);
   } catch (error) {
      console.log("Error in register tournament ", error);
      responseData.msg = error.message;
      return responseHelper.error(res, responseData, 500);
   }
}

const deregisterTournament = async (req, res) => {
   let responseData = {};
   try {
      let { game_id } = req.body;
      let user_id = req.user.user_id;
      let game = await pokerService.getGameModalDataByQuery({
         game_id: game_id
      });
      if (!game) {
         throw new Error("Game not found");
      }
      let game_type = await pokerService.getGameTypeModalDataByQuery({
         game_type_id: game.game_type_id
      });
      if (!game_type) {
         throw new Error("Game type not found");
      }
      if (!game_type.name.toLowerCase().includes("tournament")) {
         throw new Error("Game is not tournament");
      }
      let roomAttributesObj = JSON.parse(game.game_json_data);
      let maxPlayers = roomAttributesObj.maximum_player;
      let players = roomAttributesObj.players || [];
      let currentDate = new Date();
      let registration_start_date = new Date(roomAttributesObj.registration_start_date);
      let registration_end_date = new Date(roomAttributesObj.registration_end_date);
      if (currentDate < registration_start_date) {
         throw new Error("Registration not started");
      }
      if (currentDate > registration_end_date) {
         throw new Error("Registration closed");
      }
      let response = await userController.returnDeductedBalance({
         user_id,
         deductBalance: roomAttributesObj.minimum_buyin,
         tableId: game_id,
         lockAmount: 0
      });
      if (!response.status) {
         throw new Error(response.msg);
      }
      players = players.filter(player => player !== user_id);
      roomAttributesObj.players = players;
      let updateData = {
         game_json_data: JSON.stringify(roomAttributesObj)
      }
      let updateGame = await pokerService.updateGameByQuery(updateData, {
         game_id: game_id
      });
      return responseHelper.success(res, responseData);
   } catch (error) {
      console.log("Error in register tournament ", error);
      responseData.msg = error.message;
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

      const getUserTotalBets = (userId) => {
         let bet = 0;
         tableRound.hand_histories.forEach(handHistory => {
            if (handHistory && handHistory.userBetRecords) {
               handHistory.userBetRecords.forEach(userBetRecord => {
                  if (userBetRecord && userBetRecord.userId && userBetRecord.userId == userId) {
                     bet += parseInt(userBetRecord.betAmount)
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
            player.chips = (winnerSet.has("" + player.userId)) ? getUserTotalBets(player.userId) : 0 - getUserTotalBets(player.userId); // initially it was player.chips - playerFromTableRound.stack;
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

const getBuyInByTableId = async (req, res) => {
   let responseData = {};
   try {
      let table_id = req.params.table_id;
      let pokerTable = await pokerService.getOneGameTableModalDataByQuery({
         game_table_id: table_id,
      });
      if (!pokerTable) {
         throw new Error("Table not found");
      }
      let gameModal = await pokerService.getGameModalDataByQuery({
         game_id: pokerTable.game_id,
      });
      if (!gameModal) {
         throw new Error("Game not found");
      }
      let roomAttributes = gameModal.game_json_data;
      let roomAttributesObj = JSON.parse(roomAttributes);
      let obj = {
         minimum_buyin: roomAttributesObj.minimum_buyin,
         maximum_buyin: roomAttributesObj.maximum_buyin,
         small_blind: roomAttributesObj.small_blind,
         big_blind: roomAttributesObj.big_blind,
      }
      responseData.msg = 'Buy in';
      responseData.data = obj;
      return responseHelper.success(res, responseData);
   } catch (error) {
      console.log("Error in get hand history by table id ", error);
      responseData.msg = error.message;
      return responseHelper.error(res, responseData, 500);
   }
}

const getLeaderboardByTableId = async (req, res) => {
   let responseData = {};
   try {
      let table_id = req.params.table_id;
      let gameHistories = await userService.getGameHistory({
         table_id: { [Op.like]: `${table_id}#%` }
      });
      if (gameHistories && gameHistories.length > 0) {
         let winAmountByUserId = new Map();
         gameHistories.forEach(gameHistory => {
            if (gameHistory.is_win === '1') {
               if (winAmountByUserId.has(gameHistory.user_id)) {
                  winAmountByUserId.set(gameHistory.user_id
                     , parseFloat(winAmountByUserId.get(gameHistory.user_id)) + parseFloat(gameHistory.win_amount));
               } else {
                  winAmountByUserId.set(gameHistory.user_id, parseFloat(gameHistory.win_amount));
               }
            }
         });
         let sortedWinAmountByUserId = new Map([...winAmountByUserId.entries()]
            .sort((a, b) => b[1] - a[1]));
         let leaderboard = [];
         let i = 0;
         for (let [key, value] of sortedWinAmountByUserId) {
            let user = await userService.getUserDetailsById({ user_id: key });
            leaderboard.push({
               user_id: user.user_id,
               user_name: user.username,
               win_amount: value,
               rank: ++i,
            });
            if (i === 8) {
               break;
            }
         }
         responseData.msg = 'leaderboard';
         responseData.data = leaderboard;
         return responseHelper.success(res, responseData);
      } else {
         throw new Error("No game history found");
      }
   } catch (error) {
      console.log("Error in get leaderboard by table id ", error);
      responseData.msg = error.message;
      return responseHelper.error(res, responseData, 500);
   }
}

const getGameResultByTableId = async (req, res) => {
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
      let data = await lockedBalanceHistories.map(async lockedBalanceHistory => {
         let user = await userService
            .getUserDetailsById({ user_id: lockedBalanceHistory.user_id });
         return {
            user_id: lockedBalanceHistory.user_id,
            buy_in: lockedBalanceHistory.buy_in_amount,
            winnings: lockedBalanceHistory.locked_amount
               - lockedBalanceHistory.buy_in_amount,
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
      responseData.data = { sessionStats, result };
      return responseHelper.success(res, responseData);
   } catch (error) {
      console.log("Error in get game result by table id ", error);
      responseData.msg = error.message;
      return responseHelper.error(res, responseData, 500);
   }
}


const getUserPokerProfile = async (req, res) => {
   let responseData = {};
   try {
      let user = req.user;
      let userIdExternal = req.query.user_id;
      if (!userIdExternal) {
         userIdExternal = user.user.user_id;
      }
      let userPokerStats = await pokerService.getPokerUserStatsDataByQuery({
         user_id: userIdExternal,
      });
      let stats = {};
      let userProfile = {};
      if (userPokerStats) {
         let handsPlayed = userPokerStats.hands_played;
         stats.hands_played = userPokerStats.hands_played;
         stats.bet_preflop_count = (userPokerStats.bet_preflop_count / handsPlayed) * 100;
         stats.preflop_raise_count = (userPokerStats.preflop_raise_count / handsPlayed) * 100;
         stats.third_bet_preflop_count = (userPokerStats.third_bet_preflop_count / handsPlayed) * 100;
         stats.fold_on_3bet_preflop_count = (userPokerStats.fold_on_3bet_preflop_count / handsPlayed) * 100;
         stats.continuation_bet_count = (userPokerStats.continuation_bet_count / handsPlayed) * 100;
         stats.fold_on_continuation_bet_count = (userPokerStats.fold_on_continuation_bet_count / handsPlayed) * 100;
         stats.raise_at_last_position_on_table_count = (userPokerStats.raise_at_last_position_on_table_count / handsPlayed) * 100;
         stats.check_raise_flop_count = (userPokerStats.check_raise_flop_count / handsPlayed) * 100;
         stats.showdown_count_after_flop = (userPokerStats.showdown_count_after_flop / handsPlayed) * 100;
         stats.won_at_showdown_count = (userPokerStats.won_at_showdown_count / handsPlayed) * 100;
      }
      userProfile.name = user.display_name;
      userProfile.profile_image = user.profile_image;
      userProfile.device_type = user.device_type;
      userProfile.stats = stats;
      userProfile.city = null;
      responseData.msg = 'user poker profile';
      responseData.data = userProfile;
      return responseHelper.success(res, responseData);
   } catch (error) {
      console.log("Error in get user poker profile ", error);
      responseData.msg = error.message;
      return responseHelper.error(res, responseData, 500);
   }
}

const getPrivateTable = async (req, res) => {
   let responseData = {};
   try {
      let resObj = {
         max_player: 2,
         stack: {
            min: 0.5,
            max: 1
         },
         min_buy_in: 10,
         max_buy_in: 50
      }
      responseData.msg = 'Private table data';
      responseData.data = resObj;
      return responseHelper.success(res, responseData);
   } catch (error) {
      responseData.msg = error.message;
      return responseHelper.error(res, responseData, 500);
   }
}

// To create table if someone joins as , join as viewer and table is not there in redis then need to get or create table from db and need to save in redis 
const getOrCreateTableForJoinViewer = async (joinTableDataRequest) => {
   try {
      if (!joinTableDataRequest.userId) {
         throw new Error("User id is required");
      }
      let userData = await userService.getUserDetailsById({ user_id: joinTableDataRequest.userId });
      if (!userData) {
         throw new Error("User not found");
      }
      // to get table by tableId
      let pokerTable = await pokerService.getOneGameTableModalDataByQuery({
         game_table_id: joinTableDataRequest.tableId
      });
      if (!pokerTable) {
         throw new Error("Table not found");
      }
      let gameModalData = await pokerService.getGameModalDataByQuery({ game_id: pokerTable.game_id });
      let clubId = 0;
      // if it is a club room then set the club_id
      if (gameModalData.club_id && gameModalData.club_id != 0) {
         clubId = gameModalData.club_id
      }
      let gameType = await getGameTypeModalDataByQuery({
         game_type_id: gameModalData.game_type_id
      });
      if (gameType.name == "SIT N GO TEXAS" || gameType.name == "SIT N GO PLO 4" || gameType.name == "SIT N GO PLO 5" || gameType.name == "SIT N GO PLO 5" || gameType.name == "SIT N GO PLO 6") {
         throw new Error("CANNOT CREATE JOIN AS VIEWER TABLE FOR SNG ")
      }
      let game_type_name = gameType.name;
      let roomAttributes = gameModalData.game_json_data;
      let roomAttributesObj = JSON.parse(roomAttributes);
      let maxPlayers = roomAttributesObj.maximum_player;
      let tableRoundData = await pokerService.getTableRoundByQuery({
         game_table_id: joinTableDataRequest.tableId,
         table_round_status: "Active"
      });
      let table_attributes = JSON.parse(tableRoundData.table_attributes);
      // if table is not active then create a new table and table round and return response along with new tableId
      if (pokerTable.game_table_status !== "Active") {
         //TODO : check for tableRoundData being null no active table founds 
         let tableData = {
            roomId: table_attributes.roomId,
            players: [],
            // leftPlayers: [],
            maxPlayers: table_attributes.maxPlayers,
            minPlayers: table_attributes.minPlayers,
            minimum_buyin: table_attributes.minimum_buyin,
            maximum_buyin: table_attributes.maximum_buyin,
            smallBlind: table_attributes.small_blind,
            bigBlind: table_attributes.big_blind,
         }
         let pokerTableData = {
            game_id: pokerTable.game_id,
            table_name: pokerTable.table_name,
            game_table_status: "Active",
            game_category: "Poker",
            club_id: clubId
         }
         pokerTable = await pokerService.createGameTableModalData(pokerTableData);
         pokerTable = pokerTable.toJSON();
         let tableRoundData = {
            game_table_id: pokerTable.game_table_id,
            table_attributes: JSON.stringify(tableData),
            result_json: JSON.stringify({}),
            table_round_status: "Active",
         }
         await pokerService.createTableRoundModalData(tableRoundData);
         return {
            status: true,
            message: "Table created successfully",
            tableId: pokerTable.game_table_id,
            roomId: gameModalData.game_id,
            gameType: gameType.name
         }
      } else {
         // in case not tableRound data found with active status then also create new one with same game_table_id
         if (!tableRoundData) {
            tableRoundData = {
               game_table_id: pokerTable.game_table_id,
               table_attributes: JSON.stringify({
                  roomId: joinTableDataRequest.tableId,
                  players: [],
                  //  leftPlayers: [],
                  maxPlayers: maxPlayers,
                  minPlayers: roomAttributesObj.minimum_player
               }),
               result_json: JSON.stringify({}),
               table_round_status: "Active",
            }
         }
         let tableAttributes = tableRoundData.table_attributes;
         let tableAttributesObj = JSON.parse(tableAttributes);
         tableRoundData.table_attributes = JSON.stringify(tableAttributesObj);
         await pokerService.updateTableRoundModalDataByQuery({
            table_attributes: tableRoundData.table_attributes,
         }, {
            table_round_id: tableRoundData.table_round_id
         });
         return {
            status: true,
            message: "Table joined successfully",
            tableId: tableRoundData.game_table_id,
            roomId: pokerTable.game_id,
            gameType: gameType.name
         }
      }
   } catch (error) {
      console.log("Error in lock balance of user ", error);
      return {
         status: false,
         message: error.message
      }
   }
}

// const saveCommisionRecords = async (request) => {
//    if (!request.tableId) throw new Error("Table id is required");

//    let tableRoundData = await pokerService.getTableRoundByQuery({
//       game_table_id: request.tableId,
//       table_round_status: "Active"
//    });

//    if (!tableRoundData) throw new Error("Table round not found");
//    const adminDetails = await geAdminDetailsById({ admin_id: 1 });

//    if ((await storeCommisionRecords(request, tableRoundData, null, null, adminDetails))) {
//       return {
//          message: "Commision added to Admin Account!"
//       }
//    } else {
//       for (let count = 5; count > 0; count--) {
//          const resp = await storeCommisionRecords(request, tableRoundData, null, null, adminDetails)
//          if (resp.status) return { message: "Commision added to admin Account!" }
//          else if (count === 1) {
//             await (await getRedisClient()).hSet("FAILED-COMMISSION-TRNS", JSON.stringify(request));
//             return {
//                message: error.message
//             }
//          }
//       }
//    }
// }

const saveCommisionRecords = async (request) => {
   try {
      console.log("from saveCommisionRecords -->", request);

      if (!request.tableId) throw new Error("Table ID is required");
      if (!request.tableTotalCalculatedCommision) throw new Error("Commission amount is required");

      // Fetch active table round
      let tableRoundData = await pokerService.getTableRoundByQuery({
         game_table_id: request.tableId,
         table_round_status: "Active"
      });

      if (!tableRoundData) throw new Error("Table round not found");

      // Parse commisionedPlayer JSON safely
      let commisionedPlayerData;
      try {
         commisionedPlayerData = JSON.parse(request.commisionedPlayer);
      } catch (err) {
         throw new Error("Invalid JSON format in commisionedPlayer");
      }

      // Extract the first commissioned player ID
      let firstPlayerKey = Object.keys(commisionedPlayerData)[0]; // Example: "32_"
      let commisionedPlayerId = firstPlayerKey.replace("_", ""); // Removes underscore -> "32"
      let handCommission = commisionedPlayerData[firstPlayerKey]?.fee || 0;
      console.log("handCommission--->",handCommission);



      let data = {
         game_table_id: request.tableId,
         commision_amount: handCommission? parseFloat(handCommission):0,
         commisioned_player: commisionedPlayerId,
      };

      // Save to database
      await pokerService.saveTableCommission(data);

      // Extract winAmount for the commissioned player
      let winAmount = commisionedPlayerData[firstPlayerKey]?.winAmount || 0;
      // let handCommission = commisionedPlayerData[firstPlayerKey]?.fee || 0;

      let transactionData = {
         user_id: commisionedPlayerId,
         table_id: request.tableId,
         type: "CR",
         other_type: "Table Commision",
         category: "Poker",
         reference: tableRoundData.table_round_id,
         commission: handCommission? parseFloat(handCommission):0,
         amount: winAmount ? parseFloat(winAmount) : 0, // Uses correct winAmount for the player
         is_admin_detail:1
      };

      await userService.createTransaction(transactionData);

      console.log("Commission record saved successfully");
      return true;

   } catch (error) {
      console.error("Error in saveCommisionRecords:", error.message);
      return false;
   }
};

const saveCommisionRecordsForClub = async (request) => {
   if (!request.tableId) throw new Error("Table id is required");
   if (!request.club_id) throw new Error("Club id is required");

   let tableRoundData = await pokerService.getTableRoundByQuery({
      game_table_id: request.tableId,
      table_round_status: "Active"
   });

   if (!tableRoundData) throw new Error("Table round not found");
   let clubAdmin = await getClubByUserId({ clubId: request.club_id, is_club_admin: "1" });
   if (!clubAdmin) throw new Error("Club admin not found!");
   if (parseInt(request.clubOwnerId) !== parseInt(clubAdmin[0].user_id)) throw new Error(`Club admin id is invalid! ${request.clubOwnerId}, ${clubAdmin[0].user_id}`);
   let userWallet = await userService.getUserWalletDetailsByQuery({ user_id: request.clubOwnerId });

   if ((await storeCommisionRecords(request, tableRoundData, userWallet, clubAdmin))) {
      return {
         message: "Commision added to wallet!"
      }
   } else {
      for (let count = 5; count > 0; count--) {
         const resp = await storeCommisionRecords(request, tableRoundData, userWallet, clubAdmin)
         if (resp.status) return { message: "Commision added to wallet!" }
         else if (count === 1) {
            await (await getRedisClient()).hSet("FAILED-COMMISSION-TRNS", JSON.stringify(request));
            return {
               message: error.message
            }
         }
      }
   }
}

async function storeCommisionRecords(request, tableRoundData, userWallet, clubAdmin, adminDetails = undefined) {
   const transaction = await sequelize.transaction();  // creating transaction for commit and rollback
   try {
      if (adminDetails) {
         await createTableCommisionRecord({
            table_round_id: tableRoundData.table_round_id,
            game_table_id: request.tableId,
            commision_amount: request.tableTotalCalculatedCommision,
            createdAt: new Date(),
            updatedAt: new Date()
         }, { transaction });
   
         console.log(adminDetails, "admin Details")
         if (Object.keys(JSON.parse(request.commisionedPlayer)).length) {
            let insertArr = []
            for (const [user_id, fee] of Object.entries(JSON.parse(request.commisionedPlayer))) {
               insertArr.push({
                  user_id: parseInt(user_id.split('_')[0]),
                  table_id: request.tableId,
                  type: "DR",
                  other_type: "Table Commision",
                  reference: tableRoundData.table_round_id,
                  amount: parseFloat(fee.toFixed(2))
               })
            }
            if (insertArr.length) await userService.createTransaction(insertArr, { transaction });
         }
   
         // creating new transaction
         await userService.createTransaction({
            user_id: adminDetails.admin_id,
            table_id: request.tableId,
            type: "CR",
            other_type: "Admin Table Commision",
            reference: tableRoundData.table_round_id,
            amount: parseFloat(request.tableTotalCalculatedCommision),
            opening_balance: parseFloat(adminDetails.commission),
            closing_balance: parseFloat(adminDetails.commission - 0 + request.tableTotalCalculatedCommision),
         }, { transaction });
   
         // updating user wallet
         await updateAdminByQuery({
            commision: parseFloat(adminDetails.commission - 0 + request.tableTotalCalculatedCommision)
         }, { admin_id: adminDetails.admin_id }, transaction);   
      } else {
         await createTableCommisionRecord({
            table_round_id: tableRoundData.table_round_id,
            game_table_id: request.tableId,
            commision_amount: request.tableTotalCalculatedCommision,
            createdAt: new Date(),
            updatedAt: new Date()
         }, { transaction });
   
         if (Object.keys(JSON.parse(request.commisionedPlayer)).length) {
            let insertArr = []
            for (const [user_id, fee] of Object.entries(JSON.parse(request.commisionedPlayer))) {
               insertArr.push({
                  user_id: parseInt(user_id.split('_')[0]),
                  table_id: request.tableId,
                  type: "DR",
                  other_type: "Table Commision",
                  reference: tableRoundData.table_round_id,
                  amount: parseFloat(fee)
               })
            }
            if (insertArr.length) await userService.createTransaction(insertArr, { transaction });
         }
   
         // creating new transaction
         await userService.createTransaction({
            user_id: request.clubOwnerId,
            table_id: request.tableId,
            type: "CR",
            other_type: "Table Commision",
            reference: tableRoundData.table_round_id,
            amount: parseFloat(request.tableTotalCalculatedCommision),
            opening_balance: parseFloat(userWallet.commision_amount),
            closing_balance: parseFloat(userWallet.commision_amount - 0 + request.tableTotalCalculatedCommision),
         }, { transaction });
   
         // updating user wallet
         await userService.updateUserWallet({
            commision_amount: parseFloat(userWallet.commision_amount - 0 + request.tableTotalCalculatedCommision)
         }, { user_wallet_id: userWallet.user_wallet_id }, transaction);
   
         // updating club admin amount in club
         await updateMember({
            amount: (parseFloat(clubAdmin[0].amount) - 0 + request.tableTotalCalculatedCommision).toFixed(2)
         }, { where: { user_id: request.clubOwnerId, clubId: request.club_id }, transaction })
      }

      await transaction.commit();
      return true
   } catch (error) {
      console.log("Error in saving table commision result ", error);
      if (transaction) {
         await transaction.rollback();
      }
      return false
   }
}

const savePokerResultForClub = async (pokerResultRequest) => {
   try {
      if (!pokerResultRequest.tableId) {
         throw new Error("Table id is required");
      }
      let pokerTable = await pokerService.getOneGameTableModalDataByQuery({
         game_table_id: pokerResultRequest.tableId
      });

      if (!pokerTable) {
         throw new Error("Table not found");
      }
      let pokerRoom = await pokerService.getGameModalDataByQuery({
         game_id: pokerTable.game_id
      });
      let gameType = await getGameTypeModalDataByQuery({
         game_type_id: pokerRoom.game_type_id
      });
      let tableRoundData = await pokerService.getTableRoundByQuery({
         game_table_id: pokerResultRequest.tableId,
         table_round_status: "Active"
      });
      if (!tableRoundData) {
         throw new Error("Table round not found");
      }
      let roomAttributes = pokerRoom.game_json_data;
      let roomAttributesObj = JSON.parse(roomAttributes);
      let clubId = (pokerRoom.club_id) ? pokerRoom.club_id : 0;
      let new_table_attributes = JSON.parse(tableRoundData.table_attributes);
      let old_table_attributes = JSON.parse(tableRoundData.table_attributes);
      old_table_attributes.players = old_table_attributes.players.map(async player => {
         let playerFromResult = pokerResultRequest.playerCardsAndChips
            .find(player1 => player1.userId === player.userId);
         if (playerFromResult) {
            return player;
         }
         if (clubId != 0) {
            console.log('clubId-->', clubId)
            console.log("savePokerResultForClub--> unlocking balance for user club ");
            await unlockBalanceOfUserForClub({
               user_id: player.userId,
               amount: player.stack,
               tableId: pokerResultRequest.tableId,
               gameType: gameType.name,
               clubId: clubId
            });
         } else {
            console.log('clubId1', clubId)
            await unlockBalanceOfUser({
               user_id: player.userId,
               amount: player.stack,
               tableId: pokerResultRequest.tableId,
               gameType: gameType.name
            });
         }

         return null;
      }).filter(player => player);
      new_table_attributes.players = new_table_attributes.players.map(player => {
         let playerFromResult = pokerResultRequest.playerCardsAndChips
            .find(player1 => player1.userId === player.userId);
         if (playerFromResult) {
            player.stack = playerFromResult.chips;
            return player;
         }
         return null;
      }).filter(player => player);
      new_table_attributes.smallBlind = (roomAttributesObj.smallBlind !== undefined) ? roomAttributesObj.small_blind : 0;
      new_table_attributes.bigBlind = (roomAttributesObj.bigBlind !== undefined) ? roomAttributesObj.big_blind : 0;
      new_table_attributes.selected_big_blind = (roomAttributesObj.selected_big_blind !== undefined) ? roomAttributesObj.selected_big_blind : 0;
      new_table_attributes.selected_small_blind = (roomAttributesObj.selected_small_blind !== undefined) ? roomAttributesObj.selected_small_blind : 0;
      new_table_attributes.selected_maximum_player = (roomAttributesObj.selected_maximum_player !== undefined) ? roomAttributesObj.selected_maximum_player : 0;
      new_table_attributes.selected_buyin = (roomAttributesObj.selected_buyin !== undefined) ? roomAttributesObj.selected_buyin : 0;
      let newTableRoundData = {
         game_table_id: tableRoundData.game_table_id,
         table_attributes: JSON.stringify(new_table_attributes),
         table_round_status: "Active",
      };
      let resultJson = {
         winners: pokerResultRequest.winners,
         pots: pokerResultRequest.pots,
         players: pokerResultRequest.playerCardsAndChips,
         communityCards: pokerResultRequest.communityCards,
         communityExtraCards: pokerResultRequest.communityExtraCards ?? [],
         communityExtraExtraCards: pokerResultRequest.communityExtraExtraCards ?? []
      }
      tableRoundData.result_json = JSON.stringify(resultJson);
      tableRoundData.hand_histories = JSON.stringify(pokerResultRequest.handHistories);
      tableRoundData.table_round_status = "Completed";
      await pokerService.updateTableRoundModalDataByQuery({
         result_json: tableRoundData.result_json,
         table_round_status: tableRoundData.table_round_status,
         hand_histories: tableRoundData.hand_histories
      }, {
         table_round_id: tableRoundData.table_round_id
      });
      pokerTable.game_table_status = "Active";
      await pokerService.updateGameTableModalDataByQuery({
         game_table_status: pokerTable.game_table_status
      }, {
         game_table_id: pokerTable.game_table_id
      });
      await pokerService.createTableRoundModalData(newTableRoundData);
      let winnerSet = new Set();
      pokerResultRequest.winners.forEach(winner => {
         winnerSet.add(winner);
      });
      let handHistories = pokerResultRequest.handHistories;
      for (let player of pokerResultRequest.playerCardsAndChips) {
         let winAmount = 0;
         let isSb = false;
         let isBb = false;
         let isBetPreFlop = false;
         let isRaisePreFlop = false;
         let isThirdBet = false;
         let isFoldAfterThirdBet = false; //TODO
         let isContinueBet = false;
         let isFoldAfterContinueBet = false; //TODO
         let isRaiseAtLastPosition = false;
         let isCheckAndThenRaise = false;
         let isPotOpenedPreFlop = false;
         let isCheckInFlop = false;

         let isRaiseByOtherPlayerAlready = false;

         let handHistory = {
            doesSeeFlop: player.doesSeeFlop,
            doesReachShowdown: player.doesReachShowdown
         };
         handHistory.hand = handHistories.map(handHistory => {
            let userBetRecords = handHistory.userBetRecords.map(userBetRecord => {
               if (userBetRecord.userId === player.userId) {
                  if (userBetRecord.action === "sb") {
                     isSb = true;
                  }
                  if (userBetRecord.action === "bb") {
                     isBb = true;
                  }
                  if (handHistory.bettingRound === "pre-flop" && (userBetRecord.action === "bet"
                     || userBetRecord.action === "call" || userBetRecord.action === "raise"
                     || userBetRecord.action === "all-in")) {
                     isBetPreFlop = true;
                  }
                  if (handHistory.bettingRound === "pre-flop" && userBetRecord.action === "raise") {
                     isRaisePreFlop = true;
                     if (isRaiseByOtherPlayerAlready) {
                        isThirdBet = true;
                     }
                  }
                  if (handHistory.bettingRound === "flop" && isRaisePreFlop && (userBetRecord.action === "bet"
                     || userBetRecord.action === "call" || userBetRecord.action === "raise"
                     || userBetRecord.action === "all-in")) {
                     isContinueBet = true;
                  }
                  if (handHistory.bettingRound === "flop" && userBetRecord.action === "check") {
                     isCheckInFlop = true;
                  }
                  if (handHistory.bettingRound === "flop" && userBetRecord.action === "raise" && isCheckInFlop) {
                     isCheckAndThenRaise = true;
                  }
                  if (handHistory.bettingRound === "pre-flop" && (player.playerPosition === "SB" || player.playerPosition === "CO"
                     || player.playerPosition === "BTN") && userBetRecord.action === "raise" && !isPotOpenedPreFlop) {
                     isRaiseAtLastPosition = true;
                  }
                  return userBetRecord;
               } else {
                  if (handHistory.bettingRound === "pre-flop" && userBetRecord.action === "raise") {
                     isRaiseByOtherPlayerAlready = true;
                  }
                  if (handHistory.bettingRound === "pre-flop" && (userBetRecord.action === "bet"
                     || userBetRecord.action === "call" || userBetRecord.action === "raise"
                     || userBetRecord.action === "all-in")) {
                     isPotOpenedPreFlop = true;
                  }
               }
            }).filter(userBetRecord => userBetRecord);
            return {
               userBetRecords,
               bettingRound: handHistory.bettingRound
            }
         });

         pokerResultRequest.pots.forEach(pot => {
            if (pot.winners.find(winner => winner === player.userId)) {
               winAmount += parseFloat("" + (parseFloat("" + pot.amount)
                  / parseFloat("" + pot.winners.length)));
            }
         });
         let totalBetAmount = 0;
         player.bets.forEach(bet => {
            totalBetAmount += parseFloat(bet);
         });
         if (winAmount > 0) {
            winAmount -= totalBetAmount;
         }
         let other_information = {
            bets: player.bets,
            folded: player.folded,
            allIn: player.allIn,
         }
         let blind = new_table_attributes.smallBlind + "/" + new_table_attributes.bigBlind;
         let game_history = {
            user_id: player.userId,
            table_id: pokerTable.game_table_id + "#" + tableRoundData.table_round_id,
            table_name: pokerTable.table_name,
            community_card: JSON.stringify(pokerResultRequest.communityCards),
            hands_record: JSON.stringify(player.cards),
            bet_amount: totalBetAmount,
            is_win: winnerSet.has(player.userId) ? '1' : '0',
            win_amount: winAmount,
            other_information: JSON.stringify(other_information),
            game_category: 2,
            game_type: pokerRoom.game_type_id,
            hand_history: JSON.stringify(handHistory),
            blind
         }
         console.log("---------coming pokerResultRequest -------", pokerResultRequest);
         await userService.saveGameHistory(game_history);

         let userSessionStats = await pokerService.getPokerSessionStatsDataByQuery({
            user_id: player.userId
         });
         if (userSessionStats) {
            userSessionStats.hands_played += 1;
            userSessionStats.flops_seen += (player.doesSeeFlop ? 1 : 0);
            userSessionStats.hands_won += (winnerSet.has(player.userId) ? 1 : 0);
            userSessionStats.showdown_count += (player.doesReachShowdown ? 1 : 0);
            userSessionStats.sb_count += (isSb ? 1 : 0);
            userSessionStats.bb_count += (isBb ? 1 : 0);

            await pokerService.updatePokerSessionStatsDataByQuery({
               hands_played: userSessionStats.hands_played,
               flops_seen: userSessionStats.flops_seen,
               hands_won: userSessionStats.hands_won,
               showdown_count: userSessionStats.showdown_count,
               sb_count: userSessionStats.sb_count,
               bb_count: userSessionStats.bb_count,
            }, {
               user_id: player.userId
            });
         } else {
            userSessionStats = {
               user_id: player.userId,
               hands_played: 1,
               flops_seen: handHistory.doesSeeFlop ? 1 : 0,
               hands_won: winnerSet.has(player.userId) ? 1 : 0,
               showdown_count: handHistory.doesReachShowdown ? 1 : 0,
               sb_count: isSb ? 1 : 0,
               bb_count: isBb ? 1 : 0,
            }
            await pokerService.createPokerSessionStatsData(userSessionStats);
         }
         let pokerUserStats = await pokerService.getPokerUserStatsDataByQuery({
            user_id: player.userId
         });
         if (pokerUserStats) {
            pokerUserStats.hands_played += 1;
            pokerUserStats.bet_preflop_count += (isBetPreFlop ? 1 : 0);
            pokerUserStats.preflop_raise_count += (isRaisePreFlop ? 1 : 0);
            pokerUserStats.third_bet_preflop_count += (isThirdBet ? 1 : 0);
            pokerUserStats.continuation_bet_count += (isContinueBet ? 1 : 0);
            pokerUserStats.raise_at_last_position_on_table_count += (isRaiseAtLastPosition ? 1 : 0);
            pokerUserStats.check_raise_flop_count += (isCheckAndThenRaise ? 1 : 0);
            pokerUserStats.showdown_count_after_flop += ((handHistory.doesSeeFlop && handHistory.doesReachShowdown)
               ? 1 : 0);
            pokerUserStats.won_at_showdown_count += ((handHistory.doesReachShowdown && winnerSet.has(player.userId))
               ? 1 : 0);
            await pokerService.updatePokerUserStatsDataByQuery({
               hands_played: pokerUserStats.hands_played,
               bet_preflop_count: pokerUserStats.bet_preflop_count,
               preflop_raise_count: pokerUserStats.preflop_raise_count,
               third_bet_preflop_count: pokerUserStats.third_bet_preflop_count,
               continuation_bet_count: pokerUserStats.continuation_bet_count,
               fold_on_3bet_preflop_count: 0,
               fold_on_continuation_bet_count: 0,
               raise_at_last_position_on_table_count: pokerUserStats.raise_at_last_position_on_table_count,
               check_raise_flop_count: pokerUserStats.check_raise_flop_count,
               showdown_count_after_flop: pokerUserStats.showdown_count_after_flop,
               won_at_showdown_count: pokerUserStats.won_at_showdown_count,
            }, {
               user_id: player.userId
            });
         } else {
            pokerUserStats = {
               user_id: player.userId,
               hands_played: 1,
               bet_preflop_count: isBetPreFlop ? 1 : 0,
               preflop_raise_count: isRaisePreFlop ? 1 : 0,
               third_bet_preflop_count: isThirdBet ? 1 : 0,
               continuation_bet_count: isContinueBet ? 1 : 0,
               raise_at_last_position_on_table_count: isRaiseAtLastPosition ? 1 : 0,
               check_raise_flop_count: isCheckAndThenRaise ? 1 : 0,
               showdown_count_after_flop: (handHistory.doesSeeFlop && handHistory.doesReachShowdown) ? 1 : 0,
               won_at_showdown_count: (handHistory.doesReachShowdown && winnerSet.has(player.userId)) ? 1 : 0,
            };
            await pokerService.createPokerUserStatsData(pokerUserStats);
         }
      }
      return {
         status: true,
         message: "Result saved successfully",
         isRoomDisabledOrDeleted: (pokerRoom.game_status === '0' || pokerRoom.game_status === '3') // sending response that is room is disabledordeleted
      }
   } catch (error) {
      console.log("Error in save poker result ", error);
      return {
         status: false,
         message: error.message
      }
   }
}

const isRoomDisabledOrDeleted = async (pokerResultRequest) =>{
  try {
   if (!pokerResultRequest.tableId) {
      throw new Error("Table id is required");
   }
   let pokerTable = await pokerService.getOneGameTableModalDataByQuery({
      game_table_id: pokerResultRequest.tableId
   });

   if (!pokerTable) {
      throw new Error("Table not found");
   }
   let pokerRoom = await pokerService.getGameModalDataByQuery({
      game_id: pokerTable.game_id
   });
   return {
      status: true,
      message: "Success",
      isRoomDisabledOrDeleted: (pokerRoom.game_status === '0' || pokerRoom.game_status === '3') // sending response that is room is disabledordeleted
   }
  } catch (error) {
   console.log("Error in save poker result ", error);
   return {
      status: false,
      message: error.message
   }
  }
}
// authorized to buyIn club controllers 
const getBuyInRequestStatus = async (getBuyInRequest) => {
   try {
      let userId = getBuyInRequest.userId;
      let clubId = getBuyInRequest.club_id;
      let tableId = getBuyInRequest.table_id;
      let res = await pokerService.getBuyInRequestInfo({ user_id: userId, club_id: clubId, table_id: tableId });
      if (res == null) return {
         status: "Not Found",
         message: "Success"
      }
      return {
         status: res.request_status,
         message: "Success"
      }
   } catch (error) {
      console.error("Error in getBuyInRequestStatus ", error);
      return {
         message: error.message
      }
   }
}

const findAllBuyInRequest = async (allBuyInRequest) => {
   try {
      let clubOwnerId = allBuyInRequest.club_owner_id;
      let clubId = allBuyInRequest.club_id;
      let tableId = allBuyInRequest.table_id;
      let res = await pokerService.getAllBuyInRequest({ club_owner_id: clubOwnerId, club_id: clubId, table_id: tableId, request_status: 'Pending' });
      console.log("res of findAllBuyInRequest =======>", res);

      return {
         json_data: JSON.stringify(res),
         message: "Success"
      }
   } catch (error) {
      console.error("Error in findAllBuyInRequest ", error);
      return {
         message: error.message
      }
   }
}

const updateBuyInRequestStatus = async (updateBuyInRequest) => {
   try {
      let userId = updateBuyInRequest.userId;
      let clubId = updateBuyInRequest.club_id;
      let tableId = updateBuyInRequest.table_id;
      let clubOwnerId = updateBuyInRequest.club_owner_id;
      let status = updateBuyInRequest.status;
      let res = await pokerService.updateBuyInRequest({ request_status: status }, { club_owner_id: clubOwnerId, club_id: clubId, table_id: tableId, user_id: userId });
      return {
         message: "Success"
      }
   } catch (error) {
      console.error("Error in updateBuyInRequestStatus ", error);
      return {
         message: error.message
      }
   }
}

const bulkUpdateBuyInRequestStatus = async (updateBuyInRequest) => {
   try {
      let clubId = updateBuyInRequest.club_id;
      let tableId = updateBuyInRequest.table_id;
      let clubOwnerId = updateBuyInRequest.club_owner_id;
      let status = updateBuyInRequest.status;
      let res = await pokerService.bulkUpdateBuyInRequests({ request_status: status }, { club_owner_id: clubOwnerId, club_id: clubId, table_id: tableId, request_status: 'Pending' });
      return {
         message: "Success"
      }
   } catch (error) {
      console.error("Error in bulkUpdateBuyInRequestStatus ", error);
      return {
         message: error.message
      }
   }
}

const sendBuyInRequest = async (buyInRequest) => {
   try {
      let userId = buyInRequest.userId;
      let clubId = buyInRequest.club_id;
      let tableId = buyInRequest.table_id;
      let clubOwnerId = buyInRequest.club_owner_id;
      let gameId = buyInRequest.game_id
      let old = await pokerService.getBuyInRequestInfo({ user_id: userId, club_id: clubId, table_id: tableId });
      if (old != null && old && old.request_status == "Rejected") {
         let res = await pokerService.updateBuyInRequest({ request_status: "Pending" }, { club_owner_id: clubOwnerId, club_id: clubId, table_id: tableId, user_id: userId });
         return {
            status: res.request_status,
            message: "Success"
         }
      }
      if (old != null && old) return {
         status: old.request_status,
         message: "Success"
      }
      let res = await pokerService.createNewBuyInRequest({ user_id: userId, club_id: clubId, table_id: tableId, club_owner_id: clubOwnerId, game_id: gameId });
      return {
         status: res.request_status,
         message: "Success"
      }
   } catch (error) {
      console.error("Error in sendBuyInRequest ", error);
      return {
         message: error.message
      }
   }
}
const createPlayerBuyInRequest = async (buyInRequest) => {
   try {
      let userId = buyInRequest.userId;
      let clubId = buyInRequest.club_id;
      let tableId = buyInRequest.table_id;
      let clubOwnerId = buyInRequest.club_owner_id;
      let gameId = buyInRequest.game_id
      let old = await pokerService.getBuyInRequestInfo({ user_id: userId, club_id: clubId, table_id: tableId });
      if (old != null && old) return {
         status: old.request_status,
         message: "Success"
      }
      let res = await pokerService.createNewBuyInRequest({ user_id: userId, club_id: clubId, table_id: tableId, club_owner_id: clubOwnerId, game_id: gameId, request_status: "Na" });
      return {
         status: res.request_status,
         message: "Success"
      }
   } catch (error) {
      console.error("Error in sendBuyInRequest ", error);
      return {
         message: error.message
      }
   }
}

module.exports = {
   getPokerTableRoomData,
   getOrCreateTable,
   savePokerResult,
   getGames,
   getTablesByGameId,
   leaveTable,
   removePlayerFromTable,
   getHandHistoryByTableId,
   getBuyInByTableId,
   getLeaderboardByTableId,
   getGameResultByTableId,
   updatePokerDump,
   getPokerDump,
   dumpSingleTable,
   getUserPokerProfile,
   dumpChatMessages,
   getBlindStructureByGameId,
   getPrizeDataByGameId,
   getPlayersByGameId,
   registerTournament,
   createTableAndJoinTournament,
   deregisterTournament,
   mergeTable,
   deactivateTournament,
   getOrCreateMultiTable,
   getPrivateTable,
   isNewPlayer,
   getOrCreateTableForJoinViewer,
   saveCommisionRecordsForClub,
   savePokerResultForClub,
   UpdateTableRoomDataForClub,
   getOrCreateMultiTableForClub,
   updateStatusAndCloneTable,
   getBuyInRequestStatus,
   findAllBuyInRequest,
   updateBuyInRequestStatus,
   bulkUpdateBuyInRequestStatus,
   sendBuyInRequest,
   createPlayerBuyInRequest,
   saveCommisionRecords,
   isRoomDisabledOrDeleted



}
