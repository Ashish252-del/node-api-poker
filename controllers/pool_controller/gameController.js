const poolGameServices = require('../../services/poolGameServices');

const getAllGameList = async (req, res) => {
    try {
        const query = {}
        const gameList = await poolGameServices.getAllGameList(query);
        return res.status(200).json({
            status: true,
            data: gameList
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            msg: error.message
        });
    }
}

const getGameDetailsById = async (req, res) => {
    try {
        const query = {
            where: {
                game_id: req.params.id
            }
        }
        console.log("req.params.id-->",req.params.id);
        const gameDetails = await poolGameServices.getGameDetailsById(query);
        if (!gameDetails) {
            return res.status(404).json({
                status: false,
                msg: 'Game not found'
            });
        }
        return res.status(200).json({
            status: true,
            data: gameDetails
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            msg: error.message
        });
    }
}

const addGame = async (req, res) => {
    try {
        const gameObj = req.body;
        console.log("abhay");
        const gameDetails = await poolGameServices.addGame(gameObj);
        return res.status(200).json({
            status: true,
            data: gameDetails
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            msg: error.message
        });
    }
}

const updateGame = async (req, res) => {
    try {
        // Extract the gameObj from the request body
        const gameObj = req.body.gameObj;

        const query = {
            where: {
                game_id: req.params.id
            }
        };

        const game = await poolGameServices.getGameDetailsById(query);

        if (!game) {
            return res.status(404).json({
                status: false,
                msg: 'Game not found'
            });
        }

        const [affectedRows] = await poolGameServices.updateGame(gameObj, query);

        return res.status(200).json({
            status: true,
            msg: 'Game updated successfully'
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            msg: error.message
        });
    }
};


const deleteGame = async (req, res) => {
    try {
        const query = {
            where: {
                game_id: req.params.id
            }
        }
        const gameDetails = await poolGameServices.deleteGame(query);
        if(!gameDetails){
            return res.status(404).json({
                status: false,
                msg: 'Game not found'
            });
        }
        return res.status(200).json({
            status: true,
            data: gameDetails
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            msg: error.message
        });
    }
}
module.exports = {
    getAllGameList,
    getGameDetailsById,
    addGame,
    updateGame,
    deleteGame
}