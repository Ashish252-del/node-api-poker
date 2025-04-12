const rummyService = require('../services/rummyService');
const responseHelper = require("../helpers/customResponse");
const grpc = require("@grpc/grpc-js");

const get_all_rummyGames = async (req,res)=>{
    try {

        let game = await rummyService.get_all_Rimmy_Games ({});
        //   console.log('comming data is ', game)

        let games = [];
        game.map((e)=>{
            let p = JSON.parse(e. game_json_data)
            if (Object.keys(p).length!==0)
            { let a = {
                gameId: e.game_id,
                rummy_code: p.rummy_code,
                Max_Player: p.maximum_player,
                Min_Chips: p.entry_fee,
                Comission: p.commission,
                Name: p.name
            };
                if(p.rummy_code == 1 || p.rummy_code ==3) a.Points = p.point_value;
                if(p.pool_type!=undefined) a.break_Score=p.pool_type;
                if(p.deal_type!=undefined) a.break_Round=p.deal_type;
                if(p.rummy_code == 1) a.is_practice = p.is_practice;
                games.push(a);}
        })
      console.log('response is ', games);
        //  res.json({message:'Success', data:response})
        return {games};
    } catch (error) {
        console.log("Error is in rummyController ", error);
        return {
            status: false,
            message: error.message
        }
    }
}

const rummyGames = async (req,res)=>{
    try {

        let game = await rummyService.get_all_Rimmy_Games ({});
        //  console.log('comming data is ', games)
        let response = [];

        game.map((e)=>{
            let p = JSON.parse(e. game_json_data)
            p.game_id = e.game_id;
            response.push(p)
        })
        // console.log('response is ', response);
        res.json({message:'Success', data:response})

    } catch (error) {
        console.log("Error", error);
        return {
            status: false,
            message: error.message
        }
    }
}

// to get all player types
const playerTypes = async (req,res)=>{
    try {
        let all_players =   await rummyService.json_data ({});
        let players = [];
        all_players.map((e)=>{
            let p = JSON.parse(e.game_json_data)
            if(p.maximum_player) players.push(p.maximum_player)

        })
        return responseHelper.success(res, {data:players});
    } catch (error) {
        console.log('errro in playerTypes controller', error);
    }

}

// To get entree Fee and game_name
const entree_fee_Game_name = async (req,res)=>{
    try {
        let playerType = req.params.playerType;
        let JSON_DATA = await rummyService.json_data({});
        let info = [];
        JSON_DATA.map((e)=>{
            let temp = {};
            let p = JSON.parse(e.game_json_data)
            if(p.maximum_player && p.maximum_player===playerType) {
                temp.entry_fee = p.entry_fee;
                temp.Name = p.name;
                temp.playerType = playerType
                info.push(temp);
            }
        })
        return responseHelper.success(res, {data:info});
    } catch (error) {
        console.log('errro in entree_fee_Game_name controller', error);
    }
}
// for getting gameId
const get_gameId = async (req,res)=>{
    try {
        let Name = req.params.Name;
        let JSON_DATA = await rummyService.get_all_Rimmy_Games({});
        let gameId;
        JSON_DATA.map((e)=>{
            let p = JSON.parse(e.game_json_data)
            if(p.name && p.name===Name) {
                gameId=e.game_id
            }
        })
        return responseHelper.success(res, {data:{game_id:gameId}});
    } catch (error) {
        console.log('errro in gameId controller', error);
    }
}

// for saving gamehistory
const save_history = async (req,res)=>{
    try{
        let history = JSON.parse((req.history));
        let table_id = history[history.length-1].gameId;
        let game_type = await rummyService.get_game_type({type:history[history.length-1].type})
        let arr = [];
        for(let i =0; i<history.length-2; i++) {
            let data = {}
            data.game_type = game_type.game_type_id;
            data.game_category = 3;
            data.user_id = history[i].playerId;
            data.table_id = table_id;
            data.table_name = history[history.length - 1].table_name; 
            data.win_amount = history[i].chips;
            data.is_win = (history[i].status==="WINNER")?'1':'0';
            data.hands_record =JSON.stringify(history[i].cards);
            arr.push(data);
        }
        await rummyService.save_rummy_history(arr);
        return {Success:'History_Saved'};
    }
    catch(error){
        console.log('error in savegameHistory ', error);
    }
}

const get_singleGame = async (req, res)=>{
    let game_id = req.gameId
    let query = {attributes: ['game_json_data','game_id'], where:{game_id }, raw:true}
    let game = await rummyService.get_gameBygameId(query);
    console.log('single game is ', game);
    let p = JSON.parse(game.game_json_data)
    let a = {
        gameId: parseInt(game.game_id),
          rummy_code: parseInt(p.rummy_code),
        Max_Player: parseInt(p.maximum_player),
          Min_Chips: parseFloat(p.entry_fee+""),
         Comission: parseFloat(p.commission+""),
          Name: p.name
    };
    
    // if(p.rummy_code == 1 || p.rummy_code ==3) a.Points = p.point_value;
    //             if(p.pool_type!=undefined) a.break_Score=p.pool_type;
    //             if(p.deal_type!=undefined) a.break_Round=p.deal_type;
    //             if(p.rummy_code == 1) a.is_practice = p.is_practice;
    if(p.rummy_code == 1) {
        let point_number= parseFloat(p.point_value+"");
        a.Points =point_number;
        if(p.is_practice) a.is_practice = parseInt(p.is_practice); 
    }
    if(p.rummy_code == 2) {
        a.break_Score = parseInt(p.pool_type);
    }
    if(p.rummy_code == 3) {
       // let point_number= parseFloat(p.point_value+"")
        a.break_Round = parseInt(p.deal_type);
       //  a.Points =point_number;

  
    }
    return a;
}

