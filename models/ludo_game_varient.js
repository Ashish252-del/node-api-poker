"use strict";
module.exports = (sequelize, DataTypes) => {
  const game_varient = sequelize.define(
    "game_varient",
    {
      name: DataTypes.STRING,
      value: DataTypes.STRING,
      player_type:DataTypes.STRING,
      status: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    
    },
    {  tableName: 'ludo_game_varient',  // Explicitly set the table name
       freezeTableName: true }
  );
  return game_varient;
};
