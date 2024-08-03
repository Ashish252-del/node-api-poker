"use strict";
module.exports = (sequelize, DataTypes) => {
  const game_type = sequelize.define(
    "game_type",
    {
      name: DataTypes.STRING,
      status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      icon: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    { tableName: 'ludo_game_type',  // Explicitly set the table name
      freezeTableName: true, timestamps: false }
  );
  return game_type;
};
