const {DataTypes} = require('sequelize');

module.exports = model;

function model(sequelize) {
   const attributes = {
      id: {
         type: DataTypes.INTEGER,
         primaryKey: true,
         autoIncrement: true,
      },
      user_id: {
         type: DataTypes.INTEGER,
         allowNull: true,
      },
      hands_played: {
         type: DataTypes.INTEGER,
         allowNull: true,
      },
      flops_seen: {
         type: DataTypes.INTEGER,
         allowNull: true,
      },
      hands_won: {
         type: DataTypes.INTEGER,
         allowNull: true,
      },
      showdown_count: {
         type: DataTypes.INTEGER,
         allowNull: true,
      },
      sb_count: {
         type: DataTypes.INTEGER,
         allowNull: true,
      },
      bb_count: {
         type: DataTypes.INTEGER,
         allowNull: true,
      },
   };
   return sequelize.define('poker_session_stats', attributes, {timestamps: true});
}
