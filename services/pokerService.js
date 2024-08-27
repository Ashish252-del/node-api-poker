const db = require("../helpers/db");

//Get Game table details by id
const getGameModalDataByQuery = (query) => {
   return db.games.findOne({where: query, raw: true});
}

//get all the games
const getGames = () => {
   return db.games.findAll();
}

const getGamesByQuery = (query) => {
   return db.games.findAll({where: query, raw: true});
}

const updateGameByQuery = (updateData, query) => {
   return db.games.update(updateData, {where: query, raw: true});
}

//get game_type data by query
const getGameTypeModalDataByQuery = (query) => {
   return db.game_type.findOne({where: query, raw: true});
}

const getAllGameTypeModalDataByQuery = (query) => {
   return db.game_type.findAll({where: query, raw: true});
}

const getGameTableModalDataByQuery = (query) => {
   return db.game_table.findAll({where: query, raw: true});
}

const getOneGameTableModalDataByQuery = (query) => {
   return db.game_table.findOne({where: query, raw: true});
}

const getTableRoundByQuery = (query) => {
   return db.table_round.findOne({where: query, raw: true});
}

const getTableRoundByQueryWithOrderAndLimit = (query, order, limit, offset) => {
   return db.table_round.findAll({
      where: query,
      order: order,
      limit: limit,
      offset: offset,
      raw: true
   });
}

const countTableRoundByQuery = (query) => {
   return db.table_round.count({where: query});
}

const updateGameTableModalDataByQuery = (updateData, query) => {
   return db.game_table.update(updateData, {where: query, raw: true});
}

const updateTableRoundModalDataByQuery = (updateData, query) => {
   return db.table_round.update(updateData, {where: query, raw: true});
}

const createGameTableModalData = (createData) => {
   return db.game_table.create(createData);
}

const createTableRoundModalData = (createData) => {
   return db.table_round.create(createData);
}

const getGameCategoryByQuery = (query) => {
   return db.game_category.findOne({where: query, raw: true});
}

const updatePokerTableDumpByQuery = (updateData, query) => {
   return db.poker_table_dump.update(updateData, {where: query, raw: true});
}

const createPokerDumpTableData = (createData) => {
   return db.poker_table_dump.create(createData);
}

const getPokerDumpTableDataByQuery = (query) => {
   return db.poker_table_dump.findOne({where: query, raw: true});
}

const getAllPokerDumpTableDataByQuery = (query) => {
   return db.poker_table_dump.findAll({where: query, raw: true});
}

const getAllPokerSessionStatsDataByQuery = (query) => {
   return db.poker_session_stats.findAll({where: query, raw: true});
}

const getPokerSessionStatsDataByQuery = (query) => {
   return db.poker_session_stats.findOne({where: query, raw: true});
}

const createPokerSessionStatsData = (createData) => {
   return db.poker_session_stats.create(createData);
}

const updatePokerSessionStatsDataByQuery = (updateData, query) => {
   return db.poker_session_stats.update(updateData, {where: query, raw: true});
}

const getAllPokerUserStatsDataByQuery = (query) => {
   return db.poker_user_stats.findAll({where: query, raw: true});
}

const getPokerUserStatsDataByQuery = (query) => {
   return db.poker_user_stats.findOne({where: query, raw: true});
}

const createPokerUserStatsData = (createData) => {
   return db.poker_user_stats.create(createData);
}

const updatePokerUserStatsDataByQuery = (updateData, query) => {
   return db.poker_user_stats.update(updateData, {where: query, raw: true});
}

const getOneBlindStructureModalDataByQuery = (query) => {
   return db.blind_structures.findOne({where: query, raw: true});
}

const getBlindStructureModalDataByQuery = (query) => {
   return db.blind_structures.findAll({where: query, raw: true});
}

const createBlindStructureModalData = (createData) => {
   return db.blind_structures.create(createData);
}

const updateBlindStructureModalDataByQuery = (updateData, query) => {
   return db.blind_structures.update(updateData, {where: query, raw: true});
}

const getOnePriceStructureModalDataByQuery = (query) => {
   return db.price_structures.findOne({where: query, raw: true});
}

const getPriceStructureModalDataByQuery = (query) => {
   return db.price_structures.findAll({where: query, raw: true});
}

const createPriceStructureModalData = (createData) => {
   return db.price_structures.create(createData);
}

const updatePriceStructureModalDataByQuery = (updateData, query) => {
   return db.price_structures.update(updateData, {where: query, raw: true});
}

const bulkUpdate = (data,query) => {
   return db.games.bulkCreate(data, query);
}
const getAllBuyInRequest = (query) =>{
   return db.buy_in_records.findAll({where:query, 
      include:[
         {
            model:db.users,
            attributes:["username"]
         }
      ],
      raw:true})
}
const getBuyInRequestInfo = (query) =>{
   return db.buy_in_records.findOne({where:query, raw:true});
}
const createNewBuyInRequest = (createData)=>{
   return db.buy_in_records.create(createData);
}
const updateBuyInRequest = (updateData, query) =>{
   return db.buy_in_records.update(updateData, {where: query, raw: true})
}
const bulkUpdateBuyInRequests = (updateData, query) =>{
   return db.buy_in_records.update(updateData, {where: query, raw: true})
}

module.exports = {
   getGameModalDataByQuery,
   getGameTableModalDataByQuery,
   updateGameByQuery,
   updateGameTableModalDataByQuery,
   createGameTableModalData,
   getGames,
   getGameTypeModalDataByQuery,
   getAllGameTypeModalDataByQuery,
   getGamesByQuery,
   getGameCategoryByQuery,
   createTableRoundModalData,
   getTableRoundByQuery,
   updateTableRoundModalDataByQuery,
   getOneGameTableModalDataByQuery,
   getTableRoundByQueryWithOrderAndLimit,
   countTableRoundByQuery,
   updatePokerTableDumpByQuery,
   createPokerDumpTableData,
   getPokerDumpTableDataByQuery,
   getAllPokerDumpTableDataByQuery,
   getAllPokerSessionStatsDataByQuery,
   getPokerSessionStatsDataByQuery,
   createPokerSessionStatsData,
   updatePokerSessionStatsDataByQuery,
   getAllPokerUserStatsDataByQuery,
   getPokerUserStatsDataByQuery,
   createPokerUserStatsData,
   updatePokerUserStatsDataByQuery,
   getOneBlindStructureModalDataByQuery,
   getBlindStructureModalDataByQuery,
   createBlindStructureModalData,
   updateBlindStructureModalDataByQuery,
   getOnePriceStructureModalDataByQuery,
   getPriceStructureModalDataByQuery,
   createPriceStructureModalData,
   updatePriceStructureModalDataByQuery,
   bulkUpdate,
   getBuyInRequestInfo,
   createNewBuyInRequest,
   getAllBuyInRequest,
   updateBuyInRequest,
   bulkUpdateBuyInRequests

}
