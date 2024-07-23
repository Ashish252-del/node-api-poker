const {DataTypes} = require('sequelize');

module.exports = model;

function model(sequelize) {
   const attributes = {
      game_history_id: {
         type: DataTypes.INTEGER,
         autoIncrement: true,
         primaryKey: true,
      },
      game_type: {
         type: DataTypes.INTEGER,
         allowNull: true,
      },
      game_category: {
         type: DataTypes.INTEGER,
         allowNull: true,
      },
      user_id: {
         type: DataTypes.INTEGER,
         allowNull: true,
      },
      table_id: {
         type: DataTypes.STRING,
         allowNull: true
      },
      table_name: {
         type: DataTypes.STRING,
         allowNull: true
      },
      community_card: {
         type: DataTypes.STRING,
         allowNull: true
      },
      blind: {
         type: DataTypes.STRING,
         allowNull: true
      },
      win_amount: {
         type: DataTypes.STRING,
         allowNull: true
      },
      bet_amount: {
         type: DataTypes.STRING,
         allowNull: true
      },
      is_win: {
         type: DataTypes.ENUM,
         allowNull: true,
         values: ['0', '1'],
      },
      hands_record: {
         type: DataTypes.TEXT,
         allowNull: true
      },
      other_information: {
         type: DataTypes.TEXT,
         allowNull: true
      },
      hand_history: {
         type: DataTypes.TEXT,
         allowNull: true
      },
      game_history_status: {
         type: DataTypes.BOOLEAN,
         allowNull: true
      },
      createdAt: {
         type: DataTypes.DATE,
         allowNull: false,
         defaultValue: DataTypes.NOW
      },
      updatedAt: {
         type: DataTypes.DATE,
         allowNull: false,
         defaultValue: DataTypes.NOW
      },
   };

   return sequelize.define('game_history', attributes, {timestamps: true});
}
