const {DataTypes} = require('sequelize');

module.exports = model;

function model(sequelize) {
   const attributes = {
     locked_balance_history_id: {
       type: DataTypes.INTEGER,
       autoIncrement: true,
       primaryKey: true,
     },
     user_id: {
       type: DataTypes.INTEGER,
       allowNull: true,
     },
     table_id: {
       type: DataTypes.INTEGER,
       allowNull: true,
     },
     locked_amount: {
       type: DataTypes.DECIMAL,
       allowNull: true,
     },
     buy_in_amount: {
       type: DataTypes.DECIMAL,
       allowNull: true,
     },
     round_count: {
       type: DataTypes.INTEGER,
       allowNull: true,
     }
     ,club_id: {
       type: DataTypes.INTEGER,
       allowNull: true,
     },
     locked_club_amount: {
       type: DataTypes.DECIMAL,
       allowNull: true,
     },
     buy_in_club_amount: {
       type: DataTypes.DECIMAL,
       allowNull: true,
     },
     status: {
       type: DataTypes.ENUM,
       allowNull: true,
       values: ["settled", "unsettled"],
     },
     is_balance_unlocked: {
       type: DataTypes.BOOLEAN,
       allowNull: false,
       defaultValue: false,
     },
     game_id: {
       type: DataTypes.INTEGER,
       allowNull: true,
     },
     winnings:{
      type: DataTypes.DECIMAL,
      allowNull: true,
     },
     createdAt: {
       type: DataTypes.DATE,
       allowNull: false,
       defaultValue: DataTypes.NOW,
     },
     updatedAt: {
       type: DataTypes.DATE,
       allowNull: false,
       defaultValue: DataTypes.NOW,
     },
   };

   return sequelize.define('locked_balance_history', attributes, {timestamps: true});
}
