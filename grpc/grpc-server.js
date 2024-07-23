const grpc = require("@grpc/grpc-js");
const USER_PROTO_PATH = __dirname + "/user.proto";
const POKER_PROTO_PATH = __dirname + "/poker.proto";
const POKER_DATA_DUMP_PROTO_PATH = __dirname + "/pokerTable.proto";
require("dotenv").config();
const process = require('process');
let protoLoader = require("@grpc/proto-loader");
const {
   lockBalanceOfUser,
   unlockBalanceOfUser,
   userDetails,
   updateLockBalanceOfUserForTable,
   topUpBalanceOfUser,
   deductJoinFees,
   addPrizeMoney,
   getUserNameByUserId,
   getMinMaxBuyInForTable,

   updateLockBalanceOfUserForTableForClub,
   deductJoinFeesForClub,
   lockBalanceOfUserForClub,
   getMinMaxBuyInForTableForClub,
   topUpBalanceOfUserForClub,
   addPrizeMoneyForClub
} = require("../controllers/userController");
const {
   getPokerTableRoomData,
   getOrCreateTable,
   savePokerResult,
   leaveTable, removePlayerFromTable, getPokerDump, updatePokerDump, dumpSingleTable, dumpChatMessages,
   createTableAndJoinTournament, mergeTable , getOrCreateMultiTable,isNewPlayer, deactivateTournament,getOrCreateTableForJoinViewer,savePokerResultForClub,
   UpdateTableRoomDataForClub, updateStatusAndCloneTable
} = require("../controllers/pokerController");

const {
   getClubDetails,
   getAllCLubsDetails
} = require("../controllers/clubController");
const options = {
   keepCase: true,
   longs: String,
   enums: String,
   defaults: true,
   oneofs: true,
};

let userPackageDefinition = protoLoader.loadSync(USER_PROTO_PATH, options);
let pokerPackageDefinition = protoLoader.loadSync(POKER_PROTO_PATH, options);
let pokerTableDumpPackageDefinition = protoLoader.loadSync(POKER_DATA_DUMP_PROTO_PATH, options);

const userProto = grpc.loadPackageDefinition(userPackageDefinition);
const pokerProto = grpc.loadPackageDefinition(pokerPackageDefinition);
const pokerTableDumpProto = grpc.loadPackageDefinition(pokerTableDumpPackageDefinition);
const server = new grpc.Server();

server.addService(userProto.BalanceUpdateService.service, {
   UpdateBalance: (call, callback) => {
      console.log(call.request)
      console.log("UpdateBalance called");
      callback(null, {success: true});
   }
});

server.addService(userProto.LockBalanceService.service, {
   LockBalance: async (call, callback) => {
      console.log(call.request)
      console.log("LockBalance called");
      let res = await lockBalanceOfUser(call.request);
      callback(null, res);
   },
   UnlockBalance: async (call, callback) => {
      console.log(call.request)
      console.log("UnlockBalance called");
      let res = await unlockBalanceOfUser(call.request);
      callback(null, res);
   },
   UpdateLockBalance: async (call, callback) => {
      console.log(call.request)
      console.log("UpdateLockBalance called");
      let res = await updateLockBalanceOfUserForTable(call.request);
      callback(null, res);
   },
   TopUpBalance: async (call, callback) => {
      console.log(call.request)
      console.log("TopUpBalance called");
      let res = await topUpBalanceOfUser(call.request);
      callback(null, res);
   },
   DeductJoinFees: async (call, callback) => {
      console.log(call.request)
      console.log("DeductJoinFees called");
      let res = await deductJoinFees(call.request);
      callback(null, res);
   },
   AddPrizeMoney: async (call, callback) => {
      console.log(call.request)
      console.log("AddPrizeMoney called");
      let res = await addPrizeMoney(call.request);
      callback(null, res);
   },
   GetMaxBuyInMinBuyIn: async (call, callback) =>{
      console.log(call.request);
      let res = await getMinMaxBuyInForTable(call.request);
      callback(null, res);
   },

   GetMaxBuyInMinBuyInForClub: async (call, callback) =>{
      console.log(call.request);
      let res = await getMinMaxBuyInForTableForClub(call.request);
      callback(null, res);
   },
   DeductJoinFeesForClub: async (call, callback) => {
      console.log(call.request)
      console.log("DeductJoinFeesForClub called");
      let res = await deductJoinFeesForClub(call.request);
      callback(null, res);
   },
   LockBalanceForClub: async (call, callback) => {
      console.log(call.request)
      console.log("DeductJoinFeesForClub called");
      let res = await lockBalanceOfUserForClub(call.request);
      callback(null, res);
   },
   UpdateLockBalanceForClub: async (call, callback) => {
      console.log("UpdateLockBalance called---",call.request)
      console.log("UpdateLockBalance called");
      let res = await updateLockBalanceOfUserForTableForClub(call.request);
      callback(null, res);
   },
   TopUpBalanceForClub: async (call, callback) => {
      console.log(call.request)
      console.log("TopUpBalance called");
      let res = await topUpBalanceOfUserForClub(call.request);
      callback(null, res);
   },
   AddPrizeMoneyForClub: async (call, callback) => {
      console.log(call.request)
      console.log("AddPrizeMoney called");
      let res = await addPrizeMoneyForClub(call.request);
      callback(null, res);
   },
});

