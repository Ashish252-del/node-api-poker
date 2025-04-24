const {successResponse, errorResponse} = require("../helpers");
// const {
//     user_wallet,
//     user,
//     sequelize,
//     avatar
// } = require("../../models");
const moment = require('moment');
const {Op, Sequelize, where} = require("sequelize");
const db = require("../../../helpers/db");
const { sequelize } = require("../../../models");
const userService = require("../../../services/userService");

// wallet realted changes are pending 
const addBot= async function (req,res){
    try {

        const {name}=req.body;

        let url=(req.file) ? req.file.location : '';
        console.log("name",name);
        console.log("url",url);
        if(!name){
            return res.status(404).json({ message: 'name  are required' });
        }
      
        // const newAvatar = await avatar.create({
        //     url:req.file.location,
        //  });
            const userObject={
              //  id:Math.floor(Math.random() * 90000) + 10000,
            }

            userObject.username=name;
          //  userObject.name=name;
            userObject.avatarId=1;
            userObject.profile_image=url;
            userObject.mobile=Math.floor(Math.random() * 90000) + 10000,
            userObject.kyc='NO'
            userObject.is_ludo_bot=1;
            console.log(userObject);
          let resp=  await db.users.create(userObject)
          let walletData = {
            user_id: resp.user_id,
            real_amount: 100000000
         }
         let savewalet = await userService.createUserWallet(walletData);
          return successResponse(req, res, {resp:resp});
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}
const getBot= async function (req,res)
{
    try {
        let 
        where= {
            is_ludo_bot: 1,
            [Op.or]: [
              
            ]
          }
          if (req.query.userId)
            {
                where[Op.or].push({user_id:req.query.userId})
            }
            if (req.query.name)
                {
                    where[Op.or].push({name:req.query.name})
                }
                if (req.query.username)
                    {
                        where[Op.or].push({username:req.query.username})
                    }
                    if (  where[Op.or].length==0)
                        {
                            delete where[Op.or]
                        }
        let userData= await db.users.findOne({
           include: [db.user_wallet],
            where

        })
    //   if (userData){
    //   const userBalanceData= await user_wallet.findOne({where:{userId:userData.id}})
    // }

        return successResponse(req, res, {resp:userData});
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}
const getBots = async function (req, res) {
    try {
        let respData = await db.users.findAll({
            include: [
                { model: db.user_wallet, as: 'user_wallet_user_id' }, // Use the correct alias
                { model: db.avatar, attributes: ['url'] }
            ],
            where: { is_ludo_bot: true }
        });
     

        return successResponse(req, res, { resp: respData });
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};

const updateBot = async function (req, res) {
    let responsedata={}
    try {
        const { userId, winningBalance, mainBalance, bonusBalance, name } = req.body;

        let walletUpdateResponse = await db.user_wallet.update(
            {
                win_amount:winningBalance,
                real_amount:mainBalance,
                bonus_amount:bonusBalance
            },
            {
                where: {
                    user_id: userId,
                },
            }
        );

        let userUpdateResponse = await db.users.update(
            {
                username:name
            },
            {
                where: {
                    user_id: userId,
                },
            }
        );

       responsedata.msg="bot updated";

        return successResponse(req, res,responsedata );
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}

// wallet flow 
const deleteBot= async function (req,res)
{
    try {
        await db.user_wallet.destroy({where:{user_id:req.query.userId}})
        let respData= await db.users.destroy({where:{user_id:req.query.userId}})
        return successResponse(req, res, {resp:respData});
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
}
const getBotById = async function (req, res) {
    let responsedata = {};
    try {
        const { id } = req.query;

        // Fetch user name
        const userData = await db.users.findOne({ 
            where: { user_id: id }
        });

        if (!userData) {
            return res.status(404).json({ message: 'User not found' });
        }

        responsedata.name = userData.username;

       // Fetch user wallet balances
        const walletData = await db.user_wallet.findOne({ 
            where: { user_id: id }
        });
        console.log("walletData-->",walletData);

        if (!walletData) {
            return res.status(404).json({ message: 'Bot wallet Data not found' });
        }

        responsedata.data = {
            winningBalance: walletData.win_amount,
            mainBalance: walletData.real_amount,
            bonusBalance: walletData.bonus_amount
        };

        return successResponse(req, res, { responsedata });
    } catch (error) {
        return errorResponse(req, res, error.message);
    }
};


module.exports={
    addBot,
    getBot,
    getBots,
    updateBot,
    deleteBot,
    getBotById
}