const getUserWalletDataForRummy = async (userWalletRequest) => {
    try {
        let userWallet = await rummyService.getUserWalletById({
            user_id: userWalletRequest.id
        });
        console.log(userWallet);
        if(!userWallet){
            throw new Error("wallet not found");
        }

        return {
            data: (+userWallet.real_amount) + (+userWallet.win_amount),
            status: true,
            message: "wallet data fetched successfully"
        }
    } catch (error) {
        console.log("Error in get wallet ", error);
        return {
            status: false,
            message: error.message
        }
    }
}

const getRummyTournaments = async(req, res) =>{
  try {
    let arr = []
    let query = {attributes: ['tournament_id', 'tournament_name', 'tournament_json_data'],where:{status:0, game_category:3 }, raw:true}
     let tourneys = await rummyService.getTourny(query);
     for(let i =0; i<tourneys.length; i++){
        let data = {id: tourneys[i].tournament_id, tournament_name: tourneys[i].tournament_name, tournament_json_data: tourneys[i].tournament_json_data};
        arr.push(data);
     }

    return {tourneys:arr};
  } catch (error) {
    console.log("error in getRummyTournaments rummyControllers ", error)
  }
}

const getRummyTournamentById = async(req, res) =>{  
    try{
        let arr = []
        let query = {attributes: ['tournament_id', 'tournament_name', 'tournament_json_data'],where:{tournament_id:req.tournament_id, status:0, game_category:4 }, raw:true}
        let tourney = await rummyService.getTourny(query);
        if(tourney.length==0){
            return;
            //throw new Error("tournament not found");
        }
        console.log(tourney);
        let data = {id: tourney[0].tournament_id, tournament_name: tourney[0].tournament_name, tournament_json_data: tourney[0].tournament_json_data};
           
        return data;
    } catch(err){ 
        console.log("error in getRummyTournamentById rummyControllers ", err)
        return {
            status: false,
            message: err.message
        }
    }
}

const registerPlayersForRummyTrournament = async(req, callback) =>{
    try{
        let tournamentId = req.tournament_id;
        const tournament = await getRummyTournamentById(req);
        let jsonData = JSON.parse(tournament.tournament_json_data);
        let tournamentStartTime = jsonData.game_date + " " + jsonData.game_time;
        if(new Date(tournamentStartTime) < new Date()){
          return new Error("tournament already started");
        }
        let userId = req.user_id; 
        let checkQuery = { where: {tourney_id: tournamentId, user_id: userId}}
        let check = await rummyService.getRegisteredPlayersForTournament(checkQuery);
        if(check.length > 0){
            return new Error("user already registered for this tournament");
        }
        let query = {tourney_id: tournamentId, user_id: userId};
        let registered = await rummyService.registerPlayerForTournament(query);
        let obj = {
            tourney_user_id: registered.tourney_user_id,
            user_id: registered.user_id,
            tourney_id: registered.tourney_id,
        }
        return obj;
    } catch(err){ 
        console.log("error in registerPlayersForRummyTrournament rummyControllers ", err)
        return {
            status: false,
            message: err.message
        }
    }
} 

 const getTournamentRegisteredPlayers = async(req, res) =>{
    try{
        let data = [];
        let tournamentId = req.tournament_id;
        let query = {attributes:['user_id'], where:{tourney_id:tournamentId}};
        let registered = await rummyService.getRegisteredPlayersForTournament(query);
        for (let i = 0; i < registered.length; i++) {
            let obj = {
                user_id: registered[i].user_id,
            }
            data.push(obj);
        }


        return {palyers: data};
    } catch(err){ 
        console.log("error in getTournamentRegisteredPlayers rummyControllers ", error)
        return {
            status: false,
            message: err.message
        }
    }   
}

const updateTournamentRegisteredPlayers = async(req, res) =>{
    try{
        let tournamentId = req.tournamentId;
        let userId = req.userId;
        let query = {tournament_id:tournamentId, user_id:userId};
        let registered = await rummyService.registerPlayerForTournament(query, {user_id: userId});
        return {registered};
    } catch(err){ 
        console.log("error in updateTournamentRegisteredPlayers rummyControllers ", error)
        return {
            status: false,
            message: err.message
        }
    }   
}
module.exports = {updateTournamentRegisteredPlayers, getRummyTournamentById, getTournamentRegisteredPlayers, registerPlayersForRummyTrournament, get_all_rummyGames,rummyGames,playerTypes,entree_fee_Game_name,get_gameId,save_history,get_singleGame, getUserWalletDataForRummy,getRummyTournaments}