server.addService(pokerTableDumpProto.PokerDumpService.service, {
   UpdatePokerDump: async (call, callback) => {
      console.log(call.request)
      console.log("UpdatePokerDump called");
      let res = await updatePokerDump(call.request);
      callback(null, res);
   },
   GetPokerDump: async (call, callback) => {
      console.log(call.request)
      console.log("GetPokerDump called");
      let res = await getPokerDump();
      callback(null, res);
   },
   DumpSingleTable: async (call, callback) => {
      console.log(call.request)
      console.log("DumpSingleTable called");
      let res = await dumpSingleTable(call.request);
      callback(null, res);
   }
});

server.addService(userProto.getUserDetailsService.service, {
       GetUserDetails: async (call, callback) => {
          console.log(call.request)
          console.log('GetUserDetails called')
          let res = await userDetails(call.request);
          callback(null, res.details[0]);
       },

       getUserNameByUserId: async (call, callback) => {
          console.log(call.request)
          console.log("getUserNameByUserId called");
          let res = await getUserNameByUserId(call.request);
          callback(null, res);
       }
    }
)
server.addService(pokerProto.TableRoomDataService.service, {
   GetTableRoomData: async (call, callback) => {
      console.log(call.request)
      let res = await getPokerTableRoomData(call.request);
      callback(null, res);
   },

   UpdateTableRoomData: async (call, callback) => {
      console.log(call.request)
      let res = await UpdateTableRoomDataForClub(call.request);
      callback(null, res);
   }
});



server.addService(pokerProto.TableDataService.service, {
   GetOrCreateTable: async (call, callback) => {
      console.log(call.request)
      let res = await getOrCreateTable(call.request);
      callback(null, res);
   },
   UpdateStatusAndCloneTable: async (call, callback) => {
      console.log(call.request)
      let res = await updateStatusAndCloneTable(call.request);
      callback(null, res);
   },
   CreateTableAndJoinTournament: async (call, callback) => {
      console.log(call.request);
      let res = await createTableAndJoinTournament(call.request);
      callback(null, res);
   },
   MergeTable: async (call, callback) => {
      console.log(call.request);
      let res = await mergeTable(call.request);
      callback(null, res);
   },
   RemovePlayerFromTable: async (call, callback) => {
      console.log("RemovePlayerFromTable called");
      console.log(call.request)
      let res = await removePlayerFromTable(call.request);
      callback(null, res);
   },
   SavePokerResult: async (call, callback) => {
      console.log(call.request)
      let res = await savePokerResult(call.request);
      callback(null, res);
   },
   LeaveTable: async (call, callback) => {
      console.log(call.request)
      let res = await leaveTable(call.request);
      callback(null, res);
   },
   IsNewPlayer: async (call, callback) => {
      console.log(call.request)
      let res = await isNewPlayer(call.request);
      let response = { isNewPlayer: res }; // Assuming isNewPlayer is a boolean field in GenericResponse

   console.log("Sending response:", response);
   callback(null, response);
   },
   



   DumpChatMessages: async (call, callback) => {
      console.log(call.request)
      let res = await dumpChatMessages(call.request);
      callback(null, res);
   },
   DeactivateTournament: async (call, callback) => {
      console.log(call.request)
      let res = await deactivateTournament(call.request);
      callback(null, res);
   },
   GetOrCreateMultiTable: async(call , callback ) =>{
   console.log(call.request);
    let res = await getOrCreateMultiTable(call.request);
    console.log("sending res for GetOrCreateMultiTable ", res);
    callback(null,res);
   },
   GetOrCreateTableForJoinViewer: async (call, callback) => {
      console.log(call.request)
      let res = await getOrCreateTableForJoinViewer(call.request);
      callback(null, res);
   },
   savePokerResultForClub: async (call, callback) => {
      console.log(call.request)
      let res = await savePokerResultForClub(call.request);
      callback(null, res);
   },
});

server.addService(pokerProto.TableClubRoomDataService.service, {
   GetClubDetails: async (call, callback) => {
      console.log(call.request)
      let res = await getClubDetails(call.request);
      callback(null, res);
   },
   GetAllClubs: async (_, callback) =>{
    let res = await getAllCLubsDetails({})
    console.log("sending allclubs res", res);
    callback(null,res)
   }
});

server.bindAsync(
    process.env.GRPC_SERVER_URL,
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
       console.log("Server running at " + process.env.GRPC_SERVER_URL);
       server.start();
    }
);

module.exports = server;
