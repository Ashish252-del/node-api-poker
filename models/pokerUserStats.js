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
      bet_preflop_count: {
         type: DataTypes.INTEGER,
         allowNull: true,
      },
      preflop_raise_count: {
         type: DataTypes.INTEGER,
         allowNull: true,
      },
      third_bet_preflop_count: {
         type: DataTypes.INTEGER,
         allowNull: true,
      },
      fold_on_3bet_preflop_count: {
         type: DataTypes.INTEGER,
         allowNull: true,
      },
      continuation_bet_count: {
         type: DataTypes.INTEGER,
         allowNull: true,
      },
      fold_on_continuation_bet_count: {
         type: DataTypes.INTEGER,
         allowNull: true,
      },
      raise_at_last_position_on_table_count: {
         type: DataTypes.INTEGER,
         allowNull: true,
      },
      check_raise_flop_count: {
         type: DataTypes.INTEGER,
         allowNull: true,
      },
      showdown_count_after_flop: {
         type: DataTypes.INTEGER,
         allowNull: true,
      },
      won_at_showdown_count: {
         type: DataTypes.INTEGER,
         allowNull: true,
      }
   };
   return sequelize.define('poker_user_stats', attributes, {timestamps: true});
}
