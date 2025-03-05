const grpc = require("@grpc/grpc-js");
const USER_PROTO_PATH = __dirname + "/user.proto";
const POKER_PROTO_PATH = __dirname + "/poker.proto";
const POKER_DATA_DUMP_PROTO_PATH = __dirname + "/pokerTable.proto";
const RUMMY_PROTO_PATH = __dirname + "/rummy.proto";
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
   addPrizeMoneyForClub,
   deductJoinFeesForRummy,
   addWinningAmountForRummy,
   addPokerSusPiciousUser,

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
const {
   get_all_rummyGames,
   save_history,
   get_singleGame,
   getUserWalletDataForRummy,
   getRummyTournaments,
   registerPlayersForRummyTrournament,
   getTournamentRegisteredPlayers,
   getRummyTournamentById,
} = require('../controllers/rummyController')

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
let rummyPackageDefination = protoLoader.loadSync(RUMMY_PROTO_PATH, options);

const userProto = grpc.loadPackageDefinition(userPackageDefinition);
const pokerProto = grpc.loadPackageDefinition(pokerPackageDefinition);
const pokerTableDumpProto = grpc.loadPackageDefinition(pokerTableDumpPackageDefinition);
const rummyProto = grpc.loadPackageDefinition(rummyPackageDefination);

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
          let res = await userDetails(call.request);
          callback(null, res.details[0]);  
       },
       userBonusPercentage: async (call, callback) => {
         console.log('userBonusPercentage called ----------------->', call.request)
         let res = await userBonusPercentage(call.request);
         callback(null, res);
      },
       getUserNameByUserId: async (call, callback) => {
          console.log(call.request)
          console.log("getUserNameByUserId called");
          let res = await getUserNameByUserId(call.request);
          callback(null, res);
       },
       deductJoinFeesForRummy: async (call, callback) => {
         console.log(call.request)
         console.log("DeductJoinFeesForRummy  called");
         let res = await deductJoinFeesForRummy(call.request);
         callback(null, res);
      },
      addWinningAmountForRummy: async (call, callback) => {
         console.log(call.request)
         console.log("addWinningAmountForRummy called");
         let res = await addWinningAmountForRummy(call.request);
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
   saveSuspiciousAction: async (call, callback) => {
      console.log(call.request)
      let res = await addPokerSusPiciousUser(call.request);
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

server.addService(rummyProto.GameDataService.service, {
   GetGameData: async (_, callback) => {
      //  console.log(call.request)
      try {
         let res = await get_all_rummyGames({});
         callback(null, res
         )
      } catch (error) {
         console.log('error occured in grpc service ', error);
      }
   },
   SaveGameHistory: async (call, callback) => {
      try {
         let res = await save_history(call.request);
         callback(null, res
         )
      } catch (error) {
         console.log('error occured in grpc service ', error);
      }
   },
   GetSingleGame: async (call, callback) => {
      try {
         let res = await get_singleGame(call.request, callback);
         callback(null, res)
      } catch (error) {
         console.log('error occured in grpc service ', error);
      }
   },
   getUserWalletData: async (call, callback) => {
      let res = await getUserWalletDataForRummy(call.request);
      callback(null, res);
   },
   registerPlayersForRummyTournament: async (call, callback) => {
      try {
         let res = await registerPlayersForRummyTrournament(call.request, callback);
         if(res.message == "tournament already started"){
            const error = new Error('tournament already started');
            error.code = grpc.status.NOT_FOUND;
            return callback(error);
         }
         if(res.message == "user already registered for this tournament"){
            const error = new Error('user already registered for this tournament');
            error.code = grpc.status.NOT_FOUND;
            return callback(error);
         }
         callback(null, res);
      } catch (error) {
         console.log('error occured in send toruanment rummy grpc ', error);
         callback(error);
      }
   },
   getRummyTournamentData : async (_, callback) => {
      try {
         let res = await getRummyTournaments({});
         callback(null, res);
      } catch (error) {
         console.log('error occured in send toruanment rummy grpc ', error);
      }
   },
   getRummyTournamentDataById: async (call, callback) => {
      try {
         let res = await getRummyTournamentById(call.request, callback);
         callback(null, res);
      } catch (error) {
         console.log('error occured in send toruanment rummy grpc ', error);
      }
   },
   getTournamentRegisteredPlayersData: async (call, callback) => {
      try {
         let res = await getTournamentRegisteredPlayers(call.request);
         callback(null, res);
      } catch (error) {
         console.log('error occured in send toruanment rummy grpc ', error);
      }
   },
})

// server.bindAsync(
//     process.env.GRPC_SERVER_URL,
//     grpc.ServerCredentials.createInsecure(),
//     (error, port) => {
//        console.log("Server running at " + process.env.GRPC_SERVER_URL);
//        server.start();
//     }
// );

server.bindAsync(
   process.env.GRPC_SERVER_URL,
   grpc.ServerCredentials.createInsecure(),
   (error, port) => {
       if (error) {
           console.error("Server binding failed:", error.message);
           return;
       }
       console.log("Server running at", process.env.GRPC_SERVER_URL);
       server.start();
   }
);

module.exports = server;
