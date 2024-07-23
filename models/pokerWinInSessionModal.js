const {DataTypes} = require('sequelize');

module.exports = model;

function model(sequelize) {
   const attributes = {
      id: {
         type: DataTypes.INTEGER,
         autoIncrement: true,
         primaryKey: true,
      },
      game_table_id: {
         type: DataTypes.INTEGER,
         allowNull: true
      },
      game_type_id: {
         type: DataTypes.INTEGER,
         allowNull: true
      },
      user_id: {
         type: DataTypes.INTEGER,
         allowNull: true
      },
      winning: {
         type: DataTypes.DECIMAL,
         allowNull: true
      },
      rounds_played: {
         type: DataTypes.INTEGER,
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

   return sequelize.define('pokerSessionWin', attributes, {timestamps: true});
}
